const express = require("express");
const router = express.Router();
const { isAuthenticated, isDriver } = require("../middleware/authMiddleware");
const {
  setDriverDutyStatus,
  getUserProfile,
  getUserBookings,
  updateUserProfile,
  cancelBooking,
} = require("../controllers/userController");

// GET /api/users/profile - Get user profile
router.get("/profile", isAuthenticated, getUserProfile);

// PUT /api/users/duty - Set driver duty toggle
router.put("/duty", isAuthenticated, isDriver, setDriverDutyStatus);

// GET /api/users/bookings - Get user's booking history
router.get("/bookings", isAuthenticated, getUserBookings);

// PUT /api/users/profile - Update user profile
router.put("/profile", isAuthenticated, updateUserProfile);

// PUT /api/users/bookings/:id/cancel - Cancel a booking
router.put("/bookings/:id/cancel", isAuthenticated, cancelBooking);

module.exports = router;

