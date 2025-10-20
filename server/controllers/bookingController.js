const Booking = require("../models/Booking");

// Get all pending bookings (for drivers)
const getPendingBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "pending" })
      .populate("user", "username email"); // 👈 ADD field selection
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Accept a booking
const acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "accepted", driver: req.user._id },
      { new: true }
    )
    .populate("user", "username email")      // 👈 ADD these lines
    .populate("driver", "username email");   // 👈 ADD these lines
    
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Emit real-time event to the booking room
    const io = req.app.get("io");
    if (io) {
      io.to(`booking:${booking._id}`).emit("booking:accepted", {
        bookingId: booking._id.toString(),
        driver: booking.driver,
        status: booking.status,
      });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Complete a booking
const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, driver: req.user._id, status: "accepted" },
      { status: "completed" },
      { new: true }
    )
    .populate("user", "username email")
    .populate("driver", "username email");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found or not authorized" });
    }
    // Emit completion event
    const io = req.app.get("io");
    if (io) {
      io.to(`booking:${booking._id}`).emit("booking:completed", {
        bookingId: booking._id.toString(),
        status: booking.status,
      });
    }
    res.json({ message: "Booking completed successfully", booking });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get driver's accepted bookings
const getDriverBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ driver: req.user._id })
      .populate("user", "username email")
      .sort({ timestamp: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getPendingBookings, acceptBooking, completeBooking, getDriverBookings };