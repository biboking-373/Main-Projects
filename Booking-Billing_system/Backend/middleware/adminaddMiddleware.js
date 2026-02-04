exports.isAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Authentication required" });
    }

    if (req.session.user.role_id !== 3) {
        return res.status(403).json({ 
            message: "Access denied. Admin privileges required." 
        });
    }

    next();
};


exports.isEmployee = (req,res, next) => {
    if (!req.session.user) {
        return res.status(401).json({message: "Authentication required"});
    }

    if (req.session.user.role_id !== 2) {
        return res.status(401).json({message: "Authentication required"});
    }

    next();
}
