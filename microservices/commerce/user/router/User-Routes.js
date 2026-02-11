const express = require("express");
const router = express.Router();

const userController = require("../controller/User-Controller");


router.post("/create-user", userController.createUser);
router.get("/user-me", userController.getUser);
module.exports = router;