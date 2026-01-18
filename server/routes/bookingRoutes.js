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

    // Search timeout constant (90 seconds) - must match client-side
    const SEARCH_TIMEOUT_MS = 90 * 1000;
    const cutoffTime = new Date(Date.now() - SEARCH_TIMEOUT_MS);

    // Check if user already has an ACTIVE pending booking (created within timeout window)
    const existingPendingBooking = await Booking.findOne({
      user: req.user._id,
      status: "pending",
      createdAt: { $gte: cutoffTime }
    });

    if (existingPendingBooking) {
      return res.status(400).json({ 
        message: "You already have a pending booking. Please wait for a driver to accept it.",
        existingBooking: existingPendingBooking
      });
    }

    // Cancel any old stale pending bookings (older than timeout)
    await Booking.updateMany(
      {
        user: req.user._id,
        status: "pending",
        createdAt: { $lt: cutoffTime }
      },
      { status: "cancelled" }
    );

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

// PUT /api/bookings/:id/cancel → cancel a booking (user)
router.put("/:id/cancel", isAuthenticated, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: { $in: ["pending", "accepted"] } // Can only cancel pending or accepted bookings
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found or cannot be cancelled" });
    }

    console.log(`📢 Cancelling booking ${booking._id}, status: ${booking.status}, driver: ${booking.driver}`);

    const hadDriver = booking.driver; // Save driver reference before status change
    booking.status = "cancelled";
    await booking.save();

    // Emit socket event to notify driver if booking was accepted (had a driver)
    const io = req.app.get("io");
    console.log(`📢 IO available: ${!!io}, Had driver: ${!!hadDriver}`);
    
    if (io && hadDriver) {
      const roomName = `booking:${booking._id}`;
      console.log(`📢 Emitting bookingCancelled to room: ${roomName}`);
      
      // Get room members for debugging
      const room = io.sockets.adapter.rooms.get(roomName);
      console.log(`📢 Room ${roomName} has ${room ? room.size : 0} members`);
      
      io.to(roomName).emit("bookingCancelled", {
        bookingId: booking._id.toString(),
        message: "Booking has been cancelled by the user"
      });
      console.log(`📢 bookingCancelled event emitted`);
    } else {
      console.log(`📢 Skipping socket emit - IO: ${!!io}, hadDriver: ${!!hadDriver}`);
    }

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/bookings/pending-check → check if user has a pending booking
router.get("/pending-check", isAuthenticated, async (req, res) => {
  try {
    // Only consider bookings created within the last 90 seconds as "active pending"
    // Older pending bookings are considered stale (no driver was found)
    const SEARCH_TIMEOUT_MS = 90 * 1000; // 90 seconds
    const cutoffTime = new Date(Date.now() - SEARCH_TIMEOUT_MS);
    
    const pendingBooking = await Booking.findOne({
      user: req.user._id,
      status: "pending",
      createdAt: { $gte: cutoffTime } // Only bookings created within the timeout window
    });
    
    res.json({ 
      hasPendingBooking: !!pendingBooking,
      booking: pendingBooking 
    });
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

// PUT /api/bookings/:id/driver-cancel → cancel a booking (by driver)
router.put("/:id/driver-cancel", isAuthenticated, isDriver, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      driver: req.user._id,
      status: "accepted"
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found or cannot be cancelled" });
    }

    // Reset booking to pending status so user can search for new driver
    booking.status = "pending";
    booking.driver = null;
    booking.createdAt = new Date(); // Reset the timestamp so it doesn't timeout immediately
    await booking.save();

    // Emit socket event to notify user that driver cancelled and re-search should begin
    const io = req.app.get("io");
    if (io) {
      console.log(`📢 Emitting booking:driver-cancelled to room booking:${booking._id}`);
      io.to(`booking:${booking._id}`).emit("booking:driver-cancelled", {
        bookingId: booking._id.toString(),
        message: "Driver has cancelled. Searching for a new ambulance..."
      });
      console.log(`📢 booking:driver-cancelled event emitted`);
    } else {
      console.log(`📢 No io instance available`);
    }

    res.json({ message: "Booking cancelled. User will be notified to search for another driver.", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

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
