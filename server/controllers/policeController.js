const Booking = require("../models/Booking");

// Get all accepted bookings (for police dashboard)
const getAcceptedBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      status: "accepted",
      alertedPolice: req.user._id  // Only bookings where this police was alerted
    })
      .populate("user", "username mobile")
      .populate("driver", "username mobile vehicleNumber")
      .sort({ timestamp: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get single booking by ID (for police booking detail page)
const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findOne({ 
      _id: bookingId,
      status: "accepted",  // Only return if still active (not completed)
      alertedPolice: req.user._id
    })
      .populate("user", "username mobile")
      .populate("driver", "username mobile vehicleNumber");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found or has been completed" });
    }
    
    res.json(booking);
  } catch (err) {
    console.error("Error fetching booking:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAcceptedBookings, getBookingById };