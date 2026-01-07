const polyline = require("@mapbox/polyline");
const User = require("../models/User");
const Booking = require("../models/Booking");

// 🔽 CHANGE 1: import correct function
const { distancePointToSegment } = require("../utils/geoUtils");

async function notifyPoliceIfRoutePasses(booking, encodedPolyline, io) {
  if (!encodedPolyline || !io) return;

  // Decode route polyline
  const routePoints = polyline
    .decode(encodedPolyline)
    .map(([lat, lng]) => ({ lat, lng }));

  // Fetch police users with saved locations
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

    // 🔽 CHANGE 2: precise radius
    const radius = 150; // meters

    let minDistance = Infinity;

    // 🔽 CHANGE 3: segment-by-segment check (NO SKIP)
    for (let i = 0; i < routePoints.length - 1; i++) {
      const d = distancePointToSegment(
        { lat, lng },                 // police
        routePoints[i],               // segment start
        routePoints[i + 1]            // segment end
      );

      if (d < minDistance) minDistance = d;
    }

    // 🔍 DEBUG
    console.log(
      `Police ${police._id} → minDistance = ${minDistance.toFixed(2)} m`
    );

    // ✅ Notify ONLY if inside radius
    if (minDistance <= radius) {
      console.log(`🚨 NOTIFY police ${police._id}`);

      await Booking.findByIdAndUpdate(booking._id, {
        $addToSet: { alertedPolice: police._id },
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
