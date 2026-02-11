const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim : true
    },

    description: {
        type: String,
    },

    price: {
        type: Number,
        required: true,
    },

    currency: {
        type: String,
        default: "KES",
    },

    userId: {
        type: Number,
        required: true,
        index: true,
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model("Product", productSchema);