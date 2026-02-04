const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookingController");
const {
    isAuthenticated,
    isCustomer,
    isStaffOrAdmin,
    isAdmin,
    validateBookingDates,
    validateGuests,
    canAccessBooking
} = require("../middleware/bookingMiddleware");

// ========================================
// PUBLIC/AUTHENTICATED ROUTES
// ========================================

/**
 * Check room availability
 * GET /bookings/check-availability?room_id=1&check_in_date=2024-12-20&check_out_date=2024-12-25
 */
router.get(
    "/check-availability",
    isAuthenticated,
    bookingController.checkAvailability
);

// ========================================
// CUSTOMER ROUTES (Own bookings)
// ========================================

/**
 * Create new booking
 * POST /bookings/my-bookings
 */
router.post(
    "/my-bookings",
    isAuthenticated,
    isCustomer,
    validateBookingDates,
    validateGuests,
    bookingController.createBooking
);

/**
 * Get own bookings (with optional status filter)
 * GET /bookings/my-bookings?status=pending
 */
router.get(
    "/my-bookings",
    isAuthenticated,
    isCustomer,
    bookingController.getMyBookings
);

/**
 * Get single booking by ID (own booking)
 * GET /bookings/my-bookings/:id
 */
router.get(
    "/my-bookings/:id",
    isAuthenticated,
    canAccessBooking,
    bookingController.getMyBookingById
);

/**
 * Cancel own booking
 * PUT /bookings/my-bookings/:id/cancel
 */
router.put(
    "/my-bookings/:id/cancel",
    isAuthenticated,
    canAccessBooking,
    bookingController.cancelMyBooking
);

// ========================================
// STAFF/ADMIN ROUTES (All bookings)
// ========================================

/**
 * Get all bookings (with filters and pagination)
 * GET /bookings?page=1&limit=20&status=pending&room_id=1&search=john
 */
router.get(
    "/",
    isAuthenticated,
    isStaffOrAdmin,
    bookingController.getAllBookings
);

/**
 * Get booking by ID (any booking)
 * GET /bookings/:id
 */
router.get(
    "/:id",
    isAuthenticated,
    isStaffOrAdmin,
    bookingController.getBookingById
);

/**
 * Update booking status (Staff/Admin)
 * PUT /bookings/:id/status
 */
router.put(
    "/:id/status",
    isAuthenticated,
    isStaffOrAdmin,
    bookingController.updateBookingStatus
);

// ========================================
// ADMIN ROUTES (Full booking management)
// ========================================

/**
 * Update booking details (Admin only)
 * PUT /bookings/:id
 */
router.put(
    "/:id",
    isAuthenticated,
    isAdmin,
    validateBookingDates,
    validateGuests,
    bookingController.updateBooking
);

/**
 * Delete booking (Admin only)
 * DELETE /bookings/:id
 */
router.delete(
    "/:id",
    isAuthenticated,
    isAdmin,
    bookingController.deleteBooking
);

module.exports = router;