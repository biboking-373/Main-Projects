const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");
const {
    isAuthenticated,
    isCustomer,
    isStaffOrAdmin,
    isAdmin,
    validatePaymentAmount,
    canAccessPayment
} = require("../middleware/paymentMiddleware");

// ========================================
// CUSTOMER ROUTES (Own payments)
// ========================================

/**
 * Create new payment
 * POST /payment/my-payments
 */
router.post(
    "/my-payments",
    isAuthenticated,
    isCustomer,
    validatePaymentAmount,
    paymentController.createPayment
);

/**
 * Get own payments (with optional status filter)
 * GET /payment/my-payments?payment_status=pending
 */
router.get(
    "/my-payments",
    isAuthenticated,
    isCustomer,
    paymentController.getMyPayments
);

/**
 * Get single payment by ID (own payment)
 * GET /payment/my-payments/:id
 */
router.get(
    "/my-payments/:id",
    isAuthenticated,
    canAccessPayment,
    paymentController.getMyPaymentById
);

// ========================================
// STAFF/ADMIN ROUTES (All payments)
// ========================================

/**
 * IMPORTANT: Specific routes MUST come before parameterized routes
 * Place /statistics/summary BEFORE /:id
 */

/**
 * Get payment statistics (Admin)
 * GET /payment/statistics/summary
 */
router.get(
    "/statistics/summary",
    isAuthenticated,
    isAdmin,
    paymentController.getPaymentStatistics
);

/**
 * Get payment by booking ID
 * GET /payment/booking/:bookingId
 */
router.get(
    "/booking/:bookingId",
    isAuthenticated,
    isStaffOrAdmin,
    paymentController.getPaymentByBookingId
);

/**
 * Get all payments (with filters and pagination)
 * GET /payment?page=1&limit=20&payment_status=pending&search=john
 */
router.get(
    "/",
    isAuthenticated,
    isStaffOrAdmin,
    paymentController.getAllPayments
);

/**
 * Get payment by ID (any payment)
 * GET /payment/:id
 * MUST be after specific routes like /statistics/summary
 */
router.get(
    "/:id",
    isAuthenticated,
    isStaffOrAdmin,
    paymentController.getPaymentById
);

/**
 * Update payment status (Staff/Admin)
 * PUT /payment/:id/status
 */
router.put(
    "/:id/status",
    isAuthenticated,
    isStaffOrAdmin,
    paymentController.updatePaymentStatus
);

// ========================================
// ADMIN ROUTES (Full payment management)
// ========================================

/**
 * Update payment amount (Admin only)
 * PUT /payment/:id/amount
 */
router.put(
    "/:id/amount",
    isAuthenticated,
    isAdmin,
    validatePaymentAmount,
    paymentController.updatePaymentAmount
);

/**
 * Delete payment (Admin only)
 * DELETE /payment/:id
 */
router.delete(
    "/:id",
    isAuthenticated,
    isAdmin,
    paymentController.deletePayment
);

module.exports = router;