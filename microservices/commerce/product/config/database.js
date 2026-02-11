const mongoose = require("mongoose");
mongoose.set("strictQuery", false);


const databaseConnect = async() => {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("The database connection is established");
    } catch(err) {
        console.error("The database connection is lost", err);
        process.exit(1)
    }
};

module.exports = databaseConnect;