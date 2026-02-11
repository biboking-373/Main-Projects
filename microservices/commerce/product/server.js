require("dotenv").config();
const express = require("express");
const connectDB = require("./config/database")
const Productrouter = require("./router/ProductRoute");
const app = express();
app.use(express.json());

connectDB();

app.use("/product", Productrouter);

const Port = process.env.PORT || 1012

app.listen(Port, () => {
    console.log(`The server is running on port ${Port}`)
})