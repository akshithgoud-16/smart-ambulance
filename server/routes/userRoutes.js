const express = require("express");
const router = express.Router();
const User = require("../models/User");
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

// PUT /api/users/driver/location - Update driver location
router.put("/driver/location", isAuthenticated, isDriver, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        currentLocation: {
          lat,
          lng,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    ).select("-password -resetPasswordToken -resetPasswordExpire");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Location updated successfully", user });
  } catch (err) {
    console.error("Error updating driver location:", err);
    res.status(500).json({ message: "Failed to update location" });
  }
});

// PUT /api/users/duty - Set driver duty toggle
router.put("/duty", isAuthenticated, isDriver, setDriverDutyStatus);

// GET /api/users/bookings - Get user's booking history
router.get("/bookings", isAuthenticated, getUserBookings);

// PUT /api/users/profile - Update user profile
router.put("/profile", isAuthenticated, updateUserProfile);

// PUT /api/users/bookings/:id/cancel - Cancel a booking
router.put("/bookings/:id/cancel", isAuthenticated, cancelBooking);

module.exports = router;

