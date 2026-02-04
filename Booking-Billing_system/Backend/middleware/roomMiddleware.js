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
 * Check if user is admin
 * role_id = 3 (admin)
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
 * Check if user is staff (includes admin)
 * role_id = 2 (staff) or 3 (admin)
 */
exports.isStaff = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Login required" });
    }

    if (req.session.user.role_id !== 2 && req.session.user.role_id !== 3) {
        return res.status(403).json({ message: "Staff access only" });
    }

    next();
};