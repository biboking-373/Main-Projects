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
 * Validate phone number format
 */
exports.validatePhoneNumber = (req, res, next) => {
    const { phone_number} = req.body;

    const phoneRegex = /^[0-9+\-\s()]{10,20}$/;

    if (phone_number && !phoneRegex.test(phone_number)) {
        return res.status(400).json({
            message: "Invalid phone number format"
        });
    }

    next();
};

/**
 * Check if user owns the customer detail (or is staff/admin)
 */
exports.canAccessCustomerDetail = async (req, res, next) => {
    const { userId } = req.params;
    const sessionUserId = req.session.user.id;
    const userRole = req.session.user.role_id;

    // Admin and staff can access any customer detail
    if (userRole === 2 || userRole === 3) {
        return next();
    }

    // Customer can only access their own details
    if (parseInt(userId) !== sessionUserId) {
        return res.status(403).json({
            message: "You can only access your own customer details"
        });
    }

    next();
};