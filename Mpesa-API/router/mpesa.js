const express = require("express");
const router = express.Router();
const { stkPush, mpesaCallback, queryTransaction } = require("../controller/transact");

const { getAccessToken } = require("../config/mpesa");


// STK Push route
router.post("/stkpush", stkPush);

// Callback route
router.post("/callback", mpesaCallback);

// Query transaction status
router.post("/query", queryTransaction);

module.exports = router;