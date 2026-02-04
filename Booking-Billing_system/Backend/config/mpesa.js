const axios = require("axios");
const moment = require("moment");

/**
 * M-Pesa Configuration
 * Currency: KES (Kenyan Shillings) - M-Pesa only supports KES
 */

/**
 * Generate M-Pesa Access Token
 */
const getAccessToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    try {
        const response = await axios.get(
            `${process.env.MPESA_API_URL}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting M-Pesa access token:", error.response?.data || error.message);
        throw new Error("Failed to get M-Pesa access token");
    }
};

/**
 * Generate Password for STK Push
 */
const generatePassword = () => {
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
    return { password, timestamp };
};

/**
 * Initiate STK Push (Lipa Na M-Pesa Online)
 */
const initiateSTKPush = async (phoneNumber, amount, accountReference, transactionDesc) => {
    try {
        const accessToken = await getAccessToken();
        const { password, timestamp } = generatePassword();

        // Format phone number (remove + and spaces, ensure it starts with 254)
        let formattedPhone = phoneNumber.replace(/[\s+]/g, "");
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "254" + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith("7") || formattedPhone.startsWith("1")) {
            formattedPhone = "254" + formattedPhone;
        }

        const payload = {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: Math.ceil(amount), // M-Pesa doesn't accept decimals
            PartyA: formattedPhone,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: process.env.MPESA_CALLBACK_URL,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc,
        };

        console.log("📱 Initiating STK Push:", {
            phone: formattedPhone,
            amount: payload.Amount,
            reference: accountReference
        });

        const response = await axios.post(
            `${process.env.MPESA_API_URL}/mpesa/stkpush/v1/processrequest`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("✅ STK Push initiated:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ STK Push error:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Query STK Push Status
 */
const queryStkPushStatus = async (checkoutRequestID) => {
    try {
        const accessToken = await getAccessToken();
        const { password, timestamp } = generatePassword();

        const payload = {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID,
        };

        const response = await axios.post(
            `${process.env.MPESA_API_URL}/mpesa/stkpushquery/v1/query`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error("Error querying STK Push status:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Process M-Pesa Callback Data
 */
const processCallback = (callbackData) => {
    try {
        const { Body } = callbackData;
        const { stkCallback } = Body;

        const result = {
            merchantRequestID: stkCallback.MerchantRequestID,
            checkoutRequestID: stkCallback.CheckoutRequestID,
            resultCode: stkCallback.ResultCode,
            resultDesc: stkCallback.ResultDesc,
        };

        // If successful, extract payment details
        if (stkCallback.ResultCode === 0) {
            const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
            
            result.amount = callbackMetadata.find(item => item.Name === "Amount")?.Value;
            result.mpesaReceiptNumber = callbackMetadata.find(item => item.Name === "MpesaReceiptNumber")?.Value;
            result.transactionDate = callbackMetadata.find(item => item.Name === "TransactionDate")?.Value;
            result.phoneNumber = callbackMetadata.find(item => item.Name === "PhoneNumber")?.Value;
        }

        return result;
    } catch (error) {
        console.error("Error processing callback:", error);
        throw error;
    }
};

module.exports = {
    getAccessToken,
    generatePassword,
    initiateSTKPush,
    queryStkPushStatus,
    processCallback,
};

