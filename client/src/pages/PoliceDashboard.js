import React, { useEffect, useState } from "react";

const PoliceDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [addresses, setAddresses] = useState({}); // Store converted addresses

  // Fetch accepted bookings from backend
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/police/bookings", {
          credentials: "include", // send session cookie
        });
        if (!res.ok) throw new Error("Failed to fetch bookings");
        const data = await res.json();
        setBookings(data);

        // Convert coordinates to addresses for all bookings
        data.forEach(booking => {
          if (booking.pickupLat && booking.pickupLng) {
            getAddressFromCoords(booking._id, booking.pickupLat, booking.pickupLng);
          }
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchBookings();
  }, []);

  // Reverse geocoding using Google Maps API
  const getAddressFromCoords = async (bookingId, lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyD1ZnITeqwr7gt6pMeGfnlR-EBL1kYPbXA`
      );
      const data = await response.json();
      
      if (data.status === "OK" && data.results && data.results[0]) {
        setAddresses(prev => ({
          ...prev,
          [bookingId]: data.results[0].formatted_address
        }));
      } else {
        // Fallback to coordinates if geocoding fails
        setAddresses(prev => ({
          ...prev,
          [bookingId]: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        }));
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      // Fallback to coordinates
      setAddresses(prev => ({
        ...prev,
        [bookingId]: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }));
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>👮 Police Dashboard</h2>

      {bookings.length === 0 ? (
        <p>No accepted bookings currently</p>
      ) : (
        bookings.map((b) => (
          <div
            key={b._id}
            style={{
              border: "1px solid gray",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "5px",
            }}
          >
            <p>
              <strong>User:</strong> {b.user?.username} ({b.user?.email})
            </p>
            <p>
              <strong>Driver:</strong> {b.driver?.username || "Not assigned"}
            </p>
            <p>
              <strong>Pickup:</strong> {addresses[b._id] || "Loading address..."}
            </p>
            <p>
              <strong>Destination:</strong> {b.destination}
            </p>
            <p>
              <strong>Status:</strong> {b.status}
            </p>
          </div>
        ))
      )}
    </div>
  );
};

export default PoliceDashboard;