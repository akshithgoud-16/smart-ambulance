const Booking = require("../models/Booking");

// Get all accepted bookings (for police dashboard)
const getAcceptedBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      status: "accepted",
      alertedPolice: req.user._id  // Only bookings where this police was alerted
    })
      .populate("user", "username mobile")    // 👈 ADD field selection
      .populate("driver", "username mobile")  // 👈 ADD field selection
      .sort({ timestamp: -1 });              // 👈 OPTIONAL: sort by newest first
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAcceptedBookings };