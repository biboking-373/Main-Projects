const db = require("../config/database");
const { logActivityHelper } = require("../middleware/activityMiddleware");

/**
 * CREATE PAYMENT (Automatically after booking or manual)
 */
exports.createPayment = async (req, res) => {
    const userId = req.session.user.id;
    const {
        booking_id,
        amount,
        payment_method  // ← This was being ignored!
    } = req.body;

    // Validation
    if (!booking_id || !amount) {
        return res.status(400).json({
            message: "booking_id and amount are required"
        });
    }

    if (amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0"
        });
    }

    // Validate payment method
    const validMethods = ['credit_card', 'mpesa', 'cash', 'bank_transfer'];
    if (payment_method && !validMethods.includes(payment_method)) {
        return res.status(400).json({
            message: "Invalid payment method. Must be: credit_card, mpesa, cash, or bank_transfer"
        });
    }

    try {
        // Verify booking exists and belongs to user (or user is staff/admin)
        const [booking] = await db.execute(
            `SELECT b.*, r.room_number, r.room_type 
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             WHERE b.id = ?`,
            [booking_id]
        );

        if (booking.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Check if user owns this booking (customers can only pay for their own bookings)
        if (req.session.user.role_id === 1 && booking[0].user_id !== userId) {
            return res.status(403).json({
                message: "You can only create payments for your own bookings"
            });
        }

        // Check if payment already exists for this booking
        const [existingPayment] = await db.execute(
            "SELECT id FROM payments WHERE booking_id = ?",
            [booking_id]
        );

        if (existingPayment.length > 0) {
            return res.status(400).json({
                message: "Payment already exists for this booking"
            });
        }

        // Create payment WITH payment_method
        const [result] = await db.execute(
            `INSERT INTO payments 
            (user_id, booking_id, amount, payment_method, payment_status)
            VALUES (?, ?, ?, ?, 'pending')`,
            [booking[0].user_id, booking_id, amount, payment_method || 'cash']
        );

        res.status(201).json({
            message: "Payment created successfully",
            payment: {
                id: result.insertId,
                booking_id,
                amount,
                payment_method: payment_method || 'cash',
                payment_status: "pending",
                room_number: booking[0].room_number,
                room_type: booking[0].room_type
            }
        });

        await logActivityHelper(
            req,
            "CREATE_PAYMENT",
            `Created payment for booking #${booking_id}, amount: ${amount}, method: ${payment_method || 'cash'}`
        );

    } catch (err) {
        console.error("Create payment error:", err);
        res.status(500).json({ error: "Failed to create payment" });
    }
};

/**
 * GET OWN PAYMENTS (Customer views their own)
 */
