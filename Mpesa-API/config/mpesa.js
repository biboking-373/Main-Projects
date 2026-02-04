const axios = require("axios");

exports.getAccessToken = async () => {
    const auth = Buffer.from(
        `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
    ).toString("base64")

    try {
        const response = await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            }
        );
        return response.data.access_token
    } catch(error) {
        throw new Error("Failed to get access token: " + error.message);
    }
};
