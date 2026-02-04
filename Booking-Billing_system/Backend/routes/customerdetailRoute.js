const express = require("express");
const router = express.Router();

const customerDetailController = require("../controllers/customerdetailController");
const {
    isAuthenticated,
    isCustomer,
    isStaffOrAdmin,
    isAdmin,
    validatePhoneNumber
} = require("../middleware/customerdetailMiddleware");

// ========================================
// CUSTOMER ROUTES (Own details)
// ========================================

/**
 * Create own customer details
 * POST /customer-details/me
 */
router.post(
    "/me",
    isAuthenticated,
    isCustomer,
    validatePhoneNumber,
    customerDetailController.createCustomerDetail
);

/**
 * Get own customer details
 * GET /customer-details/me
 */
router.get(
    "/me",
    isAuthenticated,
    isCustomer,
    customerDetailController.getMyDetails
);

/**
 * Update own customer details
 * PUT /customer-details/me
 */
router.put(
    "/me",
    isAuthenticated,
    isCustomer,
    validatePhoneNumber,
    customerDetailController.updateMyDetails
);

// ========================================
// STAFF/ADMIN ROUTES (All customer details)
// ========================================

/**
 * Get all customer details (with pagination and search)
 * GET /customer-details?page=1&limit=20&search=john
 */
router.get(
    "/",
    isAuthenticated,
    isStaffOrAdmin,
    customerDetailController.getAllCustomerDetails
);

/**
 * Get customer details by user ID
 * GET /customer-details/user/:userId
 */
router.get(
    "/user/:userId",
    isAuthenticated,
    isStaffOrAdmin,
    customerDetailController.getCustomerDetailByUserId
);

// ========================================
// ADMIN ROUTES (Manage customer details)
// ========================================

/**
 * Update customer details by user ID (Admin only)
 * PUT /customer-details/user/:userId
 */
router.put(
    "/user/:userId",
    isAuthenticated,
    isAdmin,
    validatePhoneNumber,
    customerDetailController.updateCustomerDetailByUserId
);

/**
 * Delete customer details (Admin only)
 * DELETE /customer-details/user/:userId
 */
router.delete(
    "/user/:userId",
    isAuthenticated,
    isAdmin,
    customerDetailController.deleteCustomerDetail
);

module.exports = router;