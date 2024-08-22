const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const verifyGoogleToken = require("../middlewares/verifyGoogleToken");

router.post('/login', verifyGoogleToken, AuthController.login)

module.exports = router