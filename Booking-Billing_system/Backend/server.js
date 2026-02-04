require("dotenv").config();
const express = require("express");
const path = require("path")
const session = require("express-session");
const http = require("http");
const cors = require("cors");

const dbPool = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoute");
const activityRoutes = require("./routes/activityRoute");
const bookingRoutes = require("./routes/bookingRoute");
const customerdetailRoutes = require("./routes/customerdetailRoute");
const paymentRoutes = require("./routes/paymentRoute");
const mpesaRoutes = require("./routes/mpesaRoutes");
const { adminRouter, employeeRouter } = require("./routes/adminaddRoute");

const app = express();

/* ===========================
   CORS CONFIGURATION
   =========================== */
app.use(cors({
    origin: 'http://localhost:5173',  // ← ADD THIS (Svelte dev server)
    credentials: true,

    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
}));


/* ===========================
   BODY PARSERS
   =========================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/* ===========================
   SESSIONS
   =========================== */
app.use(session({
    name: "hotel_session",
    secret: process.env.SESSION_SECRET,
    resave: true,  
    saveUninitialized: true,  
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
        sameSite: 'lax',
        secure: false
    }
}));


/* ===========================
   ROUTES
   =========================== */
app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/activities", activityRoutes);
app.use("/bookings", bookingRoutes);
app.use("/customer-details", customerdetailRoutes);
app.use("/payment", paymentRoutes);
app.use("/mpesa", mpesaRoutes);
app.use("/admin/employees", adminRouter);
app.use("/employee/employees", employeeRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ===========================
   START SERVER
   =========================== */
const PORT = process.env.PORT || 3130;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ CORS enabled for frontend origins`);
});

/* ===========================
   GRACEFUL SHUTDOWN
   =========================== */
const gracefulShutdown = async () => {
    console.log("\nShutting down server...");

    try {
        await dbPool.end(); // Close MySQL pool
        console.log("Database connections closed.");
    } catch (err) {
        console.error("Error closing DB pool:", err);
    }

    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
};

// OS signals
process.removeAllListeners('SIGINT');
process.removeAllListeners('SIGTERM');
process.on("SIGINT", gracefulShutdown);   // Ctrl + C
process.on("SIGTERM", gracefulShutdown);  // Docker / PM2 / server stop
