const db = require("../config/database");
const { logActivityHelper } = require("../middleware/activityMiddleware");

/**
 * Helper: Calculate total price based on dates
 */
function calculateTotalPrice(checkIn, checkOut, pricePerNight) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    return nights * pricePerNight;
}

/**
 * CREATE BOOKING (Customer creates their own)
 * UPDATED: Allows multiple bookings per room - only checks for date conflicts
 */
exports.createBooking = async (req, res) => {
    const userId = req.session.user.id;
    const {
        room_id,
        check_in,        
        check_out,       
        number_of_guests,
        adults,
        children
    } = req.body;

    // Validation
    if (!room_id || !check_in || !check_out || !number_of_guests) {
        return res.status(400).json({
            message: "room_id, check_in, check_out, and number_of_guests are required"
        });
    }

    // Validate adults and children
    if (adults === undefined || children === undefined) {
        return res.status(400).json({
            message: "adults and children are required"
        });
    }

    if (adults < 0 || children < 0) {
        return res.status(400).json({
            message: "adults and children cannot be negative"
        });
    }

    // Validate that adults + children = number_of_guests
    if (parseInt(adults) + parseInt(children) !== parseInt(number_of_guests)) {
        return res.status(400).json({
            message: "Number of adults + children must equal total number of guests"
        });
    }

    // Validate dates
    const checkIn = new Date(check_in);
    const checkOut = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
        return res.status(400).json({
            message: "Check-in date cannot be in the past"
        });
    }

    if (checkOut <= checkIn) {
        return res.status(400).json({
            message: "Check-out date must be after check-in date"
        });
    }

    // Validate number of guests (max 4 per room)
    if (number_of_guests < 1) {
        return res.status(400).json({
            message: "Number of guests must be at least 1"
        });
    }

    if (number_of_guests > 4) {
        return res.status(400).json({
            message: "Maximum 4 guests per room"
        });
    }

    const connection = await db.getConnection();

    try {
        // Start transaction
        await connection.beginTransaction();

        try {
            // Check if room exists
            const [room] = await connection.execute(
                "SELECT id, room_number, room_type, price_per_night, status FROM rooms WHERE id = ?",
                [room_id]
            );

            if (room.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: "Room not found" });
            }

            // UPDATED: Only check for overlapping bookings, NOT room status
            // This allows multiple bookings for the same room on different dates
            const [overlapping] = await connection.execute(
                `SELECT id, check_in, check_out FROM bookings 
                 WHERE room_id = ? 
                 AND status NOT IN ('cancelled', 'checked_out')
                 AND (
                     (check_in <= ? AND check_out > ?) OR
                     (check_in < ? AND check_out >= ?) OR
                     (check_in >= ? AND check_out <= ?)
                 )`,
                [room_id, check_in, check_in, check_out, check_out, check_in, check_out]
            );

            if (overlapping.length > 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: "Room is not available for the selected dates. Please choose different dates.",
                    conflicting_bookings: overlapping.map(b => ({
                        check_in: b.check_in,
                        check_out: b.check_out
                    }))
                });
            }

            // Check if user has customer details
            const [customerDetails] = await connection.execute(
                "SELECT id FROM customer_details WHERE user_id = ?",
                [userId]
            );

            if (customerDetails.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: "Please complete your customer details before booking"
                });
            }

            // Create booking
            const [result] = await connection.execute(
                `INSERT INTO bookings 
                (user_id, room_id, check_in, check_out, number_of_guests, adults, children, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [
                    userId,
                    room_id,
                    check_in,
                    check_out,
                    number_of_guests,
                    adults,
                    children
                ]
            );

            // UPDATED: Don't change room status on booking creation
            // Room status will be managed when booking is confirmed/checked-in

            // Commit transaction
            await connection.commit();

            // Calculate total price for response
            const totalPrice = calculateTotalPrice(check_in, check_out, room[0].price_per_night);

            res.status(201).json({
                message: "Booking created successfully",
                bookingId: result.insertId,
                booking: {
                    id: result.insertId,
                    room_number: room[0].room_number,
                    room_type: room[0].room_type,
                    check_in,
                    check_out,
                    number_of_guests,
                    adults,
                    children,
                    total_price: totalPrice,
                    status: "pending"
                }
            });

            await logActivityHelper(
                req,
                "CREATE_BOOKING",
                `Created booking for room ${room[0].room_number}`
            );

        } catch (err) {
            await connection.rollback();
            throw err;
        }

    } catch (err) {
        console.error("Create booking error:", err);
        res.status(500).json({ error: "Failed to create booking" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * GET OWN BOOKINGS (Customer views their own)
 */
exports.getMyBookings = async (req, res) => {
    const userId = req.session.user.id;

    try {
        // Optional status filter
        const status = req.query.status;
        
        let query = `
            SELECT 
                b.id,
                b.room_id,
                b.check_in,
                b.check_out,
                b.number_of_guests,
                b.adults,
                b.children,
                b.status,
                b.created_at,
                r.room_number,
                r.room_type,
                r.price_per_night
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.user_id = ?
        `;

        const params = [userId];

        if (status) {
            query += ` AND b.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY b.created_at DESC`;

        const [rows] = await db.execute(query, params);

        // Add calculated total_price to each booking
        const bookingsWithPrice = rows.map(booking => ({
            ...booking,
            total_price: calculateTotalPrice(booking.check_in, booking.check_out, booking.price_per_night)
        }));

        res.json({
            count: bookingsWithPrice.length,
            bookings: bookingsWithPrice
        });

    } catch (err) {
        console.error("Get my bookings error:", err);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
};

/**
 * GET SINGLE BOOKING BY ID (Customer views their own)
 */
exports.getMyBookingById = async (req, res) => {
    const userId = req.session.user.id;
    const { id } = req.params;

    // Validate booking ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
    }

    try {
        const [rows] = await db.execute(
            `SELECT 
                b.*,
                r.room_number,
                r.room_type,
                r.price_per_night,
                u.name as customer_name,
                u.email as customer_email,
                cd.phone as phone_number,
                cd.address,
                cd.national_id,
                p.payment_status,
                p.payment_method,
                p.paid_at,
                p.mpesa_receipt_number
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN customer_details cd ON b.user_id = cd.user_id
            LEFT JOIN payments p ON p.booking_id = b.id
            WHERE b.id = ? AND b.user_id = ?`,
            [id, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Add calculated total_price
        const booking = {
            ...rows[0],
            total_price: calculateTotalPrice(rows[0].check_in, rows[0].check_out, rows[0].price_per_night)
        };

        res.json(booking);

    } catch (err) {
        console.error("Get my booking by ID error:", err);
        res.status(500).json({ error: "Failed to fetch booking" });
    }
};

/**
 * CANCEL OWN BOOKING (Customer cancels their own)
 * UPDATED: Checks if there are other active bookings before changing room status
 */
exports.cancelMyBooking = async (req, res) => {
    const userId = req.session.user.id;
    const { id } = req.params;

    // Validate booking ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
    }

    const connection = await db.getConnection();

    try {
        // Start transaction
        await connection.beginTransaction();

        try {
            // Check if booking exists and belongs to user
            const [booking] = await connection.execute(
                `SELECT b.*, r.room_number 
                 FROM bookings b
                 JOIN rooms r ON b.room_id = r.id
                 WHERE b.id = ? AND b.user_id = ?`,
                [id, userId]
            );

            if (booking.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: "Booking not found" });
            }

            // Check if booking can be cancelled
            if (booking[0].status === "cancelled") {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: "Booking is already cancelled"
                });
            }

            if (booking[0].status === "checked_out") {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: "Cannot cancel completed booking"
                });
            }

            if (booking[0].status === "checked_in") {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: "Cannot cancel booking after check-in. Please contact staff."
                });
            }

            // Cancel booking
            await connection.execute(
                "UPDATE bookings SET status = 'cancelled' WHERE id = ?",
                [id]
            );

            // UPDATED: Check if there are other active bookings for this room
            const [otherBookings] = await connection.execute(
                `SELECT id, status FROM bookings 
                 WHERE room_id = ? 
                 AND id != ?
                 AND status NOT IN ('cancelled', 'checked_out')`,
                [booking[0].room_id, id]
            );

            // Update room status based on remaining bookings
            if (otherBookings.length === 0) {
                // No other bookings - set to Available
                await connection.execute(
                    "UPDATE rooms SET status = 'Available' WHERE id = ?",
                    [booking[0].room_id]
                );
            } else {
                // Check if any remaining booking is checked in
                const hasCheckedIn = otherBookings.some(b => b.status === 'checked_in');
                const newStatus = hasCheckedIn ? 'Occupied' : 'Available';
                
                await connection.execute(
                    "UPDATE rooms SET status = ? WHERE id = ?",
                    [newStatus, booking[0].room_id]
                );
            }

            // Commit transaction
            await connection.commit();

            res.json({
                message: "Booking cancelled successfully",
                booking: {
                    id: booking[0].id,
                    room_number: booking[0].room_number,
                    status: "cancelled"
                }
            });

            await logActivityHelper(
                req,
                "CANCEL_BOOKING",
                `Cancelled booking #${id} for room ${booking[0].room_number}`
            );

        } catch (err) {
            await connection.rollback();
            throw err;
        }

    } catch (err) {
        console.error("Cancel my booking error:", err);
        res.status(500).json({ error: "Failed to cancel booking" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * GET ALL BOOKINGS (Staff/Admin only)
 */
exports.getAllBookings = async (req, res) => {
    try {
        // Pagination - ensure proper integers
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 20;

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;

        const offset = (page - 1) * limit;

        // Filters
        const status = req.query.status;
        const roomId = req.query.room_id;
        const userId = req.query.user_id;
        const search = req.query.search;

        let query = `
            SELECT 
                b.id,
                b.user_id,
                b.room_id,
                b.check_in,
                b.check_out,
                b.number_of_guests,
                b.adults,
                b.children,
                b.status,
                b.created_at,
                r.room_number,
                r.room_type,
                r.price_per_night,
                u.name as user_name,
                u.email as user_email
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON b.user_id = u.id
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ` AND b.status = ?`;
            params.push(status);
        }

        if (roomId) {
            query += ` AND b.room_id = ?`;
            params.push(roomId);
        }

        if (userId) {
            query += ` AND b.user_id = ?`;
            params.push(userId);
        }

        if (search) {
            query += ` AND (u.name LIKE ? OR u.email LIKE ? OR r.room_number LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get total count
        const countQuery = query.replace(/SELECT[\s\S]+FROM/, "SELECT COUNT(*) as total FROM");
        const [countRows] = await db.execute(countQuery, params);
        const total = countRows[0]?.total || 0;

        // Get paginated results
        query += ` ORDER BY b.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        
        const [rows] = await db.execute(query, params);

        // Add calculated total_price to each booking
        const bookingsWithPrice = rows.map(booking => ({
            ...booking,
            total_price: calculateTotalPrice(booking.check_in, booking.check_out, booking.price_per_night),
            booking_status: booking.status,
            check_in_date: booking.check_in,
            check_out_date: booking.check_out
        }));

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: bookingsWithPrice
        });

    } catch (err) {
        console.error("Get all bookings error:", err);
        res.status(500).json({ error: "Failed to fetch bookings", details: err.message });
    }
};

/**
 * GET BOOKING BY ID (Staff/Admin only)
 */
exports.getBookingById = async (req, res) => {
    const { id } = req.params;

    // Validate booking ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
    }

    try {
        const [rows] = await db.execute(
            `SELECT 
                b.*,
                r.room_number,
                r.room_type,
                r.price_per_night,
                u.name as customer_name,
                u.email as customer_email,
                u.role_id,
                cd.phone as phone_number,
                cd.address,
                cd.national_id,
                p.payment_status,
                p.payment_method,
                p.paid_at,
                p.mpesa_receipt_number
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN customer_details cd ON b.user_id = cd.user_id
            LEFT JOIN payments p ON p.booking_id = b.id
            WHERE b.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Add calculated total_price
        const booking = {
            ...rows[0],
            total_price: calculateTotalPrice(rows[0].check_in, rows[0].check_out, rows[0].price_per_night)
        };

        res.json(booking);

    } catch (err) {
        console.error("Get booking by ID error:", err);
        res.status(500).json({ error: "Failed to fetch booking" });
    }
};

/**
 * UPDATE BOOKING STATUS (Staff/Admin only)
 * UPDATED: Updates room status based on all bookings, not just the current one
 */
exports.updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate booking ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Validate status
    const validStatuses = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            message: "Status must be: pending, confirmed, checked_in, checked_out, or cancelled"
        });
    }

    const connection = await db.getConnection();

    try {
        // Start transaction
        await connection.beginTransaction();

        try {
            // Check if booking exists
            const [booking] = await connection.execute(
                `SELECT b.*, r.room_number 
                 FROM bookings b
                 JOIN rooms r ON b.room_id = r.id
                 WHERE b.id = ?`,
                [id]
            );

            if (booking.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: "Booking not found" });
            }

            const oldStatus = booking[0].status;

            // Validate status transitions
            if (oldStatus === "checked_out" && status !== "checked_out") {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: "Cannot change status of completed booking"
                });
            }

            if (oldStatus === "cancelled" && status !== "cancelled") {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: "Cannot reactivate cancelled booking"
                });
            }

            // Update booking status
            await connection.execute(
                "UPDATE bookings SET status = ? WHERE id = ?",
                [status, id]
            );

            // UPDATED: Smart room status management
            // Check all active bookings for this room
            const [activeBookings] = await connection.execute(
                `SELECT id, status FROM bookings 
                 WHERE room_id = ? 
                 AND status NOT IN ('cancelled', 'checked_out')`,
                [booking[0].room_id]
            );

            // Determine room status based on all bookings
            let newRoomStatus = 'Available';
            
            if (activeBookings.length > 0) {
                // Check if any booking is currently checked in
                const hasCheckedIn = activeBookings.some(b => b.status === 'checked_in');
                newRoomStatus = hasCheckedIn ? 'Occupied' : 'Available';
            }

            await connection.execute(
                "UPDATE rooms SET status = ? WHERE id = ?",
                [newRoomStatus, booking[0].room_id]
            );

            // Commit transaction
            await connection.commit();

            res.json({
                message: "Booking status updated successfully",
                booking: {
                    id: booking[0].id,
                    room_number: booking[0].room_number,
                    old_status: oldStatus,
                    new_status: status
                }
            });

            await logActivityHelper(
                req,
                "UPDATE_BOOKING_STATUS",
                `Updated booking #${id} status from ${oldStatus} to ${status}`
            );

        } catch (err) {
            await connection.rollback();
            throw err;
        }

    } catch (err) {
        console.error("Update booking status error:", err);
        res.status(500).json({ error: "Failed to update booking status" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * UPDATE BOOKING DETAILS (Admin only)
 */
exports.updateBooking = async (req, res) => {
    const { id } = req.params;
    const {
        room_id,
        check_in,
        check_out,
        number_of_guests,
        adults,
        children
    } = req.body;

    // Validate booking ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Validation
    if (!room_id || !check_in || !check_out || !number_of_guests || adults === undefined || children === undefined) {
        return res.status(400).json({
            message: "room_id, check_in, check_out, number_of_guests, adults, and children are required"
        });
    }

    // Validate that adults + children = number_of_guests
    if (parseInt(adults) + parseInt(children) !== parseInt(number_of_guests)) {
        return res.status(400).json({
            message: "Number of adults + children must equal total number of guests"
        });
    }

    // Validate dates
    const checkIn = new Date(check_in);
    const checkOut = new Date(check_out);

    if (checkOut <= checkIn) {
        return res.status(400).json({
            message: "Check-out date must be after check-in date"
        });
    }

    // Validate number of guests (max 4)
    if (number_of_guests < 1) {
        return res.status(400).json({
            message: "Number of guests must be at least 1"
        });
    }

    if (number_of_guests > 4) {
        return res.status(400).json({
            message: "Maximum 4 guests per room"
        });
    }

    const connection = await db.getConnection();

    try {
        // Start transaction
        await connection.beginTransaction();

        try {
            // Check if booking exists
            const [booking] = await connection.execute(
                "SELECT * FROM bookings WHERE id = ?",
                [id]
            );

            if (booking.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: "Booking not found" });
            }

            // Don't allow editing completed or cancelled bookings
            if (booking[0].status === "checked_out" || booking[0].status === "cancelled") {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: `Cannot edit ${booking[0].status} booking`
                });
            }

            // Check if new room exists
            const [room] = await connection.execute(
                "SELECT id, room_number, price_per_night FROM rooms WHERE id = ?",
                [room_id]
            );

            if (room.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: "Room not found" });
            }

            // Check for overlapping bookings (exclude current booking)
            const [overlapping] = await connection.execute(
                `SELECT id FROM bookings 
                 WHERE room_id = ? 
                 AND id != ?
                 AND status NOT IN ('cancelled', 'checked_out')
                 AND (
                     (check_in <= ? AND check_out > ?) OR
                     (check_in < ? AND check_out >= ?) OR
                     (check_in >= ? AND check_out <= ?)
                 )`,
                [room_id, id, check_in, check_in, check_out, check_out, check_in, check_out]
            );

            if (overlapping.length > 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    message: "Room is not available for the selected dates"
                });
            }

            // Calculate total price for response
            const totalPrice = calculateTotalPrice(check_in, check_out, room[0].price_per_night);

            // Update booking
            await connection.execute(
                `UPDATE bookings 
                 SET room_id = ?, check_in = ?, check_out = ?, 
                     number_of_guests = ?, adults = ?, children = ?
                 WHERE id = ?`,
                [room_id, check_in, check_out, number_of_guests, adults, children, id]
            );

            // Commit transaction
            await connection.commit();

            res.json({
                message: "Booking updated successfully",
                booking: {
                    id,
                    room_number: room[0].room_number,
                    check_in,
                    check_out,
                    number_of_guests,
                    adults,
                    children,
                    total_price: totalPrice
                }
            });

            await logActivityHelper(
                req,
                "UPDATE_BOOKING",
                `Updated booking #${id} details`
            );

        } catch (err) {
            await connection.rollback();
            throw err;
        }

    } catch (err) {
        console.error("Update booking error:", err);
        res.status(500).json({ error: "Failed to update booking" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * DELETE BOOKING (Admin only)
 * UPDATED: Checks remaining bookings before updating room status
 */
exports.deleteBooking = async (req, res) => {
    const { id } = req.params;

    // Validate booking ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
    }

    const connection = await db.getConnection();

    try {
        // Start transaction
        await connection.beginTransaction();

        try {
            // Check if booking exists
            const [booking] = await connection.execute(
                `SELECT b.*, r.room_number 
                 FROM bookings b
                 JOIN rooms r ON b.room_id = r.id
                 WHERE b.id = ?`,
                [id]
            );

            if (booking.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: "Booking not found" });
            }

            // Delete booking
            await connection.execute(
                "DELETE FROM bookings WHERE id = ?",
                [id]
            );

            // UPDATED: Check if there are other active bookings
            const [otherBookings] = await connection.execute(
                `SELECT id, status FROM bookings 
                 WHERE room_id = ? 
                 AND status NOT IN ('cancelled', 'checked_out')`,
                [booking[0].room_id]
            );

            // Determine room status based on remaining bookings
            let newRoomStatus = 'Available';
            if (otherBookings.length > 0) {
                const hasCheckedIn = otherBookings.some(b => b.status === 'checked_in');
                newRoomStatus = hasCheckedIn ? 'Occupied' : 'Available';
            }

            await connection.execute(
                "UPDATE rooms SET status = ? WHERE id = ?",
                [newRoomStatus, booking[0].room_id]
            );

            // Commit transaction
            await connection.commit();

            res.json({
                message: "Booking deleted successfully",
                booking: {
                    id: booking[0].id,
                    room_number: booking[0].room_number
                }
            });

            await logActivityHelper(
                req,
                "DELETE_BOOKING",
                `Deleted booking #${id} for room ${booking[0].room_number}`
            );

        } catch (err) {
            await connection.rollback();
            throw err;
        }

    } catch (err) {
        console.error("Delete booking error:", err);
        res.status(500).json({ error: "Failed to delete booking" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * CHECK ROOM AVAILABILITY (Public/Authenticated)
 * UPDATED: Only checks date conflicts, not room status
 */
exports.checkAvailability = async (req, res) => {
    const { room_id, check_in, check_out } = req.query;

    // Validation
    if (!room_id || !check_in || !check_out) {
        return res.status(400).json({
            message: "room_id, check_in, and check_out are required"
        });
    }

    // Validate dates
    const checkIn = new Date(check_in);
    const checkOut = new(check_out);

    if (checkOut <= checkIn) {
        return res.status(400).json({
            message: "Check-out date must be after check-in date"
        });
    }

    try {
        // Check if room exists
        const [room] = await db.execute(
            "SELECT id, room_number, room_type, price_per_night, status FROM rooms WHERE id = ?",
            [room_id]
        );

        if (room.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        // Check for overlapping bookings
        const [overlapping] = await db.execute(
            `SELECT id, check_in, check_out, status 
             FROM bookings 
             WHERE room_id = ? 
             AND status NOT IN ('cancelled', 'checked_out')
             AND (
                 (check_in <= ? AND check_out > ?) OR
                 (check_in < ? AND check_out >= ?) OR
                 (check_in >= ? AND check_out <= ?)
             )`,
            [room_id, check_in, check_in, check_out, check_out, check_in, check_out]
        );

        // UPDATED: Availability is based ONLY on date conflicts, not room status
        const isAvailable = overlapping.length === 0;
        const totalPrice = isAvailable ? calculateTotalPrice(check_in, check_out, room[0].price_per_night) : null;

        res.json({
            room: {
                id: room[0].id,
                room_number: room[0].room_number,
                room_type: room[0].room_type,
                price_per_night: room[0].price_per_night,
                status: room[0].status
            },
            check_in,
            check_out,
            is_available: isAvailable,
            total_price: totalPrice,
            conflicting_bookings: overlapping.length
        });

    } catch (err) {
        console.error("Check availability error:", err);
        res.status(500).json({ error: "Failed to check availability" });
    }
};