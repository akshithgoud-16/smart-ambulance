const express = require("express");
const {
  sendSignupOtp,
  verifySignupOtp,
  setSignupPassword,
  login,
  forgotPassword,
  resetPassword,
  logout,
} = require("../controllers/authController");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// Signup flows
router.post("/signup/send-otp", sendSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);
router.post("/signup/set-password", setSignupPassword);

// Login
router.post("/login", login);

// Logout
router.post("/logout", isAuthenticated, logout);

// Forgot / reset password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
