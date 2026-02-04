const db = require("../config/database");
const bcrypt = require("bcryptjs");
const { logActivityHelper } = require("../middleware/activityMiddleware");

/**
 * GET ALL EMPLOYEES (Admin only) - with pagination
 */
exports.getAllEmployees = async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;

        // Filters
        const { status, department, search } = req.query;

        let whereClause = 'WHERE 1=1';
        const whereParams = [];

        if (status) {
            whereClause += ' AND e.status = ?';
            whereParams.push(status);
        }

        if (department) {
            whereClause += ' AND e.department = ?';
            whereParams.push(department);
        }

        if (search) {
            whereClause += ' AND (e.name LIKE ? OR e.email LIKE ? OR e.employee_number LIKE ?)';
            whereParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM employees e
            ${whereClause}
        `;

        const [countRows] = await db.execute(countQuery, whereParams);
        const total = countRows[0]?.total || 0;

        // Get paginated data
        const dataQuery = `
            SELECT 
                e.*,
                u.role_id,
                u.email as user_email
            FROM employees e
            JOIN users u ON e.user_id = u.id
            ${whereClause}
            ORDER BY e.id DESC 
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [rows] = await db.execute(dataQuery, whereParams);

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: rows
        });

    } catch (err) {
        console.error("Get all employees error:", err);
        res.status(500).json({ error: "Failed to fetch employees" });
    }
};

/**
 * GET EMPLOYEE BY ID (Admin only)
 */
exports.getEmployeeById = async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
    }

    try {
        const [rows] = await db.execute(
            `SELECT 
                e.*,
                u.role_id,
                u.email as user_email
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error("Get employee by ID error:", err);
        res.status(500).json({ error: "Failed to fetch employee" });
    }
};

/**
 * ADD EMPLOYEE (Admin only)
 */
exports.addEmployee = async (req, res) => {
    const {
        employee_number,
        name,
        email,
        phone,
        department,
        position,
        hire_date,
        password
    } = req.body;

    // Validation
    if (!employee_number || !name || !email || !department || !position || !hire_date || !password) {
        return res.status(400).json({
            message: "employee_number, name, email, department, position, hire_date, and password are required"
        });
    }

    // Validate department
    const validDepartments = ['Front Desk', 'Billing', 'Management'];
    if (!validDepartments.includes(department)) {
        return res.status(400).json({
            message: "Department must be: Front Desk, Billing, or Management"
        });
    }

    try {
        // Check if employee number already exists
        const [existingEmpNum] = await db.execute(
            "SELECT id FROM employees WHERE employee_number = ?",
            [employee_number]
        );

        if (existingEmpNum.length > 0) {
            return res.status(400).json({
                message: "Employee number already exists"
            });
        }

        // Check if email already exists in users table
        const [existingUser] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user account (role_id = 2 for employee)
        const [userResult] = await db.execute(
            `INSERT INTO users (name, email, password_hash, role_id)
             VALUES (?, ?, ?, 2)`,
            [name, email, hashedPassword]
        );

        const userId = userResult.insertId;

        // Create employee record
        const [empResult] = await db.execute(
            `INSERT INTO employees 
            (user_id, employee_number, name, email, phone, department, position, hire_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
            [userId, employee_number, name, email, phone || null, department, position, hire_date]
        );

        res.status(201).json({
            message: "Employee added successfully",
            employee: {
                id: empResult.insertId,
                user_id: userId,
                employee_number,
                name,
                email,
                department,
                position
            }
        });

        await logActivityHelper(
            req,
            "ADD_EMPLOYEE",
            `Added employee ${name} (${employee_number})`
        );

    } catch (err) {
        console.error("Add employee error:", err);
        res.status(500).json({ error: "Failed to add employee" });
    }
};

/**
 * UPDATE EMPLOYEE (Admin only)
 */
