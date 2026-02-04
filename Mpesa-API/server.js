require("dotenv").config();
const express = require("express");
const app = express();
const connectdb = require("./config/DBase");

connectdb();
app.use(express.json());

// Import routes
const mpesaRoutes = require("./router/mpesa");

// Use routes
app.use("/api/mpesa", mpesaRoutes);

const Port = 6780;

app.listen(Port, () => {
    console.log(`Server is opened at port ${Port}`);
});
