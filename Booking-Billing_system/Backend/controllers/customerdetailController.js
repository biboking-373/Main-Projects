const db = require("../config/database");
const { logActivityHelper } = require("../middleware/activityMiddleware");

/**
 * CREATE CUSTOMER DETAILS (Customer creates their own)
 */
exports.createCustomerDetail = async (req, res) => {
    const userId = req.session.user.id;
    const {
        phone,
        address,
        national_id
    } = req.body;

    // Validation
    if (!phone || !address) {
        return res.status(400).json({
            message: "phone and address are required"
        });
    }

    // Validate phone number format (basic)
    const phoneRegex = /^[0-9+\-\s()]{10,20}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({
            message: "Invalid phone number format"
        });
    }

    try {
        // Check if customer details already exist
        const [existing] = await db.execute(
            "SELECT id FROM customer_details WHERE user_id = ?",
            [userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                message: "Customer details already exist. Use update endpoint instead."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO customer_details 
            (user_id, phone, address, national_id)
             VALUES (?, ?, ?, ?)`,
            [
                userId,
                phone,
                address,
                national_id || null
            ]
        );

        res.status(201).json({
            message: "Customer details created successfully",
            detailId: result.insertId
        });

        await logActivityHelper(
            req,
            "CREATE_CUSTOMER_DETAIL",
            `Customer created their details`
        );

    } catch (err) {
        console.error("Create customer detail error:", err);
        res.status(500).json({ error: "Failed to create customer details" });
    }
};

/**
 * GET OWN CUSTOMER DETAILS (Customer views their own)
 */
exports.getMyDetails = async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [rows] = await db.execute(
            `SELECT 
                cd.*,
                u.name,
                u.email
            FROM customer_details cd
            JOIN users u ON cd.user_id = u.id
            WHERE cd.user_id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Customer details not found. Please create your details first."
            });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error("Get my details error:", err);
        res.status(500).json({ error: "Failed to fetch customer details" });
    }
};

/**
 * UPDATE OWN CUSTOMER DETAILS (Customer updates their own)
 */
exports.updateMyDetails = async (req, res) => {
    const userId = req.session.user.id;
    const {
        phone,
        address,
        national_id
    } = req.body;

    // Validation
    if (!phone || !address) {
        return res.status(400).json({
            message: "phone and address are required"
        });
    }

    // Validate phone number format
    const phoneRegex = /^[0-9+\-\s()]{10,20}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({
            message: "Invalid phone number format"
        });
    }

    try {
        // Check if details exist
        const [existing] = await db.execute(
            "SELECT id FROM customer_details WHERE user_id = ?",
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: "Customer details not found. Please create them first."
            });
        }

        await db.execute(
            `UPDATE customer_details
             SET phone = ?, address = ?, national_id = ?
             WHERE user_id = ?`,
            [
                phone,
                address,
                national_id || null,
                userId
            ]
        );

        res.json({ message: "Customer details updated successfully" });

        await logActivityHelper(
            req,
            "UPDATE_CUSTOMER_DETAIL",
            `Customer updated their details`
        );

    } catch (err) {
        console.error("Update my details error:", err);
        res.status(500).json({ error: "Failed to update customer details" });
    }
};

/**
 * GET ALL CUSTOMER DETAILS (Staff/Admin only)
 * FIXED: Proper handling of LIMIT and OFFSET with db.execute()
 */
