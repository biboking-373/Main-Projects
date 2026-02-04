const db = require("../config/database");

/**
 * ADMIN: View all activity logs with pagination
 */
exports.getAllActivities = async (req, res) => {
    try {
        // Optional pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.execute(
            "SELECT COUNT(*) as total FROM activity_logs"
        );
        const total = countResult[0].total;

        // Get paginated logs
        const [rows] = await db.execute(`
            SELECT 
                al.id,
                al.action,
                al.description,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.name AS user_name,
                u.email,
                u.role_id
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            activities: rows
        });

    } catch (err) {
        console.error("Get all activities error:", err);
        res.status(500).json({ error: "Failed to fetch activity logs" });
    }
};

/**
 * USER: View own activity logs
 */
exports.getMyActivities = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Optional pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Get total count for user
        const [countResult] = await db.execute(
            "SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?",
            [userId]
        );
        const total = countResult[0].total;

        // Get paginated logs
        const [rows] = await db.execute(
            `SELECT 
                id,
                action, 
                description, 
                ip_address,
                created_at
            FROM activity_logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            activities: rows
        });

    } catch (err) {
        console.error("Get my activities error:", err);
        res.status(500).json({ error: "Failed to fetch your activity logs" });
    }
};

/**
 * ADMIN: Get activities by user ID
 */
exports.getActivitiesByUserId = async (req, res) => {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
        // Check if user exists
        const [userCheck] = await db.execute(
            "SELECT id, name, email FROM users WHERE id = ?",
            [userId]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = userCheck[0];

        // Get activities
        const [rows] = await db.execute(
            `SELECT 
                id,
                action,
                description,
                ip_address,
                created_at
            FROM activity_logs
            WHERE user_id = ?
            ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            user,
            count: rows.length,
            activities: rows
        });

    } catch (err) {
        console.error("Get activities by user error:", err);
        res.status(500).json({ error: "Failed to fetch user activities" });
    }
};