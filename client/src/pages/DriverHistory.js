import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/driversAndPolice.css";

const DriverHistory = ({ showToast }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState({});
  const navigate = useNavigate();

  // Fetch driver's booking history
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings/driver", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setBookings(data);
          
          // Convert coordinates to addresses
          data.forEach(booking => {
            if (booking.pickupLat && booking.pickupLng) {
              getAddressFromCoords(booking._id, booking.pickupLat, booking.pickupLng);
            }
          });
        } else {
          showToast("Failed to load booking history", "error");
        }
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        showToast("Failed to load booking history", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [showToast]);

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
        setAddresses(prev => ({
          ...prev,
          [bookingId]: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        }));
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setAddresses(prev => ({
        ...prev,
        [bookingId]: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#ffc107";
      case "accepted":
        return "#17a2b8";
      case "completed":
        return "#28a745";
      case "cancelled":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "In Progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="driver-history-page">
      <div className="driver-history-header">
        <h1>Booking History</h1>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="no-history">
          <h3>No Bookings Yet</h3>
          <p>Accept requests from the dashboard to see them here.</p>
        </div>
      ) : (
        <div className="history-grid">
          {bookings.map((booking) => (
            <div key={booking._id} className="history-card">
              <div className="history-card-header">
                <h4>#{booking._id.slice(-6).toUpperCase()}</h4>
                <span
                  className="history-status"
                  style={{ backgroundColor: getStatusColor(booking.status) }}
                >
                  {getStatusText(booking.status)}
                </span>
              </div>

              <div className="history-card-body">
                <div className="history-info-row">
                  <div className="content">
                    <div className="label">Patient</div>
                    <div className="value">{booking.user?.username} ({booking.user?.email})</div>
                  </div>
                </div>
                
                <div className="history-info-row">
                  <div className="content">
                    <div className="label">Pickup</div>
                    <div className="value">{addresses[booking._id] || "Loading..."}</div>
                  </div>
                </div>
                
                <div className="history-info-row">
                  <div className="content">
                    <div className="label">Destination</div>
                    <div className="value">{booking.destination}</div>
                  </div>
                </div>
              </div>

              <div className="history-card-footer">
                <small>{new Date(booking.timestamp).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverHistory;
