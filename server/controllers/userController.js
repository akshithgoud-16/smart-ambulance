const User = require("../models/User");
const Booking = require("../models/Booking");

// ✅ Set driver duty status
const setDriverDutyStatus = async (req, res) => {
  try {
    const { onDuty } = req.body;
    if (typeof onDuty !== "boolean") {
      return res.status(400).json({ message: "onDuty must be boolean" });
    }

    // If trying to go on duty, check if mobile number is provided
    if (onDuty) {
      const user = await User.findById(req.user._id);
      if (!user || !user.mobile || user.mobile.trim() === "") {
        return res.status(400).json({ message: "Mobile number is required to go on duty" });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { onDuty },
      { new: true, runValidators: true }
    ).select("-password -resetPasswordToken -resetPasswordExpire");

    if (!user) return res.status(404).json({ message: "User not found" });

    // keep session in sync for this request lifecycle
    req.user.onDuty = onDuty;

    res.json({ message: onDuty ? "Driver is now on duty" : "Driver is off duty", user });
  } catch (err) {
    console.error("Error updating duty status:", err);
    res.status(500).json({ message: "Failed to update duty status" });
  }
};

// ✅ Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -resetPasswordToken -resetPasswordExpire"
    );
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
      .populate("driver", "username mobile vehicleNumber") // added mobile and vehicleNumber for completeness
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
      name,
      mobile,
      mobileNumber,
      dob,
      dateOfBirth,
      bloodGroup,
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
      // map to strict field
      updates.name = displayName.trim();
    }
    if (typeof name === "string") {
      updates.name = name.trim();
      // keep displayName in sync
      updates.displayName = name.trim();
    }
    if (typeof mobile === "string") {
      updates.mobile = mobile.trim();
      // map to strict field
      updates.mobileNumber = mobile.trim();
    }
    if (typeof mobileNumber === "string") {
      updates.mobileNumber = mobileNumber.trim();
      // keep legacy in sync
      updates.mobile = mobileNumber.trim();
    }
    if (typeof bloodGroup === "string") {
      updates.bloodGroup = bloodGroup.trim();
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

    const dobInput = dateOfBirth ?? dob;
    if (dobInput) {
      const parsedDob = new Date(dobInput);
      if (Number.isNaN(parsedDob.getTime())) {
        return res.status(400).json({ message: "Invalid date of birth" });
      }
      // set both fields
      updates.dob = parsedDob;
      updates.dateOfBirth = parsedDob;
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
    }).select("-password -resetPasswordToken -resetPasswordExpire");

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
  setDriverDutyStatus,
  getUserProfile,
  getUserBookings,
  updateUserProfile,
  cancelBooking,
};
