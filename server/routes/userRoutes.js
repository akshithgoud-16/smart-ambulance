const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  getUserBookings,
  updateUserProfile,
  cancelBooking,
} = require("../controllers/userController");

// GET /api/users/profile - Get user profile
router.get("/profile", isAuthenticated, getUserProfile);

// GET /api/users/bookings - Get user's booking history
router.get("/bookings", isAuthenticated, getUserBookings);

// PUT /api/users/profile - Update user profile
router.put("/profile", isAuthenticated, updateUserProfile);

// PUT /api/users/bookings/:id/cancel - Cancel a booking
router.put("/bookings/:id/cancel", isAuthenticated, cancelBooking);

module.exports = router;