exports.getMyPayments = async (req, res) => {
    const userId = req.session.user.id;

    try {
        // Optional status filter
        const status = req.query.payment_status;

        let query = `
            SELECT 
                p.id,
                p.booking_id,
                p.amount,
                p.payment_method,
                p.payment_status,
                p.paid_at,
                p.mpesa_receipt_number,
                b.check_in,
                b.check_out,
                r.room_number,
                r.room_type
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            WHERE p.user_id = ?
        `;

        const params = [userId];

        if (status) {
            query += ` AND p.payment_status = ?`;
            params.push(status);
        }

        query += ` ORDER BY p.id DESC`;

        const [rows] = await db.execute(query, params);

        res.json({
            count: rows.length,
            payments: rows
        });

    } catch (err) {
        console.error("Get my payments error:", err);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
};

/**
 * GET SINGLE PAYMENT BY ID (Customer views their own)
 */
exports.getMyPaymentById = async (req, res) => {
    const userId = req.session.user.id;
    const { id } = req.params;

    // Validate payment ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
    }

    try {
        const [rows] = await db.execute(
            `SELECT 
                p.*,
                b.check_in,
                b.check_out,
                b.number_of_guests,
                b.adults,
                b.children,
                b.status as booking_status,
                r.room_number,
                r.room_type,
                r.price_per_night,
                u.name as customer_name,
                u.email as customer_email
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ? AND p.user_id = ?`,
            [id, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Payment not found" });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error("Get my payment by ID error:", err);
        res.status(500).json({ error: "Failed to fetch payment" });
    }
};

/**
 * GET ALL PAYMENTS (Staff/Admin only) - FIXED VERSION
 */
exports.getAllPayments = async (req, res) => {
    try {
        // Pagination with proper defaults
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        // Filters
        const { payment_status, booking_id, user_id, search } = req.query;

        // Build WHERE clause
        let whereClause = 'WHERE 1=1';
        const whereParams = [];

        if (payment_status) {
            whereClause += ' AND p.payment_status = ?';
            whereParams.push(payment_status);
        }

        if (booking_id) {
            whereClause += ' AND p.booking_id = ?';
            whereParams.push(booking_id);
        }

        if (user_id) {
            whereClause += ' AND p.user_id = ?';
            whereParams.push(user_id);
        }

        if (search) {
            whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
            whereParams.push(`%${search}%`, `%${search}%`);
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON p.user_id = u.id
            ${whereClause}
        `;

        const [countResult] = await db.execute(countQuery, whereParams);
        const total = countResult[0].total;

        // Get paginated data
        const dataQuery = `
            SELECT 
                p.id,
                p.user_id,
                p.booking_id,
                p.amount,
                p.payment_method,
                p.payment_status,
                p.paid_at,
                p.mpesa_receipt_number,
                b.check_in,
                b.check_out,
                r.room_number,
                r.room_type,
                u.name as customer_name,
                u.email as customer_email
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON p.user_id = u.id
            ${whereClause}
            ORDER BY p.id DESC 
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [rows] = await db.query(dataQuery, whereParams);

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: rows
        });

    } catch (err) {
        console.error("Get all payments error:", err);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
};

/**
 * GET PAYMENT BY ID (Staff/Admin only)
 */
exports.getPaymentById = async (req, res) => {
    const { id } = req.params;

    // Validate payment ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
    }

    try {
        const [rows] = await db.execute(
            `SELECT 
                p.*,
                b.check_in,
                b.check_out,
                b.number_of_guests,
                b.adults,
                b.children,
                b.status as booking_status,
                r.room_number,
                r.room_type,
                r.price_per_night,
                u.name as customer_name,
                u.email as customer_email,
                u.role_id,
                cd.phone,
                cd.address,
                cd.national_id
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN customer_details cd ON p.user_id = cd.user_id
            WHERE p.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Payment not found" });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error("Get payment by ID error:", err);
        res.status(500).json({ error: "Failed to fetch payment" });
    }
};

/**
 * UPDATE PAYMENT STATUS (Staff/Admin only)
 */
exports.updatePaymentStatus = async (req, res) => {
    const { id } = req.params;
    const { payment_status } = req.body;

    // Validate payment ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
    }

    // Validate status
    const validStatuses = ["pending", "completed", "failed", "refunded"];
    if (!payment_status || !validStatuses.includes(payment_status)) {
        return res.status(400).json({
            message: "payment_status must be: pending, completed, failed, or refunded"
        });
    }

    try {
        // Check if payment exists
        const [payment] = await db.execute(
            `SELECT p.*, b.id as booking_id, r.room_number 
             FROM payments p
             JOIN bookings b ON p.booking_id = b.id
             JOIN rooms r ON b.room_id = r.id
             WHERE p.id = ?`,
            [id]
        );

        if (payment.length === 0) {
            return res.status(404).json({ message: "Payment not found" });
        }

        const oldStatus = payment[0].payment_status;

        // Set paid_at timestamp if status is completed
        let paidAt = null;
        if (payment_status === "completed") {
            paidAt = new Date();
        }

        // Update payment status
        await db.execute(
            "UPDATE payments SET payment_status = ?, paid_at = ? WHERE id = ?",
            [payment_status, paidAt, id]
        );

        // If payment completed, update booking status to confirmed
        if (payment_status === "completed" && payment[0].status !== "confirmed") {
            await db.execute(
                "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
                [payment[0].booking_id]
            );
        }

        res.json({
            message: "Payment status updated successfully",
            payment: {
                id: payment[0].id,
                booking_id: payment[0].booking_id,
                room_number: payment[0].room_number,
                old_status: oldStatus,
                new_status: payment_status,
                paid_at: paidAt
            }
        });

        await logActivityHelper(
            req,
            "UPDATE_PAYMENT_STATUS",
            `Updated payment #${id} status from ${oldStatus} to ${payment_status}`
        );

    } catch (err) {
        console.error("Update payment status error:", err);
        res.status(500).json({ error: "Failed to update payment status" });
    }
};

/**
 * UPDATE PAYMENT AMOUNT (Admin only)
 */
exports.updatePaymentAmount = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    // Validate payment ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
    }

    // Validate amount
    if (!amount || amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0"
        });
    }

    try {
        // Check if payment exists
        const [payment] = await db.execute(
            "SELECT * FROM payments WHERE id = ?",
            [id]
        );

        if (payment.length === 0) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Don't allow editing completed or refunded payments
        if (payment[0].payment_status === "completed" || payment[0].payment_status === "refunded") {
            return res.status(400).json({
                message: `Cannot edit ${payment[0].payment_status} payment`
            });
        }

        const oldAmount = payment[0].amount;

        // Update payment amount
        await db.execute(
            "UPDATE payments SET amount = ? WHERE id = ?",
            [amount, id]
        );

        res.json({
            message: "Payment amount updated successfully",
            payment: {
                id: payment[0].id,
                booking_id: payment[0].booking_id,
                old_amount: oldAmount,
                new_amount: amount
            }
        });

        await logActivityHelper(
            req,
            "UPDATE_PAYMENT_AMOUNT",
            `Updated payment #${id} amount from ${oldAmount} to ${amount}`
        );

    } catch (err) {
        console.error("Update payment amount error:", err);
        res.status(500).json({ error: "Failed to update payment amount" });
    }
};

