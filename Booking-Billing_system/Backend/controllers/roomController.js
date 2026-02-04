const db = require("../config/database");
const { logActivityHelper } = require("../middleware/activityMiddleware");
const path = require('path');
const fs = require('fs');

/**
 * ADD ROOM (Admin only) - WITH MULTIPLE IMAGE UPLOAD
 */
exports.addRoom = async (req, res) => {
    const { room_number, room_type, price_per_night, status, floor_number } = req.body;

    // Input validation
    if (!room_number || !room_type || !price_per_night) {
        return res.status(400).json({ 
            message: "room_number, room_type, and price_per_night are required" 
        });
    }

    // Validate price
    if (price_per_night <= 0) {
        return res.status(400).json({ message: "Price must be greater than 0" });
    }

    // Validate status - use capitalized values to match frontend
    const validStatuses = ["Available", "Occupied", "Maintenance"];
    const roomStatus = status || "Available";
    if (!validStatuses.includes(roomStatus)) {
        return res.status(400).json({ 
            message: "Status must be: Available, Occupied, or Maintenance" 
        });
    }

    try {
        // Check for duplicate room number
        const [existing] = await db.execute(
            "SELECT id FROM rooms WHERE room_number = ?",
            [room_number]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                message: `Room number ${room_number} already exists` 
            });
        }

        // Handle multiple image uploads
        let imagesArray = [];
        if (req.files && req.files.length > 0) {
            imagesArray = req.files.map(file => `/uploads/rooms/${file.filename}`);
        }
        const imagesJson = imagesArray.length > 0 ? JSON.stringify(imagesArray) : null;

        const [result] = await db.execute(
            `INSERT INTO rooms (room_number, room_type, price_per_night, status, images)
             VALUES (?, ?, ?, ?, ?)`,
            [room_number, room_type, price_per_night, roomStatus || 1, imagesJson]
        );

        res.status(201).json({ 
            message: "Room added successfully",
            roomId: result.insertId,
            images: imagesArray,
            imageCount: imagesArray.length
        });

        await logActivityHelper(
            req, 
            "ADD_ROOM", 
            `Added room ${room_number} (${room_type}) with ${imagesArray.length} images`
        );

    } catch (err) {
        // If there's an error and files were uploaded, delete them
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlink(file.path, (unlinkErr) => {
                    if (unlinkErr) console.error("Error deleting file:", unlinkErr);
                });
            });
        }
        
        console.error("Add room error:", err);
        res.status(500).json({ error: "Failed to add room" });
    }
};

/**
 * UPDATE ROOM (Admin only) - WITH MULTIPLE IMAGE UPLOAD
 */
exports.updateRoom = async (req, res) => {
    const { id } = req.params;
    const { room_number, room_type, price_per_night, status, floor_number, keep_images } = req.body;

    // Input validation
    if (!room_number || !room_type || !price_per_night || !status) {
        return res.status(400).json({ 
            message: "All fields (room_number, room_type, price_per_night, status) are required" 
        });
    }

    // Validate ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
    }

    // Validate price
    if (price_per_night <= 0) {
        return res.status(400).json({ message: "Price must be greater than 0" });
    }

    // Validate status
    const validStatuses = ["Available", "Occupied", "Maintenance"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            message: "Status must be: Available, Occupied, or Maintenance" 
        });
    }

    try {
        // Check if room exists
        const [existing] = await db.execute(
            "SELECT id, room_number, images FROM rooms WHERE id = ?",
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        const oldImagesJson = existing[0].images;
        let oldImagesArray = [];
        if (oldImagesJson) {
            try {
                oldImagesArray = JSON.parse(oldImagesJson);
            } catch (e) {
                oldImagesArray = [];
            }
        }

        // Check if new room_number conflicts with another room
        const [duplicate] = await db.execute(
            "SELECT id FROM rooms WHERE room_number = ? AND id != ?",
            [room_number, id]
        );

        if (duplicate.length > 0) {
            return res.status(400).json({ 
                message: `Room number ${room_number} is already used by another room` 
            });
        }

        // Handle image updates
        let finalImagesArray = [];
        
        // If keep_images is true and it's a JSON string, parse it
        if (keep_images) {
            try {
                const keepImagesArray = typeof keep_images === 'string' ? JSON.parse(keep_images) : keep_images;
                if (Array.isArray(keepImagesArray)) {
                    finalImagesArray = keepImagesArray;
                }
            } catch (e) {
                console.error("Error parsing keep_images:", e);
            }
        }

        // Add new uploaded images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/rooms/${file.filename}`);
            finalImagesArray = [...finalImagesArray, ...newImages];
        }

        // Delete images that are no longer in the list
        oldImagesArray.forEach(oldImage => {
            if (!finalImagesArray.includes(oldImage)) {
                const imagePath = path.join(__dirname, '..', oldImage);
                fs.unlink(imagePath, (err) => {
                    if (err) console.error("Error deleting old image:", err);
                });
            }
        });

        const imagesJson = finalImagesArray.length > 0 ? JSON.stringify(finalImagesArray) : null;

        const [result] = await db.execute(
            `UPDATE rooms
             SET room_number = ?, room_type = ?, price_per_night = ?, status = ?, floor_number = ?, images = ?
             WHERE id = ?`,
            [room_number, room_type, price_per_night, status, floor_number || 1, imagesJson, id]
        );

        res.json({ 
            message: "Room updated successfully",
            affectedRows: result.affectedRows,
            images: finalImagesArray,
            imageCount: finalImagesArray.length
        });

        await logActivityHelper(
            req, 
            "UPDATE_ROOM", 
            `Updated room ${room_number} (ID: ${id}) - ${finalImagesArray.length} images`
        );

    } catch (err) {
        // If there's an error and new files were uploaded, delete them
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlink(file.path, (unlinkErr) => {
                    if (unlinkErr) console.error("Error deleting file:", unlinkErr);
                });
            });
        }
        
        console.error("Update room error:", err);
        res.status(500).json({ error: "Failed to update room" });
    }
};

