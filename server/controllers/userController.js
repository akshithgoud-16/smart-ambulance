const User = require("../models/User");
const Booking = require("../models/Booking");

// ✅ Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-hash -salt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
};

// ✅ Get user's booking history
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("driver", "username email phoneNumber") // added phoneNumber for completeness
      .sort({ timestamp: -1 }); // newest first

    res.json(bookings);
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

// ✅ Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { username, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username, email },
      { new: true, runValidators: true }
    ).select("-hash -salt");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Error updating user profile:", err);
    res.status(500).json({ message: "Failed to update user profile" });
  }
};

// ✅ Cancel a pending booking
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!booking) {
      return res
        .status(404)
        .json({ message: "Booking not found or unauthorized" });
    }

    if (booking.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending bookings can be cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};

module.exports = {
  getUserProfile,
  getUserBookings,
  updateUserProfile,
  cancelBooking,
};
