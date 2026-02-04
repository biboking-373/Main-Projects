const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);  // NEW
router.post("/reset-password", authController.resetPassword);    // NEW

// Protected routes
router.post("/logout", isAuthenticated, authController.logout);
router.get("/me", isAuthenticated, authController.getCurrentUser);
router.post("/change-password", isAuthenticated, authController.changePassword); // NEW

module.exports = router;