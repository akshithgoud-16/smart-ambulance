const fetch = require("node-fetch");

async function getRoute(pickupLat, pickupLng, destLat, destLng) {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickupLat},${pickupLng}&destination=${destLat},${destLng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  // ❌ DO NOT THROW
  if (!data.routes || !data.routes[0]) {
    console.warn("⚠️ Google Directions: No route found");
    return null;
  }

  return data.routes[0];
}

module.exports = { getRoute };
