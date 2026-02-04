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
 * Validate payment amount
 */
exports.validatePaymentAmount = (req, res, next) => {
    const { amount } = req.body;

    if (!amount) {
        return res.status(400).json({
            message: "amount is required"
        });
    }

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
            message: "Amount must be a positive number"
        });
    }

    if (numAmount > 1000000) {
        return res.status(400).json({
            message: "Amount cannot exceed 1,000,000"
        });
    }

    next();
};

/**
 * Check if user owns the payment (or is staff/admin)
 */
exports.canAccessPayment = async (req, res, next) => {
    const { id } = req.params;
    const sessionUserId = req.session.user.id;
    const userRole = req.session.user.role_id;

    // Admin and staff can access any payment
    if (userRole === 2 || userRole === 3) {
        return next();
    }

    // Customer can only access their own payments
    const db = require("../config/database");

    try {
        const [payment] = await db.execute(
            "SELECT user_id FROM payments WHERE id = ?",
            [id]
        );

        if (payment.length === 0) {
            return res.status(404).json({ message: "Payment not found" });
        }

        if (payment[0].user_id !== sessionUserId) {
            return res.status(403).json({
                message: "You can only access your own payments"
            });
        }

        next();
    } catch (err) {
        console.error("Can access payment error:", err);
        res.status(500).json({ error: "Authorization check failed" });
    }
};