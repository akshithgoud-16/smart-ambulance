import React, { useEffect, useState, useRef } from "react";
import { joinBookingRoom, emitDriverLocation, onUserLocation } from "../utils/socket";
import "../styles/driversAndPolice.css";

const DriverDashboard = ({ showToast }) => {
  const [bookings, setBookings] = useState([]);
  const [acceptedBookings, setAcceptedBookings] = useState([]);
  const [addresses, setAddresses] = useState({}); // Store converted addresses
  const [userLocations, setUserLocations] = useState({}); // Store user locations by booking ID
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch bookings on load
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // Fetch pending bookings
        const pendingRes = await fetch("/api/bookings/pending", {
          credentials: "include",
        });
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setBookings(pendingData);
          
          // Convert coordinates to addresses for pending bookings
          pendingData.forEach(booking => {
            if (booking.pickupLat && booking.pickupLng) {
              getAddressFromCoords(booking._id, booking.pickupLat, booking.pickupLng);
            }
          });
        }

        // Fetch accepted bookings
        const acceptedRes = await fetch("/api/bookings/driver", {
          credentials: "include",
        });
        if (acceptedRes.ok) {
          const acceptedData = await acceptedRes.json();
          setAcceptedBookings(acceptedData);
          
          // Convert coordinates to addresses for accepted bookings
          acceptedData.forEach(booking => {
            if (booking.pickupLat && booking.pickupLng) {
              getAddressFromCoords(booking._id, booking.pickupLat, booking.pickupLng);
            }
          });
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to fetch bookings", "error");
      }
    };
    fetchBookings();
  }, [showToast]);

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

  // Accept booking
  const acceptBooking = async (id) => {
    try {
      const res = await fetch(`/api/bookings/${id}/accept`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to accept booking");
      const updated = await res.json();
      showToast("✅ Booking accepted!", "success");
      setBookings((prev) => prev.filter((b) => b._id !== updated._id));
      setAcceptedBookings((prev) => [updated, ...prev]);
    } catch (err) {
      console.error(err);
      showToast("Failed to accept booking", "error");
    }
  };

  // Complete booking
  const completeBooking = async (id) => {
    try {
      const res = await fetch(`/api/bookings/${id}/complete`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete booking");
      await res.json();
      showToast("✅ Booking completed!", "success");
      setAcceptedBookings((prev) => 
        prev.map((b) => b._id === id ? { ...b, status: "completed" } : b)
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to complete booking", "error");
    }
  };

  // live location sharing to user once a booking is accepted
  const trackingIntervalsRef = useRef({});

  const startSharingLocation = (booking) => {
    if (!booking || trackingIntervalsRef.current[booking._id]) return;
    joinBookingRoom(booking._id, "driver");

    // Listen for user location updates
    onUserLocation((userLoc) => {
      if (userLoc && userLoc.lat && userLoc.lng) {
        setUserLocations(prev => ({
          ...prev,
          [booking._id]: { lat: userLoc.lat, lng: userLoc.lng, timestamp: userLoc.timestamp }
        }));
      }
    });

    // If browser supports geolocation, share real position; otherwise simulate
    if (navigator.geolocation) {
      trackingIntervalsRef.current[booking._id] = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            emitDriverLocation(booking._id, pos.coords.latitude, pos.coords.longitude);
          },
          () => {
            // fallback: skip if unavailable
          },
          { enableHighAccuracy: true, maximumAge: 10000 }
        );
      }, 3000);
    } else {
      // simulate movement near pickup
      let lat = (booking.pickupLat || 12.9716) + (Math.random() - 0.5) * 0.01;
      let lng = (booking.pickupLng || 77.5946) + (Math.random() - 0.5) * 0.01;
      trackingIntervalsRef.current[booking._id] = setInterval(() => {
        lat += (Math.random() - 0.5) * 0.001;
        lng += (Math.random() - 0.5) * 0.001;
        emitDriverLocation(booking._id, lat, lng);
      }, 3000);
    }
  };

  useEffect(() => {
    // start sharing for already accepted bookings
    acceptedBookings.filter(b => b.status === "accepted").forEach(startSharingLocation);
    return () => {
      Object.values(trackingIntervalsRef.current).forEach(clearInterval);
      trackingIntervalsRef.current = {};
    };
  }, [acceptedBookings]);

  return (
    <div className="driver-dashboard">
      <h2 className="driver-title-top">🚑 Driver Dashboard</h2>
      
      {/* Tab Navigation */}
      <div className="driver-tabs">
        <button onClick={() => setActiveTab("pending")} className={`driver-tab ${activeTab === "pending" ? "active" : ""}`}>
          Pending Requests ({bookings.length})
        </button>
        <button onClick={() => setActiveTab("accepted")} className={`driver-tab ${activeTab === "accepted" ? "active" : ""}`}>
          My Bookings ({acceptedBookings.length})
        </button>
      </div>

      {/* Pending Requests Tab */}
      {activeTab === "pending" && (
        <div className="driver-section">
          <h3 className="driver-section-title">Pending Requests</h3>
          {bookings.length === 0 ? (
            <p className="muted">No pending requests</p>
          ) : (
            bookings.map((b) => (
              <div key={b._id} className="driver-card">
                <p><strong>User:</strong> {b.user?.username} ({b.user?.email})</p>
                <p><strong>Pickup:</strong> {addresses[b._id] || "Loading address..."}</p>
                <p><strong>Destination:</strong> {b.destination}</p>
                <button onClick={() => acceptBooking(b._id)} className="btn accept">Accept Request</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Accepted Bookings Tab */}
      {activeTab === "accepted" && (
        <div className="driver-section">
          <h3 className="driver-section-title">My Accepted Bookings</h3>
          {acceptedBookings.length === 0 ? (
            <p className="muted">No accepted bookings</p>
          ) : (
            acceptedBookings.map((b) => (
              <div key={b._id} className={`driver-card ${b.status === "completed" ? "completed" : "accepted"}`}>
                <p><strong>User:</strong> {b.user?.username} ({b.user?.email})</p>
                <p><strong>Pickup:</strong> {addresses[b._id] || "Loading address..."}</p>
                <p><strong>Destination:</strong> {b.destination}</p>
                <p className="status-line"><strong>Status:</strong> <span className={`status ${b.status}`}>{b.status.toUpperCase()}</span></p>
                
                {/* Show user's current location if available */}
                {userLocations[b._id] && (
                  <div style={{ backgroundColor: "#e8f5e8", padding: "8px", borderRadius: "4px", margin: "8px 0" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#2d5a2d" }}>
                      <strong>📍 User's Current Location:</strong><br/>
                      {userLocations[b._id].lat.toFixed(6)}, {userLocations[b._id].lng.toFixed(6)}
                      <br/>
                      <small>Last updated: {userLocations[b._id].timestamp ? new Date(userLocations[b._id].timestamp).toLocaleTimeString() : 'Just now'}</small>
                    </p>
                  </div>
                )}
                
                {b.status === "accepted" && (
                  <>
                    <button onClick={() => completeBooking(b._id)} className="btn complete">Mark as Completed</button>
                    <button onClick={() => startSharingLocation(b)} className="btn share">Share Live Location</button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;