/**
 * DELETE ROOM (Admin only) - DELETE ALL IMAGES TOO
 */
exports.deleteRoom = async (req, res) => {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
    }

    try {
        // Check if room exists first
        const [existing] = await db.execute(
            "SELECT room_number, images FROM rooms WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        const roomNumber = existing[0].room_number;
        const imagesJson = existing[0].images;

        const [result] = await db.execute(
            "DELETE FROM rooms WHERE id = ?",
            [id]
        );

        // Delete all image files if they exist
        if (imagesJson) {
            try {
                const imagesArray = JSON.parse(imagesJson);
                imagesArray.forEach(imageUrl => {
                    const imagePath = path.join(__dirname, '..', imageUrl);
                    fs.unlink(imagePath, (err) => {
                        if (err) console.error("Error deleting image:", err);
                    });
                });
            } catch (e) {
                console.error("Error parsing images JSON:", e);
            }
        }

        res.json({ 
            message: "Room deleted successfully",
            deletedRoom: roomNumber
        });

        await logActivityHelper(
            req, 
            "DELETE_ROOM", 
            `Deleted room ${roomNumber} (ID: ${id})`
        );

    } catch (err) {
        console.error("Delete room error:", err);
        
        // Handle foreign key constraint errors
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(400).json({ 
                error: "Cannot delete room with existing bookings" 
            });
        }
        
        res.status(500).json({ error: "Failed to delete room" });
    }
};

/**
 * DELETE SINGLE IMAGE FROM ROOM
 */
exports.deleteRoomImage = async (req, res) => {
    const { id } = req.params;
    const { image_url } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
    }

    if (!image_url) {
        return res.status(400).json({ message: "image_url is required" });
    }

    try {
        const [existing] = await db.execute(
            "SELECT images FROM rooms WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        const imagesJson = existing[0].images;
        if (!imagesJson) {
            return res.status(404).json({ message: "No images found for this room" });
        }

        let imagesArray = JSON.parse(imagesJson);
        
        // Check if image exists in array
        if (!imagesArray.includes(image_url)) {
            return res.status(404).json({ message: "Image not found in room" });
        }

        // Remove image from array
        imagesArray = imagesArray.filter(img => img !== image_url);

        // Update database
        const newImagesJson = imagesArray.length > 0 ? JSON.stringify(imagesArray) : null;
        await db.execute(
            "UPDATE rooms SET images = ? WHERE id = ?",
            [newImagesJson, id]
        );

        // Delete physical file
        const imagePath = path.join(__dirname, '..', image_url);
        fs.unlink(imagePath, (err) => {
            if (err) console.error("Error deleting image file:", err);
        });

        res.json({
            message: "Image deleted successfully",
            remainingImages: imagesArray
        });

        await logActivityHelper(
            req,
            "DELETE_ROOM_IMAGE",
            `Deleted image from room ID: ${id}`
        );

    } catch (err) {
        console.error("Delete room image error:", err);
        res.status(500).json({ error: "Failed to delete image" });
    }
};

/**
 * GET ALL ROOMS (Authenticated users)
 */
exports.getAllRooms = async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM rooms ORDER BY room_number ASC"
        );

        // Parse images JSON for each room
        const roomsWithImages = rows.map(room => ({
            ...room,
            images: room.images ? JSON.parse(room.images) : []
        }));

        res.json(roomsWithImages);

    } catch (err) {
        console.error("Get rooms error:", err);
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
};

/**
 * GET SINGLE ROOM (Authenticated users)
 */
exports.getRoomById = async (req, res) => {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
    }

    try {
        const [rows] = await db.execute(
            "SELECT * FROM rooms WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        const room = {
            ...rows[0],
            images: rows[0].images ? JSON.parse(rows[0].images) : []
        };

        res.json(room);

    } catch (err) {
        console.error("Get room error:", err);
        res.status(500).json({ error: "Failed to fetch room" });
    }
};