const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database connected");
    } catch (err) {
        console.error ("You the database has given up", err.message);
        process.exit(1);
    }
};

module.exports = connectDb