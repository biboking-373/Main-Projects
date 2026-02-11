const express = require("express")
const router = express.Router();

const Productcontroller = require("../controller/ProductController");

router.post("/product-mine", Productcontroller.addProduct);


module.exports = router;