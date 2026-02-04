const express = require("express");
const router = express.Router();

const activityController = require("../controllers/activityController");
const { isAuthenticated, isAdmin } = require("../middleware/roomMiddleware");

// Admin: view all logs (with pagination support)
router.get(
    "/all",
    isAuthenticated,
    isAdmin,
    activityController.getAllActivities
);

// Admin: view specific user's logs
router.get(
    "/user/:userId",
    isAuthenticated,
    isAdmin,
    activityController.getActivitiesByUserId
);

// User: view own logs
router.get(
    "/me",
    isAuthenticated,
    activityController.getMyActivities
);

module.exports = router;