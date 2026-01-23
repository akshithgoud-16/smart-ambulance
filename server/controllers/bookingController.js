const Booking = require("../models/Booking");
const User = require("../models/User");
const { distanceInMeters } = require("../utils/geoUtils");

// 🔽 ADDED IMPORTS (ONLY THESE)
const { notifyPoliceIfRoutePasses } = require("../services/policeAlertService");
const { getRoute } = require("../services/directionsService");

// Get single booking for the authenticated user
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id })
      .populate("user", "username mobile")
      .populate("driver", "username mobile vehicleNumber");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all pending bookings (for drivers)
const getPendingBookings = async (req, res) => {
  try {
    const driver = await User.findById(req.user._id).select("currentLocation onDuty");

    if (!driver?.onDuty) {
      console.warn(`Pending bookings fetch skipped — driver ${req.user._id} is off duty`);
      return res.json([]);
    }

    // Require a valid location to filter nearby requests
    const driverLat = driver?.currentLocation?.lat;
    const driverLng = driver?.currentLocation?.lng;

    if (typeof driverLat !== "number" || typeof driverLng !== "number") {
      console.warn(`Pending bookings fetch skipped — missing driver location for ${req.user._id}`);
      return res.json([]);
    }

    const RADIUS_KM = 15;

    const bookings = await Booking.find({ status: "pending" })
      .populate("user", "username mobile")
      .lean();

    const nearbyBookings = bookings.filter((booking) => {
      if (typeof booking.pickupLat !== "number" || typeof booking.pickupLng !== "number") {
        return false;
      }

      const distanceKm = distanceInMeters(
        driverLat,
        driverLng,
        booking.pickupLat,
        booking.pickupLng
      ) / 1000;

      return distanceKm <= RADIUS_KM;
    });

    res.json(nearbyBookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ ACCEPT BOOKING (ONLY THIS FUNCTION IS MODIFIED)
const acceptBooking = async (req, res) => {
  try {
    const driver = await User.findById(req.user._id).select("onDuty");
    if (!driver?.onDuty) {
      return res.status(403).json({ message: "Driver must be on duty to accept bookings" });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "accepted", driver: req.user._id },
      { new: true }
    )
      .populate("user", "username mobile")
      .populate("driver", "username mobile vehicleNumber");

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    const io = req.app.get("io");

    // 🔹 Existing socket emit (UNCHANGED)
    if (io) {
      io.to(`booking:${booking._id}`).emit("booking:accepted", {
        bookingId: booking._id.toString(),
        driver: booking.driver,
        status: booking.status,
      });
    }

    // 🔥 NEW FEATURE STARTS HERE 🔥

// 1️⃣ Get route polyline
const route = await getRoute(
  booking.pickupLat,
  booking.pickupLng,
  booking.destLat,
  booking.destLng
);

// 2️⃣ Notify police ONLY if route exists
if (route?.overview_polyline?.points) {
  await notifyPoliceIfRoutePasses(
    booking,
    route.overview_polyline.points,
    io
  );
} else {
  console.warn(
    `⚠️ Police notification skipped — no route for booking ${booking._id}`
  );
}

// 🔥 NEW FEATURE ENDS HERE 🔥


    res.json(booking);
  } catch (err) {
    console.error(err);
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
      .populate("user", "username mobile")
      .populate("driver", "username mobile vehicleNumber");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found or not authorized" });
    }

    const io = req.app.get("io");
    if (io) {
      // Emit to the booking room (for users/drivers tracking this booking)
      io.to(`booking:${booking._id}`).emit("booking:completed", {
        bookingId: booking._id.toString(),
        status: booking.status,
      });
      
      // Also broadcast globally so police dashboard can update
      io.emit("booking:completed", {
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
      .populate("user", "username mobile")
      .sort({ timestamp: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getBookingById,
  getPendingBookings,
  acceptBooking,
  completeBooking,
  getDriverBookings,
};
