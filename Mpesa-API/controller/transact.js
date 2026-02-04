const mpepetransaction = require("../models/transaction");
const { getAccessToken } = require("../config/mpesa");
const axios = require("axios");
const moment = require("moment");

// STK Push (Lipa na M-Pesa Online)
exports.stkPush = async (req, res) => {
    const { phone, amount } = req.body;

    // Validate input
    if (!phone || !amount) {
        return res.status(400).json({ error: "Phone and amount are required" });
    }

    try {
        const token = await getAccessToken();
        const timestamp = moment().format("YYYYMMDDHHmmss");
        const password = Buffer.from(
            `${process.env.BUSINESS_SHORT_CODE}${process.env.PASSKEY}${timestamp}`
        ).toString("base64");

        const stkPushRequest = {
            BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone, // Phone number sending money
            PartyB: process.env.BUSINESS_SHORT_CODE,
            PhoneNumber: phone,
            CallBackURL: process.env.CALLBACK_URL,
            AccountReference: "Payment",
            TransactionDesc: "Payment for services",
        };

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            stkPushRequest,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        res.status(200).json({
            success: true,
            message: "STK Push sent successfully",
            data: response.data,
        });
    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "STK Push failed",
            details: error.response?.data || error.message,
        });
    }
};

// Callback Handler
exports.mpesaCallback = async (req, res) => {
    const callbackData = req.body;

    console.log("M-Pesa Callback Data:", JSON.stringify(callbackData, null, 2));

    try {
        const resultCode = callbackData.Body.stkCallback.ResultCode;

        if (resultCode === 0) {
            // Transaction successful
            const callbackMetadata = callbackData.Body.stkCallback.CallbackMetadata.Item;

            const transaction = {
                merchantRequestID: callbackData.Body.stkCallback.MerchantRequestID,
                checkoutRequestID: callbackData.Body.stkCallback.CheckoutRequestID,
                mpesaReceiptNumber: callbackMetadata.find(
                    (item) => item.Name === "MpesaReceiptNumber"
                )?.Value,
                paidAmount: callbackMetadata.find(
                    (item) => item.Name === "Amount"
                )?.Value,
                payingPhoneNumber: callbackMetadata.find(
                    (item) => item.Name === "PhoneNumber"
                )?.Value,
                transactionDate: moment().format("YYYY-MM-DD HH:mm:ss"),
            };

            // Save to database
            await mpepetransaction.create(transaction);

            console.log("Transaction saved successfully:", transaction);
        } else {
            console.log("Transaction failed with result code:", resultCode);
        }

        res.status(200).json({ message: "Callback received" });
    } catch (error) {
        console.error("Callback Error:", error.message);
        res.status(500).json({ error: "Callback processing failed" });
    }
};

// Query Transaction Status
exports.queryTransaction = async (req, res) => {
    const { checkoutRequestID } = req.body;

    try {
        const token = await getAccessToken();
        const timestamp = moment().format("YYYYMMDDHHmmss");
        const password = Buffer.from(
            `${process.env.BUSINESS_SHORT_CODE}${process.env.PASSKEY}${timestamp}`
        ).toString("base64");

        const queryRequest = {
            BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID,
        };

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
            queryRequest,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        res.status(200).json(response.data);
    } catch (error) {
        console.error("Query Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Query failed",
            details: error.response?.data || error.message,
        });
    }
};

