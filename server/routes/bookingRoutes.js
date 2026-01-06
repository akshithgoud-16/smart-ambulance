const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const { isAuthenticated, isDriver } = require("../middleware/authMiddleware");
const {
  getBookingById,
  getPendingBookings,
  acceptBooking,
  completeBooking,
  getDriverBookings
} = require("../controllers/bookingController");

// ---------------- User Routes ----------------

// POST /api/bookings → create new booking
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { pickup, destination, pickupLat, pickupLng, destLat, destLng } = req.body;

    const booking = new Booking({
      user: req.user._id,
      pickup,
      destination,
      pickupLat,
      pickupLng,
      destLat,
      destLng,
    });

    await booking.save();
    res.status(201).json({ message: "Booking created", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/bookings → fetch all bookings of logged-in user
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).sort({ timestamp: -1 });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- Driver Routes ----------------

// GET /api/bookings/pending → pending bookings for driver
router.get("/pending", isAuthenticated, isDriver, getPendingBookings);

// GET /api/bookings/driver → driver's accepted bookings
router.get("/driver", isAuthenticated, isDriver, getDriverBookings);

// PUT /api/bookings/:id/accept → accept a booking
router.put("/:id/accept", isAuthenticated, isDriver, acceptBooking);

// PUT /api/bookings/:id/complete → complete a booking
router.put("/:id/complete", isAuthenticated, isDriver, completeBooking);

// GET /api/bookings/:id → fetch one booking (for user)
router.get("/:id", isAuthenticated, getBookingById);

module.exports = router;
