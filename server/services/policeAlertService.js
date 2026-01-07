const polyline = require("@mapbox/polyline");
const User = require("../models/User");
const Booking = require("../models/Booking");
const { distanceInMeters } = require("../utils/geoUtils");

async function notifyPoliceIfRoutePasses(booking, encodedPolyline, io) {
  if (!encodedPolyline || !io) return;

  // Decode route polyline
  const routePoints = polyline
    .decode(encodedPolyline)
    .map(([lat, lng]) => ({ lat, lng }));

  // ✅ FETCH POLICE FROM USER MODEL
  const policeUsers = await User.find({
    role: "police",
    "currentLocation.lat": { $exists: true },
    "currentLocation.lng": { $exists: true },
  });

  for (const police of policeUsers) {
    const { lat, lng } = police.currentLocation;

    if (typeof lat !== "number" || typeof lng !== "number") {
      console.log(`⚠️ Invalid location for police ${police._id}`);
      continue;
    }

    const radius = 150; // meters (fixed radius for now)

    let minDistance = Infinity;

    for (let i = 0; i < routePoints.length; i += 5) {
      const p = routePoints[i];

      const d = distanceInMeters(p.lat, p.lng, lat, lng);
      minDistance = Math.min(minDistance, d);
    }

    // 🔍 DEBUG LOG
    console.log(
      `Police ${police._id} → minDistance = ${minDistance.toFixed(2)} m`
    );

    // ✅ STRICT FILTER
    if (minDistance <= radius) {
      console.log(`🚨 NOTIFY police ${police._id}`);

      // Add police to alertedPolice array
      await Booking.findByIdAndUpdate(booking._id, {
        $addToSet: { alertedPolice: police._id }
      });

      io.to(`police:${police._id}`).emit("police:ambulance-alert", {
        bookingId: booking._id,
        distance: Math.round(minDistance),
        message: "🚑 Ambulance route passes near your location",
      });
    } else {
      console.log(`❌ Police ${police._id} is NOT on route`);
    }
  }
}

module.exports = { notifyPoliceIfRoutePasses };
