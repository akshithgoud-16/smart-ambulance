import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MapManager } from "../utils/mapUtils";
import { calculateETA } from "../services/locationService";
import { getBookingById } from "../services/bookingService";
import { joinBookingRoom, emitUserLocation, getSocket } from "../utils/socket";
import "../styles/liveTracking.css";

const getStatusCopy = (status) => {
  switch (status) {
    case "accepted":
      return "Driver is on the way";
    case "completed":
      return "Ride completed";
    case "pending":
      return "Waiting for driver";
    default:
      return "";
  }
};

function LiveTracking({ showToast }) {
  const { bookingId } = useParams();
  const navigationState = useLocation();
  const navigate = useNavigate();

  const initialBooking = navigationState.state?.booking || null;
  const initialDriver = navigationState.state?.driver || navigationState.state?.booking?.driver || null;

  const [booking, setBooking] = useState(initialBooking);
  const [driver, setDriver] = useState(initialDriver);
  const [status, setStatus] = useState(initialBooking?.status || "accepted");
  const [driverLocation, setDriverLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [lastDriverPing, setLastDriverPing] = useState(null);
  const [loading, setLoading] = useState(!initialBooking);

  const mapRef = useRef(null);
  const mapManagerRef = useRef(null);
  const locationIntervalRef = useRef(null);

  // Initialize the map once
  useEffect(() => {
    if (mapManagerRef.current || !mapRef.current || !window.google) return;
    mapManagerRef.current = new MapManager(mapRef, showToast);
    mapManagerRef.current.initializeMap(() => {});
  }, [showToast]);

  // Fetch booking if we landed directly on this URL
  useEffect(() => {
    if (booking || !bookingId) return;

    const loadBooking = async () => {
      try {
        setLoading(true);
        const data = await getBookingById(bookingId);
        setBooking(data);
        setDriver(data.driver);
        setStatus(data.status);
      } catch (err) {
        showToast(err.message || "Could not load booking", "error");
        navigate("/MyBookings");
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [booking, bookingId, navigate, showToast]);

  // Drop pickup/destination markers when booking info is present
  useEffect(() => {
    if (!booking || !mapManagerRef.current || !mapManagerRef.current.mapInstance || !window.google) return;

    if (booking.pickupLat && booking.pickupLng) {
      mapManagerRef.current.addPickupMarker({ lat: booking.pickupLat, lng: booking.pickupLng });
    }

    if (booking.destLat && booking.destLng) {
      mapManagerRef.current.addDestinationMarker({ lat: booking.destLat, lng: booking.destLng });
    }
  }, [booking]);

  const stopSharingLocation = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  }, []);

  const shareUserLocation = useCallback(() => {
    if (!bookingId) return;

    const shareOnce = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          emitUserLocation(String(bookingId), loc.lat, loc.lng);
        },
        () => {
          // ignore errors silently
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    };

    shareOnce();
    locationIntervalRef.current = setInterval(shareOnce, 5000);
  }, [bookingId]);

  // Start sharing the user's location as soon as we have an accepted booking
  useEffect(() => {
    if (status === "completed") {
      stopSharingLocation();
      return;
    }

    shareUserLocation();
    return stopSharingLocation;
  }, [shareUserLocation, stopSharingLocation, status]);

  // Wire up socket listeners for driver location and completion
  useEffect(() => {
    if (!bookingId) return;

    const socket = getSocket();
    joinBookingRoom(bookingId, "user");

    const handleDriverLocation = async (loc) => {
      if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return;

      setDriverLocation({ lat: loc.lat, lng: loc.lng });
      setLastDriverPing(loc.timestamp || Date.now());

      if (mapManagerRef.current) {
        mapManagerRef.current.addDriverMarker({ lat: loc.lat, lng: loc.lng });
      }

      const pickupPos = booking?.pickupLat
        ? { lat: booking.pickupLat, lng: booking.pickupLng }
        : mapManagerRef.current?.getPickupPosition();

      if (pickupPos) {
        const etaValue = await calculateETA({ lat: loc.lat, lng: loc.lng }, pickupPos);
        if (etaValue) setEta(etaValue);
      }
    };

    const handleCompleted = (payload) => {
      const payloadId = payload?.bookingId || payload?._id;
      if (payloadId && String(payloadId) !== String(bookingId)) return;

      setStatus("completed");
      stopSharingLocation();
      showToast("Ride completed. Hope you are safe!", "success");
    };

    socket.on("driver:location", handleDriverLocation);
    socket.on("booking:completed", handleCompleted);

    return () => {
      socket.off("driver:location", handleDriverLocation);
      socket.off("booking:completed", handleCompleted);
    };
  }, [booking?.pickupLat, booking?.pickupLng, bookingId, showToast, stopSharingLocation]);

  if (!bookingId) {
    return (
      <div className="live-tracking-page">
        <div className="tracking-empty">No booking selected.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="live-tracking-page">
        <div className="tracking-empty">Loading booking...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="live-tracking-page">
        <div className="tracking-empty">Booking not found.</div>
      </div>
    );
  }

  return (
    <div className="live-tracking-page">
      <div className="tracking-header">
        <div>
          <p className="tracking-eyebrow">Booking #{booking._id.slice(-6)}</p>
          <h2>Live Ambulance Tracking</h2>
          <p className="tracking-sub">{getStatusCopy(status)}</p>
        </div>
        <div className="tracking-badges">
          <span className={`status-chip ${status}`}>{status.toUpperCase()}</span>
          {eta && <span className="status-chip eta">ETA {eta} min</span>}
        </div>
      </div>

      <div className="tracking-body">
        <div className="tracking-map" ref={mapRef} />

        <div className="tracking-side">
          <section className="info-card">
            <div className="info-title">Driver</div>
            {driver ? (
              <>
                <h3>{driver.username}</h3>
                <p className="muted">{driver.email}</p>
              </>
            ) : (
              <p className="muted">Driver details will appear once assigned.</p>
            )}
            {eta && <div className="pill">ETA {eta} minutes</div>}
          </section>

          <section className="info-card grid">
            <div>
              <div className="info-title">Pickup</div>
              <p className="muted">{booking.pickup}</p>
            </div>
            <div>
              <div className="info-title">Destination</div>
              <p className="muted">{booking.destination}</p>
            </div>
          </section>

          <section className="info-card">
            <div className="info-title">Live Locations</div>
            {driverLocation ? (
              <div className="coord-row">
                <span className="pill soft">Driver</span>
                <span>{driverLocation.lat.toFixed(6)}, {driverLocation.lng.toFixed(6)}</span>
                {lastDriverPing && (
                  <small className="muted">Updated {new Date(lastDriverPing).toLocaleTimeString()}</small>
                )}
              </div>
            ) : (
              <p className="muted">Waiting for driver location...</p>
            )}

            {userLocation && (
              <div className="coord-row">
                <span className="pill soft">You</span>
                <span>{userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</span>
                <small className="muted">Sharing with driver</small>
              </div>
            )}
          </section>

          <section className="info-card actions">
            <button className="outline" onClick={() => navigate("/MyBookings")}>Back to My Bookings</button>
            <button className="primary" onClick={() => navigate("/bookAmbulance")}>New Booking</button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default LiveTracking;
