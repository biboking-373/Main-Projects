const db = require("../config/database");
const { initiateSTKPush, queryStkPushStatus, processCallback } = require("../config/mpesa");
const { logActivityHelper } = require("../middleware/activityMiddleware");

// DEV MODE: Set to true to bypass M-Pesa API and simulate payments
const DEV_MODE = process.env.MPESA_DEV_MODE === 'true';

/**
 * Initiate M-Pesa Payment for Booking
 */
exports.initiatePayment = async (req, res) => {
    const { bookingId, phoneNumber } = req.body;

    if (!bookingId || !phoneNumber) {
        return res.status(400).json({ message: "Booking ID and phone number are required" });
    }

    try {
        // Get booking details
        const [bookings] = await db.execute(
            `SELECT b.*, 
                    r.room_number, 
                    r.room_type, 
                    r.price_per_night,
                    CONCAT(r.room_type, ' - Room ', r.room_number) as room_name
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             WHERE b.id = ? AND b.user_id = ?`,
            [bookingId, req.session.user.id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const booking = bookings[0];

        // Check if booking is confirmed or pending
        if (booking.status !== "confirmed" && booking.status !== "pending") {
            return res.status(400).json({ 
                message: `Cannot process payment for ${booking.status} booking. Booking must be confirmed or pending.` 
            });
        }

        // Calculate amount
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const amount = nights * booking.price_per_night;

        let stkResponse;
        
        // DEV MODE: Simulate M-Pesa response
        if (DEV_MODE) {
            console.log('🧪 DEV MODE: Simulating M-Pesa payment...');
            stkResponse = {
                MerchantRequestID: `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                CheckoutRequestID: `ws_CO_${Date.now()}`,
                ResponseCode: "0",
                ResponseDescription: "Success. Request accepted for processing",
                CustomerMessage: "Success. Request accepted for processing"
            };
        } else {
            // PRODUCTION MODE: Real M-Pesa API call
            stkResponse = await initiateSTKPush(
                phoneNumber,
                amount,
                `Booking-${bookingId}`,
                `Payment for ${booking.room_name}`
            );
        }

        // Check if payment record exists
        const [existingPayment] = await db.execute(
            "SELECT id FROM payments WHERE booking_id = ?",
            [bookingId]
        );

        if (existingPayment.length > 0) {
            // Update existing payment with M-Pesa details
            await db.execute(
                `UPDATE payments 
                 SET mpesa_checkout_request_id = ?,
                     mpesa_phone_number = ?,
                     payment_method = 'mpesa',
                     payment_status = 'pending',
                     amount = ?
                 WHERE id = ?`,
                [stkResponse.CheckoutRequestID, phoneNumber, amount, existingPayment[0].id]
            );

            // DEV MODE: Auto-complete payment after 5 seconds
            if (DEV_MODE) {
                setTimeout(async () => {
                    await db.execute(
                        `UPDATE payments 
                         SET payment_status = 'completed',
                             mpesa_receipt_number = 'DEV${Date.now()}',
                             paid_at = NOW()
                         WHERE id = ?`,
                        [existingPayment[0].id]
                    );
                    await db.execute(
                        "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
                        [bookingId]
                    );
                    console.log('✅ DEV MODE: Payment auto-completed');
                }, 5000);
            }

            res.json({
                message: DEV_MODE 
                    ? "DEV MODE: Payment simulated. Will complete in 5 seconds." 
                    : "Payment initiated. Please check your phone to complete the payment.",
                checkoutRequestID: stkResponse.CheckoutRequestID,
                paymentId: existingPayment[0].id,
                amount: amount,
                currency: "KES"
            });
        } else {
            // Create new payment record with M-Pesa details
            const [result] = await db.execute(
                `INSERT INTO payments 
                 (user_id, booking_id, amount, payment_method, payment_status, mpesa_checkout_request_id, mpesa_phone_number)
                 VALUES (?, ?, ?, 'mpesa', 'pending', ?, ?)`,
                [req.session.user.id, bookingId, amount, stkResponse.CheckoutRequestID, phoneNumber]
            );

            // DEV MODE: Auto-complete payment after 5 seconds
            if (DEV_MODE) {
                setTimeout(async () => {
                    await db.execute(
                        `UPDATE payments 
                         SET payment_status = 'completed',
                             mpesa_receipt_number = 'DEV${Date.now()}',
                             paid_at = NOW()
                         WHERE id = ?`,
                        [result.insertId]
                    );
                    await db.execute(
                        "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
                        [bookingId]
                    );
                    console.log('✅ DEV MODE: Payment auto-completed');
                }, 5000);
            }

            res.json({
                message: DEV_MODE 
                    ? "DEV MODE: Payment simulated. Will complete in 5 seconds." 
                    : "Payment initiated. Please check your phone to complete the payment.",
                checkoutRequestID: stkResponse.CheckoutRequestID,
                paymentId: result.insertId,
                amount: amount,
                currency: "KES"
            });
        }

        await logActivityHelper(req, "MPESA_PAYMENT_INITIATED", `M-Pesa payment initiated for booking ${bookingId}`);

    } catch (err) {
        console.error("M-Pesa initiation error:", err);
        res.status(500).json({ 
            error: "Failed to initiate payment",
            message: err.message,
            details: err.response?.data || err.message 
        });
    }
};

/**
 * Check M-Pesa Payment Status
 */
exports.checkPaymentStatus = async (req, res) => {
    const { checkoutRequestID } = req.params;

    try {
        // Check our database first
        const [payment] = await db.execute(
            "SELECT * FROM payments WHERE mpesa_checkout_request_id = ?",
            [checkoutRequestID]
        );

        // If payment is already completed in our DB, return that
        if (payment.length > 0 && payment[0].payment_status === 'completed') {
            return res.json({
                resultCode: "0",
                resultDesc: "Payment completed successfully",
                status: "success"
            });
        }

        // DEV MODE: Return pending status
        if (DEV_MODE) {
            return res.json({
                resultCode: payment[0]?.payment_status === 'completed' ? "0" : "1037",
                resultDesc: payment[0]?.payment_status === 'completed' 
                    ? "The transaction was successful" 
                    : "Timeout in completing transaction",
                status: payment[0]?.payment_status === 'completed' ? "success" : "pending"
            });
        }

        // PRODUCTION: Query M-Pesa API
        const statusResponse = await queryStkPushStatus(checkoutRequestID);

        res.json({
            resultCode: statusResponse.ResultCode,
            resultDesc: statusResponse.ResultDesc,
            status: statusResponse.ResultCode === "0" ? "success" : "pending"
        });

    } catch (err) {
        console.error("M-Pesa status check error:", err);
        res.status(500).json({ error: "Failed to check payment status" });
    }
};

/**
 * M-Pesa Callback Handler
 */
exports.mpesaCallback = async (req, res) => {
    console.log("📥 M-Pesa Callback received:", JSON.stringify(req.body, null, 2));

    try {
        const callbackData = processCallback(req.body);

        console.log("📊 Processed callback data:", callbackData);

        // Find payment record
        const [payments] = await db.execute(
            "SELECT * FROM payments WHERE mpesa_checkout_request_id = ?",
            [callbackData.checkoutRequestID]
        );

        if (payments.length === 0) {
            console.error("❌ Payment not found for CheckoutRequestID:", callbackData.checkoutRequestID);
            return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
        }

        const payment = payments[0];

        // Update payment based on result
        if (callbackData.resultCode === 0) {
            // Payment successful
            await db.execute(
                `UPDATE payments 
                 SET payment_status = 'completed',
                     mpesa_receipt_number = ?,
                     mpesa_transaction_date = ?,
                     paid_at = NOW()
                 WHERE id = ?`,
                [callbackData.mpesaReceiptNumber, callbackData.transactionDate, payment.id]
            );

            // Update booking status to confirmed (if it was pending)
            await db.execute(
                "UPDATE bookings SET status = 'confirmed' WHERE id = ? AND status = 'pending'",
                [payment.booking_id]
            );

            console.log("✅ Payment completed successfully:", callbackData.mpesaReceiptNumber);

        } else {
            // Payment failed or cancelled
            await db.execute(
                "UPDATE payments SET payment_status = 'failed' WHERE id = ?",
                [payment.id]
            );

            console.log("❌ Payment failed:", callbackData.resultDesc);
        }

        // Acknowledge callback
        res.json({ ResultCode: 0, ResultDesc: "Accepted" });

    } catch (err) {
        console.error("Callback processing error:", err);
        res.json({ ResultCode: 1, ResultDesc: "Failed" });
    }
};

/**
 * M-Pesa Timeout Handler
 */
exports.mpesaTimeout = async (req, res) => {
    console.log("⏱️ M-Pesa Timeout:", JSON.stringify(req.body, null, 2));

    try {
        const { CheckoutRequestID } = req.body;

        // Update payment as failed due to timeout
        await db.execute(
            "UPDATE payments SET payment_status = 'failed' WHERE mpesa_checkout_request_id = ?",
            [CheckoutRequestID]
        );

        res.json({ ResultCode: 0, ResultDesc: "Accepted" });

    } catch (err) {
        console.error("Timeout processing error:", err);
        res.json({ ResultCode: 1, ResultDesc: "Failed" });
    }
};