/**
 * DELETE PAYMENT (Admin only)
 */
exports.deletePayment = async (req, res) => {
    const { id } = req.params;

    // Validate payment ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
    }

    try {
        // Check if payment exists
        const [payment] = await db.execute(
            `SELECT p.*, b.id as booking_id, r.room_number 
             FROM payments p
             JOIN bookings b ON p.booking_id = b.id
             JOIN rooms r ON b.room_id = r.id
             WHERE p.id = ?`,
            [id]
        );

        if (payment.length === 0) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Don't allow deleting completed payments
        if (payment[0].payment_status === "completed") {
            return res.status(400).json({
                message: "Cannot delete completed payment. Use refund instead."
            });
        }

        // Delete payment
        await db.execute(
            "DELETE FROM payments WHERE id = ?",
            [id]
        );

        res.json({
            message: "Payment deleted successfully",
            payment: {
                id: payment[0].id,
                booking_id: payment[0].booking_id,
                room_number: payment[0].room_number
            }
        });

        await logActivityHelper(
            req,
            "DELETE_PAYMENT",
            `Deleted payment #${id} for booking #${payment[0].booking_id}`
        );

    } catch (err) {
        console.error("Delete payment error:", err);
        res.status(500).json({ error: "Failed to delete payment" });
    }
};

/**
 * GET PAYMENT BY BOOKING ID (Staff/Admin)
 */
exports.getPaymentByBookingId = async (req, res) => {
    const { bookingId } = req.params;

    // Validate booking ID
    if (!bookingId || isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
    }

    try {
        const [rows] = await db.execute(
            `SELECT 
                p.*,
                b.check_in,
                b.check_out,
                r.room_number,
                r.room_type,
                u.name as customer_name,
                u.email as customer_email
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON p.user_id = u.id
            WHERE p.booking_id = ?`,
            [bookingId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "No payment found for this booking"
            });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error("Get payment by booking ID error:", err);
        res.status(500).json({ error: "Failed to fetch payment" });
    }
};

/**
 * GET PAYMENT STATISTICS (Admin only)
 */
exports.getPaymentStatistics = async (req, res) => {
    try {
        // Total payments by status
        const [statusStats] = await db.execute(`
            SELECT 
                payment_status,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM payments
            GROUP BY payment_status
        `);

        // Total revenue (completed payments)
        const [revenue] = await db.execute(`
            SELECT 
                SUM(amount) as total_revenue,
                COUNT(*) as completed_payments
            FROM payments
            WHERE payment_status = 'completed'
        `);

        // Pending payments
        const [pending] = await db.execute(`
            SELECT 
                COUNT(*) as pending_count,
                SUM(amount) as pending_amount
            FROM payments
            WHERE payment_status = 'pending'
        `);

        // Payment methods breakdown
        const [methodStats] = await db.execute(`
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM payments
            GROUP BY payment_method
        `);

        res.json({
            status_breakdown: statusStats,
            payment_methods: methodStats,
            total_revenue: revenue[0].total_revenue || 0,
            completed_payments: revenue[0].completed_payments || 0,
            pending_payments: pending[0].pending_count || 0,
            pending_amount: pending[0].pending_amount || 0
        });

    } catch (err) {
        console.error("Get payment statistics error:", err);
        res.status(500).json({ error: "Failed to fetch payment statistics" });
    }
};