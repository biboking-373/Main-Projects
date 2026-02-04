const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const roomController = require("../controllers/roomController");
const { isAuthenticated, isAdmin, isStaff } = require("../middleware/roomMiddleware");

// Add room with multiple images (up to 10)
router.post('/', 
    isAuthenticated, 
    isAdmin, 
    upload.array('images', 10),
    roomController.addRoom
);

// Update room with multiple images
router.put('/:id', 
    isAuthenticated, 
    isAdmin, 
    upload.array('images', 10),
    roomController.updateRoom
);

// Delete single image from room
router.delete('/:id/image',
    isAuthenticated,
    isAdmin,
    roomController.deleteRoomImage
);

// Get all rooms
router.get('/', isAuthenticated, roomController.getAllRooms);

// Get room by ID
router.get('/:id', isAuthenticated, roomController.getRoomById);

// Delete room
router.delete('/:id', isAuthenticated, isAdmin, roomController.deleteRoom);

module.exports = router;