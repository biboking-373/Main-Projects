const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../config/database");
const { logActivityHelper } = require("../middleware/activityMiddleware");
const { sendWelcomeEmail, sendPasswordResetEmail } = require("../config/email");

/**
 * REGISTER - Create new user account
 */
exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
        return res.status(400).json({ 
            message: "Password must be at least 8 characters" 
        });
    }

    try {
        const [existing] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            `INSERT INTO users (name, email, password_hash, role_id)
            VALUES (?, ?, ?, ?)`,
            [name, email, hashedPassword, 1]
        );

        // Send welcome email (non-blocking)
        sendWelcomeEmail(email, name).catch(err => {
            console.error("Failed to send welcome email:", err);
            // Don't fail registration if email fails
        });

        res.status(201).json({ 
            message: "Account created successfully",
            userId: result.insertId 
        });

        await logActivityHelper(req, "REGISTER", `New user registered: ${email}`);

    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: "Registration failed" });
    }
};

/**
 * LOGIN - Authenticate user and create session
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role_id: user.role_id
        };

        // ADD THIS RESPONSE! ✅
        res.json({ 
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role_id: user.role_id
            }
        });

        await logActivityHelper(req, "LOGIN", `User logged in: ${email}`);

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Login failed" });
    }
};

/**
 * LOGOUT - Destroy user session
 */
exports.logout = async (req, res) => {
    const userEmail = req.session?.user?.email;

    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ error: "Logout failed" });
        }
        
        res.json({ message: "Logged out successfully" });
    });

    // Log activity (do this after response since session is destroyed)
    if (userEmail) {
        try {
            await db.execute(
                `INSERT INTO activity_logs 
                (user_id, action, description, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)`,
                [null, "LOGOUT", `User logged out: ${userEmail}`, req.ip, req.headers["user-agent"]]
            );
        } catch (err) {
            console.error("Activity log error:", err);
        }
    }
};

/**
 * GET CURRENT USER - Get session info
 */
exports.getCurrentUser = (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    res.json({ user: req.session.user });
};

/**
 * FORGOT PASSWORD - Generate reset token and send email
 */
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const [rows] = await db.execute(
            "SELECT id, name, email FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            // Don't reveal if email exists (security best practice)
            return res.json({ 
                message: "If that email exists, a password reset link has been sent" 
            });
        }

        const user = rows[0];

        // Generate random token
        const resetToken = crypto.randomBytes(32).toString("hex");
        
        // Hash it before storing
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Expires in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Store hashed token in database
        await db.execute(
            `UPDATE users 
             SET reset_token = ?, reset_token_expires = ? 
             WHERE id = ?`,
            [hashedToken, expiresAt, user.id]
        );

        // Send email with unhashed token
        await sendPasswordResetEmail(user.email, user.name, resetToken);

        res.json({ 
            message: "If that email exists, a password reset link has been sent" 
        });

        await logActivityHelper(req, "PASSWORD_RESET_REQUEST", `Password reset requested for: ${email}`);

    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ error: "Failed to process request" });
    }
};

/**
 * RESET PASSWORD - Verify token and update password
 */
exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ 
            message: "Token and new password are required" 
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ 
            message: "Password must be at least 8 characters" 
        });
    }

    try {
        // Hash the token to compare with database
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find user with valid token
        const [rows] = await db.execute(
            `SELECT id, name, email 
             FROM users 
             WHERE reset_token = ? 
             AND reset_token_expires > NOW()`,
            [hashedToken]
        );

        if (rows.length === 0) {
            return res.status(400).json({ 
                message: "Invalid or expired reset token" 
            });
        }

        const user = rows[0];

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await db.execute(
            `UPDATE users 
             SET password_hash = ?, 
                 reset_token = NULL, 
                 reset_token_expires = NULL 
             WHERE id = ?`,
            [hashedPassword, user.id]
        );

        res.json({ 
            message: "Password successfully reset. You can now login with your new password." 
        });

        await logActivityHelper(req, "PASSWORD_RESET_SUCCESS", `Password reset completed for: ${user.email}`);

    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ error: "Failed to reset password" });
    }
};

/**
 * CHANGE PASSWORD - For logged-in users
 */
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
            message: "Current password and new password are required" 
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ 
            message: "New password must be at least 8 characters" 
        });
    }

    if (!req.session.user) {
        return res.status(401).json({ message: "Login required" });
    }

    try {
        const userId = req.session.user.id;

        const [rows] = await db.execute(
            "SELECT password_hash FROM users WHERE id = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = rows[0];

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ 
                message: "Current password is incorrect" 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [hashedPassword, userId]
        );

        res.json({ 
            message: "Password changed successfully" 
        });

        await logActivityHelper(req, "PASSWORD_CHANGE", `Password changed for user ID: ${userId}`);

    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: "Failed to change password" });
    }
};