exports.updateEmployee = async (req, res) => {
    const { id } = req.params;
    const {
        employee_number,
        name,
        email,
        phone,
        department,
        position,
        status,
        hire_date
    } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
    }

    // Validation
    if (!name || !email || !department || !position) {
        return res.status(400).json({
            message: "name, email, department, and position are required"
        });
    }

    // Validate department
    const validDepartments = ['Front Desk', 'Billing', 'Management'];
    if (!validDepartments.includes(department)) {
        return res.status(400).json({
            message: "Department must be: Front Desk, Billing, or Management"
        });
    }

    // Validate status
    const validStatuses = ['Active', 'Inactive'];
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
            message: "Status must be: Active or Inactive"
        });
    }

    try {
        // Check if employee exists
        const [employee] = await db.execute(
            "SELECT user_id, employee_number FROM employees WHERE id = ?",
            [id]
        );

        if (employee.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const userId = employee[0].user_id;

        // Check if new employee_number conflicts with another employee
        if (employee_number && employee_number !== employee[0].employee_number) {
            const [duplicate] = await db.execute(
                "SELECT id FROM employees WHERE employee_number = ? AND id != ?",
                [employee_number, id]
            );

            if (duplicate.length > 0) {
                return res.status(400).json({
                    message: "Employee number already exists"
                });
            }
        }

        // Check if new email conflicts with another user
        const [emailCheck] = await db.execute(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            [email, userId]
        );

        if (emailCheck.length > 0) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        // Update user table
        await db.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            [name, email, userId]
        );

        // Update employee table
        const updateQuery = `
            UPDATE employees 
            SET employee_number = ?, name = ?, email = ?, phone = ?, 
                department = ?, position = ?, status = ?, hire_date = ?
            WHERE id = ?
        `;

        await db.execute(updateQuery, [
            employee_number || employee[0].employee_number,
            name,
            email,
            phone || null,
            department,
            position,
            status || 'Active',
            hire_date,
            id
        ]);

        res.json({
            message: "Employee updated successfully",
            employee: {
                id,
                name,
                email,
                department,
                position,
                status: status || 'Active'
            }
        });

        await logActivityHelper(
            req,
            "UPDATE_EMPLOYEE",
            `Updated employee ${name} (ID: ${id})`
        );

    } catch (err) {
        console.error("Update employee error:", err);
        res.status(500).json({ error: "Failed to update employee" });
    }
};

/**
 * DELETE EMPLOYEE (Admin only)
 */
exports.deleteEmployee = async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
    }

    try {
        // Check if employee exists
        const [employee] = await db.execute(
            "SELECT user_id, name, employee_number FROM employees WHERE id = ?",
            [id]
        );

        if (employee.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const userId = employee[0].user_id;
        const employeeName = employee[0].name;

        // Delete employee (this will cascade delete the user due to foreign key)
        await db.execute("DELETE FROM employees WHERE id = ?", [id]);

        // Also delete user account
        await db.execute("DELETE FROM users WHERE id = ?", [userId]);

        res.json({
            message: "Employee deleted successfully",
            employee: {
                id,
                name: employeeName
            }
        });

        await logActivityHelper(
            req,
            "DELETE_EMPLOYEE",
            `Deleted employee ${employeeName} (ID: ${id})`
        );

    } catch (err) {
        console.error("Delete employee error:", err);
        res.status(500).json({ error: "Failed to delete employee" });
    }
};



///////Employee only
/**
 * GET EMPLOYEE PROFILE (Current logged-in employee)
 */
exports.getProfile = async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [rows] = await db.execute(
            `SELECT 
                e.*,
                u.email as user_email,
                u.role_id
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.user_id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Employee profile not found" });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error("Get employee profile error:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};

/**
 * UPDATE EMPLOYEE PROFILE (Current logged-in employee)
 */
exports.updateProfile = async (req, res) => {
    const userId = req.session.user.id;
    const { phone } = req.body;

    try {
        // Get employee record
        const [employee] = await db.execute(
            "SELECT id FROM employees WHERE user_id = ?",
            [userId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ message: "Employee profile not found" });
        }

        // Update employee phone
        await db.execute(
            "UPDATE employees SET phone = ? WHERE user_id = ?",
            [phone || null, userId]
        );

        res.json({
            message: "Profile updated successfully"
        });

        await logActivityHelper(
            req,
            "UPDATE_PROFILE",
            "Updated personal profile information"
        );

    } catch (err) {
        console.error("Update employee profile error:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
};

/**
 * CHANGE PASSWORD (Current logged-in employee)
 */
exports.changePassword = async (req, res) => {
    const userId = req.session.user.id;
    const { current_password, new_password } = req.body;

    // Validation
    if (!current_password || !new_password) {
        return res.status(400).json({
            message: "Current password and new password are required"
        });
    }

    if (new_password.length < 6) {
        return res.status(400).json({
            message: "New password must be at least 6 characters"
        });
    }

    try {
        // Get user's current password
        const [user] = await db.execute(
            "SELECT password FROM users WHERE id = ?",
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Verify current password
        const isValid = await bcrypt.compare(current_password, user[0].password);
        if (!isValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await db.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, userId]
        );

        res.json({
            message: "Password changed successfully"
        });

        await logActivityHelper(
            req,
            "CHANGE_PASSWORD",
            "Changed account password"
        );

    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: "Failed to change password" });
    }
};