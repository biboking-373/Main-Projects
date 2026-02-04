const express = require("express");
const router = express.Router();
const mpesaController = require("../controllers/mpesaController");
const { isAuthenticated } = require("../middleware/authMiddleware");

// Protected routes (customer needs to be logged in)
router.post("/initiate", isAuthenticated, mpesaController.initiatePayment);
router.get("/status/:checkoutRequestID", isAuthenticated, mpesaController.checkPaymentStatus);

// Public routes (for M-Pesa callbacks)
router.post("/callback", mpesaController.mpesaCallback);
router.post("/timeout", mpesaController.mpesaTimeout);

module.exports = router;