exports.getAllCustomerDetails = async (req, res) => {
    try {
        // Pagination with proper integer parsing
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;

        // Optional search by name or email
        const search = req.query.search || "";

        let baseQuery = `
            SELECT 
                cd.id,
                cd.user_id,
                cd.phone,
                cd.address,
                cd.national_id,
                u.name,
                u.email,
                u.role_id
            FROM customer_details cd
            JOIN users u ON cd.user_id = u.id
        `;

        let whereClause = '';
        let searchParams = [];

        if (search) {
            whereClause = ` WHERE u.name LIKE ? OR u.email LIKE ?`;
            searchParams = [`%${search}%`, `%${search}%`];
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM customer_details cd JOIN users u ON cd.user_id = u.id${whereClause}`;
        const [countRows] = await db.execute(countQuery, searchParams);
        const total = countRows[0]?.total || 0;

        // Get paginated results using db.query instead of db.execute for dynamic queries
        const dataQuery = `${baseQuery}${whereClause} ORDER BY cd.id DESC LIMIT ${limit} OFFSET ${offset}`;
        const [rows] = await db.execute(dataQuery, searchParams);

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: rows  // Changed from 'customers' to 'data' for consistency
        });

    } catch (err) {
        console.error("Get all customer details error:", err);
        res.status(500).json({ error: "Failed to fetch customer details" });
    }
};

/**
 * GET CUSTOMER DETAILS BY USER ID (Staff/Admin only)
 */
exports.getCustomerDetailByUserId = async (req, res) => {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
        const [rows] = await db.execute(
            `SELECT 
                cd.*,
                u.name,
                u.email,
                u.role_id
            FROM customer_details cd
            JOIN users u ON cd.user_id = u.id
            WHERE cd.user_id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Customer details not found for this user"
            });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error("Get customer detail by user ID error:", err);
        res.status(500).json({ error: "Failed to fetch customer details" });
    }
};

/**
 * UPDATE CUSTOMER DETAILS BY USER ID (Admin only)
 */
exports.updateCustomerDetailByUserId = async (req, res) => {
    const { userId } = req.params;
    const {
        phone,
        address,
        national_id
    } = req.body;

    // Validate user ID
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    // Validation
    if (!phone || !address) {
        return res.status(400).json({
            message: "phone and address are required"
        });
    }

    // Validate phone number format
    const phoneRegex = /^[0-9+\-\s()]{10,20}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({
            message: "Invalid phone number format"
        });
    }

    try {
        // Check if customer details exist
        const [existing] = await db.execute(
            "SELECT id FROM customer_details WHERE user_id = ?",
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: "Customer details not found for this user"
            });
        }

        // Get user info for logging
        const [userInfo] = await db.execute(
            "SELECT email FROM users WHERE id = ?",
            [userId]
        );

        await db.execute(
            `UPDATE customer_details
             SET phone = ?, address = ?, national_id = ?
             WHERE user_id = ?`,
            [
                phone,
                address,
                national_id || null,
                userId
            ]
        );

        res.json({ message: "Customer details updated successfully" });

        await logActivityHelper(
            req,
            "ADMIN_UPDATE_CUSTOMER_DETAIL",
            `Admin updated details for user: ${userInfo[0].email}`
        );

    } catch (err) {
        console.error("Update customer detail by user ID error:", err);
        res.status(500).json({ error: "Failed to update customer details" });
    }
};

/**
 * DELETE CUSTOMER DETAILS (Admin only)
 */
exports.deleteCustomerDetail = async (req, res) => {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
        // Check if customer details exist
        const [existing] = await db.execute(
            `SELECT cd.id, u.email 
             FROM customer_details cd
             JOIN users u ON cd.user_id = u.id
             WHERE cd.user_id = ?`,
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: "Customer details not found for this user"
            });
        }

        const userEmail = existing[0].email;

        const [result] = await db.execute(
            "DELETE FROM customer_details WHERE user_id = ?",
            [userId]
        );

        res.json({
            message: "Customer details deleted successfully",
            deletedUser: userEmail
        });

        await logActivityHelper(
            req,
            "DELETE_CUSTOMER_DETAIL",
            `Admin deleted details for user: ${userEmail}`
        );

    } catch (err) {
        console.error("Delete customer detail error:", err);

        // Handle foreign key constraint errors
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(400).json({
                error: "Cannot delete customer details with existing bookings"
            });
        }

        res.status(500).json({ error: "Failed to delete customer details" });
    }
};