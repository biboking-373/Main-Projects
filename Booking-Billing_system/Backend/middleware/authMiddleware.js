/**
 * Check if user is authenticated
 */
function isAuthenticated(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Login required" });
    }
    next();
}

/**
 * Role-based access control
 * Usage: allowRoles(1, 2) allows role_id 1 or 2
 */
function allowRoles(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ message: "Login required" });
        }

        if (!roles.includes(req.session.user.role_id)) {
            return res.status(403).json({ 
                message: "Access denied - insufficient permissions" 
            });
        }

        next();
    };
}

/**
 * Check if user is admin (role_id = 3)
 */
function isAdmin(req, res, next) {
    return allowRoles(3)(req, res, next);
}


/**
 * Check if user is staff or admin (role_id = 2 or 3)
 */
function isStaff(req, res, next) {
    return allowRoles(2, 3)(req, res, next);
}

module.exports = { 
    isAuthenticated, 
    allowRoles,
    isAdmin,
    isStaff
};