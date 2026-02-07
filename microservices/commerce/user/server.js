require("dotenv").config();
const express = require("express");
const UserRoutes = require("./router/User-Routes");


const app = express();
app.use(express.json());

app.use("/user", UserRoutes);


const Port = process.env.PORT || 4870;
app.listen(Port, () => {
    console.log(`Server is alive on Port ${Port}`);
    console.log("Let's start the microservice");
});


