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

// GET /api/bookings/:id/police-locations → get police locations for a booking (for driver)
router.get("/:id/police-locations", isAuthenticated, isDriver, async (req, res) => {
  try {
    console.log("📍 Fetching police locations for booking:", req.params.id);
    const booking = await Booking.findOne({ _id: req.params.id, driver: req.user._id })
      .populate("alertedPolice", "currentLocation displayName station");
    
    if (!booking) {
      console.log("❌ Booking not found");
      return res.status(404).json({ message: "Booking not found" });
    }
    
    console.log("📍 Alerted police count:", booking.alertedPolice?.length || 0);
    console.log("📍 Alerted police data:", JSON.stringify(booking.alertedPolice, null, 2));
    
    // Filter police with valid locations
    const policeLocations = (booking.alertedPolice || []).filter(
      p => p.currentLocation && p.currentLocation.lat && p.currentLocation.lng
    ).map(p => ({
      id: p._id,
      lat: p.currentLocation.lat,
      lng: p.currentLocation.lng,
      name: p.displayName || "Police Officer",
      station: p.station || "Police Station"
    }));
    
    console.log("📍 Police locations with valid coords:", policeLocations.length);
    res.json(policeLocations);
  } catch (err) {
    console.error("Error fetching police locations:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/bookings/:id → fetch one booking (for user)
router.get("/:id", isAuthenticated, getBookingById);

module.exports = router;
