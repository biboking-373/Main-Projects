const db = require("../config/database");

/**
 * Helper function to log activity
 * Use this inside controllers AFTER successful operations
 */
exports.logActivityHelper = async (req, action, description = "") => {
    try {
        const userId = req.session?.user?.id || null;

        await db.execute(
            `INSERT INTO activity_logs 
            (user_id, action, description, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                action,
                description,
                req.ip || req.connection.remoteAddress,
                req.headers["user-agent"] || "Unknown"
            ]
        );
    } catch (err) {
        // Don't let logging errors break the application
        console.error("Activity log error:", err.message);
    }
};

/**
 * Middleware to log activity (use sparingly)
 * Only use for routes where the action always succeeds
 * For most cases, use logActivityHelper inside controllers instead
 */
exports.logActivity = (action, description = "") => {
    return async (req, res, next) => {
        try {
            const userId = req.session?.user?.id || null;

            await db.execute(
                `INSERT INTO activity_logs 
                (user_id, action, description, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    userId,
                    action,
                    description,
                    req.ip || req.connection.remoteAddress,
                    req.headers["user-agent"] || "Unknown"
                ]
            );
        } catch (err) {
            console.error("Activity log error:", err.message);
        }

        next();
    };
};