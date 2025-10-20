const Booking = require("../models/Booking");

// Get all accepted bookings (for police dashboard)
const getAcceptedBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "accepted" })
      .populate("user", "username email")    // 👈 ADD field selection
      .populate("driver", "username email")  // 👈 ADD field selection
      .sort({ timestamp: -1 });              // 👈 OPTIONAL: sort by newest first
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAcceptedBookings };