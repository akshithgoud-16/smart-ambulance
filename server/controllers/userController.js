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

// ✅ Update user profile (shared across roles)
const updateUserProfile = async (req, res) => {
  try {
    const {
      username,
      email,
      displayName,
      dob,
      station,
      area,
      pincode,
      vehicleNumber,
      profilePhoto,
      currentLocation,
    } = req.body;

    const updates = {};

    if (typeof username === "string" && username.trim()) {
      updates.username = username.trim();
    }
    if (typeof email === "string" && email.trim()) {
      updates.email = email.trim();
    }
    if (typeof displayName === "string") {
      updates.displayName = displayName.trim();
    }
    if (typeof station === "string") {
      updates.station = station.trim();
    }
    if (typeof area === "string") {
      updates.area = area.trim();
    }
    if (typeof pincode === "string") {
      updates.pincode = pincode.trim();
    }
    if (typeof vehicleNumber === "string") {
      updates.vehicleNumber = vehicleNumber.trim();
    }
    if (profilePhoto !== undefined) {
      updates.profilePhoto = profilePhoto;
    }

    if (dob) {
      const parsedDob = new Date(dob);
      if (Number.isNaN(parsedDob.getTime())) {
        return res.status(400).json({ message: "Invalid date of birth" });
      }
      updates.dob = parsedDob;
    }

    if (currentLocation) {
      const { lat, lng, label } = currentLocation;
      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ message: "Invalid location coordinates" });
      }
      updates.currentLocation = {
        lat,
        lng,
        label: typeof label === "string" ? label.trim() : undefined,
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-hash -salt");

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
