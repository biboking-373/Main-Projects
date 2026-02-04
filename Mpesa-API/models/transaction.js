const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mpepetransact = new Schema({
    payingPhoneNumber: String,
    transactionDate: String,
    mpesaReceiptNumber: String,
    paidAmount: String,
    merchantRequestID: String,
    checkoutRequestID: String
});

module.exports = mongoose.model("Payment", mpepetransact)

