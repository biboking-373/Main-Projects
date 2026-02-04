const nodemailer = require("nodemailer");

/**
 * Create email transporter
 * Uses Mailtrap for development/testing
 */
const createTransporter = () => {
    console.log("📧 Creating email transporter...");
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST || "sandbox.smtp.mailtrap.io",
        port: process.env.MAIL_PORT || 2525,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
};

/**
 * Send welcome email after registration
 */
const sendWelcomeEmail = async (userEmail, userName) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.MAIL_FROM || '"Hotel Booking System" <noreply@hotel.com>',
        to: userEmail,
        subject: "Welcome to Sunside Guest House!",
        text: `Hi ${userName},\n\nThank you for registering with our system. We're excited to have you on board!\n\nYou can now browse available rooms and make bookings.\n\nBest regards,\nThe Sunside Guest House Team`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Our Hotel! 🏨</h2>
                <p>Hi <strong>${userName}</strong>,</p>
                <p>Thank you for registering with our hotel booking system. We're excited to have you on board!</p>
                <p>You can now browse available rooms and make bookings.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    If you didn't create this account, please contact our support team.
                </p>
                <p style="color: #333;">Best regards,<br><strong>The Hotel Team</strong></p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Welcome email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error sending welcome email:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Send login notification email
 */


/**
 * Send booking confirmation email
 */
const sendBookingConfirmation = async (userEmail, userName, bookingDetails) => {
    const transporter = createTransporter();

    const { bookingId, roomName, checkIn, checkOut, totalAmount } = bookingDetails;

    const mailOptions = {
        from: process.env.MAIL_FROM || '"Hotel Booking System" <noreply@hotel.com>',
        to: userEmail,
        subject: `Booking Confirmation - #${bookingId}`,
        text: `Hi ${userName},\n\nYour booking has been confirmed!\n\nBooking ID: ${bookingId}\nRoom: ${roomName}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nTotal Amount: $${totalAmount}\n\nWe look forward to welcoming you!\n\nBest regards,\nThe Hotel Team`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">Booking Confirmed! ✅</h2>
                <p>Hi <strong>${userName}</strong>,</p>
                <p>Your booking has been confirmed! Here are the details:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 15px 0;">
                    <p style="margin: 8px 0;"><strong>Booking ID:</strong> #${bookingId}</p>
                    <p style="margin: 8px 0;"><strong>Room:</strong> ${roomName}</p>
                    <p style="margin: 8px 0;"><strong>Check-in:</strong> ${checkIn}</p>
                    <p style="margin: 8px 0;"><strong>Check-out:</strong> ${checkOut}</p>
                    <p style="margin: 8px 0; color: #28a745; font-size: 18px;">
                        <strong>Total Amount:</strong> $${totalAmount}
                    </p>
                </div>
                <p>We look forward to welcoming you! 🏨</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #333;">Best regards,<br><strong>The Hotel Team</strong></p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Booking confirmation sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error sending booking confirmation:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Send password reset email (for future implementation)
 */
const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
    const transporter = createTransporter();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: process.env.MAIL_FROM || '"Hotel Booking System" <noreply@hotel.com>',
        to: userEmail,
        subject: "Password Reset Request",
        text: `Hi ${userName},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe Hotel Team`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request 🔑</h2>
                <p>Hi <strong>${userName}</strong>,</p>
                <p>You requested a password reset. Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background: #007bff; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Or copy and paste this link: <br>
                    <a href="${resetUrl}">${resetUrl}</a>
                </p>
                <p style="color: #d9534f;">
                    <strong>This link will expire in 1 hour.</strong>
                </p>
                <p style="color: #666; font-size: 12px;">
                    If you didn't request this, please ignore this email.
                </p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #333;">Best regards,<br><strong>The Hotel Team</strong></p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Password reset email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error sending password reset email:", error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendWelcomeEmail,
    sendBookingConfirmation,
    sendPasswordResetEmail
};