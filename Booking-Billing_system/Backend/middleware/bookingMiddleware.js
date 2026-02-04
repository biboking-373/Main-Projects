/**
 * Check if user is authenticated
 */
exports.isAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Login required" });
    }
    next();
};

/**
 * Check if user is customer (role_id = 1)
 * Also allows staff and admin
 */
exports.isCustomer = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Login required" });
    }

    // Allow customers, staff, and admin
    if (![1, 2, 3].includes(req.session.user.role_id)) {
        return res.status(403).json({ message: "Invalid user role" });
    }

    next();
};

/**
 * Check if user is staff or admin (role_id = 2 or 3)
 */
exports.isStaffOrAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Login required" });
    }

    if (req.session.user.role_id !== 2 && req.session.user.role_id !== 3) {
        return res.status(403).json({
            message: "Staff or Admin access only"
        });
    }

    next();
};

/**
 * Check if user is admin only (role_id = 3)
 */
exports.isAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Login required" });
    }

    if (req.session.user.role_id !== 3) {
        return res.status(403).json({ message: "Admin access only" });
    }

    next();
};

/**
 * Validate booking dates
 */
exports.validateBookingDates = (req, res, next) => {
    const { check_in, check_out } = req.body;

    if (!check_in || !check_out) {
        return res.status(400).json({
            message: "check_in and check_out are required"
        });
    }

    const checkIn = new Date(check_in);
    const checkOut = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if dates are valid
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return res.status(400).json({
            message: "Invalid date format. Use YYYY-MM-DD"
        });
    }

    // Check if check-in is not in the past
    if (checkIn < today) {
        return res.status(400).json({
            message: "Check-in date cannot be in the past"
        });
    }

    // Check if check-out is after check-in
    if (checkOut <= checkIn) {
        return res.status(400).json({
            message: "Check-out date must be after check-in date"
        });
    }

    // Check if booking is not too far in advance (e.g., 1 year)
    const oneYearFromNow = new Date(today);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (checkIn > oneYearFromNow) {
        return res.status(400).json({
            message: "Cannot book more than 1 year in advance"
        });
    }

    next();
};

/**
 * Validate number of guests (including adults and children)
 */
exports.validateGuests = (req, res, next) => {
    const { number_of_guests, adults, children } = req.body;

    // Check if all required fields are present
    if (number_of_guests === undefined || adults === undefined || children === undefined) {
        return res.status(400).json({
            message: "number_of_guests, adults, and children are required"
        });
    }

    // Convert to numbers
    const guests = parseInt(number_of_guests);
    const adultsNum = parseInt(adults);
    const childrenNum = parseInt(children);

    // Validate number_of_guests
    if (isNaN(guests) || guests < 1) {
        return res.status(400).json({
            message: "Number of guests must be at least 1"
        });
    }

    if (guests > 4) {
        return res.status(400).json({
            message: "Maximum 4 guests per room"
        });
    }

    // Validate adults
    if (isNaN(adultsNum) || adultsNum < 1) {
        return res.status(400).json({
            message: "At least 1 adult is required"
        });
    }

    // Validate children
    if (isNaN(childrenNum) || childrenNum < 0) {
        return res.status(400).json({
            message: "Number of children cannot be negative"
        });
    }

    // Validate that adults + children = number_of_guests
    if (adultsNum + childrenNum !== guests) {
        return res.status(400).json({
            message: "Number of adults + children must equal total number of guests"
        });
    }

    next();
};

/**
 * Check if user owns the booking (or is staff/admin)
 */
exports.canAccessBooking = async (req, res, next) => {
    const { id } = req.params;
    const sessionUserId = req.session.user.id;
    const userRole = req.session.user.role_id;

    // Admin and staff can access any booking
    if (userRole === 2 || userRole === 3) {
        return next();
    }

    // Customer can only access their own bookings
    const db = require("../config/database");

    try {
        const [booking] = await db.execute(
            "SELECT user_id FROM bookings WHERE id = ?",
            [id]
        );

        if (booking.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking[0].user_id !== sessionUserId) {
            return res.status(403).json({
                message: "You can only access your own bookings"
            });
        }

        next();
    } catch (err) {
        console.error("Can access booking error:", err);
        res.status(500).json({ error: "Authorization check failed" });
    }
};