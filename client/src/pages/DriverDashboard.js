import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { joinBookingRoom, emitDriverLocation, onUserLocation } from "../utils/socket";
import "../styles/driver.css";

const DriverDashboard = ({ showToast }) => {
  const [onDuty, setOnDuty] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [userLocation, setUserLocation] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [driverLocation, setDriverLocation] = useState(null);
  const [addresses, setAddresses] = useState({});
  const [driverProfile, setDriverProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const pickupMarker = useRef(null);
  const destinationMarker = useRef(null);
  const driverMarker = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const directionsRenderer = useRef(null);
  const driverToPickupRenderer = useRef(null);
  const pickupToDestRenderer = useRef(null);
  const trackingInterval = useRef(null);
  const navigate = useNavigate();

  // Check if all required profile fields are filled
  const isProfileComplete = (profile) => {
    if (!profile) {
      console.log("Profile is null or undefined");
      return false;
    }
    const requiredFields = ['displayName', 'mobile', 'dob', 'area', 'pincode', 'vehicleNumber'];
    const missingFields = requiredFields.filter(field => !profile[field] || profile[field].toString().trim() === '');
    console.log("Profile data:", profile);
    console.log("Missing fields:", missingFields);
    return missingFields.length === 0;
  };

  // Fetch driver profile to get current duty status
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/profile", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          console.log("Fetched driver profile:", data);
          setDriverProfile(data);
          setOnDuty(data.onDuty || false);
        } else {
          console.error("Failed to fetch profile, status:", res.status);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };
    fetchProfile();
  }, []);

  // Fetch pending bookings when on duty
  useEffect(() => {
    if (!onDuty) {
      setPendingBookings([]);
      return;
    }

    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings/pending", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setPendingBookings(data);
          data.forEach(booking => {
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
    const interval = setInterval(fetchBookings, 5000);
    return () => clearInterval(interval);
  }, [onDuty, showToast]);

  // Initialize Google Map when active booking exists
  useEffect(() => {
    if (!activeBooking || !window.google || !mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: activeBooking.pickupLat, lng: activeBooking.pickupLng },
        mapTypeId: "roadmap",
      });
    }

    // Add pickup marker
    if (pickupMarker.current) pickupMarker.current.setMap(null);
    pickupMarker.current = new window.google.maps.Marker({
      position: { lat: activeBooking.pickupLat, lng: activeBooking.pickupLng },
      map: mapInstance.current,
      label: "P",
      title: "Pickup Location",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        scaledSize: new window.google.maps.Size(40, 40),
      },
    });

    // Add destination marker
    if (destinationMarker.current) destinationMarker.current.setMap(null);
    destinationMarker.current = new window.google.maps.Marker({
      position: { lat: activeBooking.destLat, lng: activeBooking.destLng },
      map: mapInstance.current,
      label: "D",
      title: "Destination",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
        scaledSize: new window.google.maps.Size(40, 40),
      },
    });

    // Initialize direction renderers
    const directionsService = new window.google.maps.DirectionsService();
    
    // Renderer for pickup to destination route (blue)
    if (pickupToDestRenderer.current) pickupToDestRenderer.current.setMap(null);
    pickupToDestRenderer.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: "#4285F4", strokeWeight: 5, strokeOpacity: 0.8 },
    });
    pickupToDestRenderer.current.setMap(mapInstance.current);

    // Draw route from pickup to destination
    directionsService.route(
      {
        origin: { lat: activeBooking.pickupLat, lng: activeBooking.pickupLng },
        destination: { lat: activeBooking.destLat, lng: activeBooking.destLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === "OK") {
          pickupToDestRenderer.current.setDirections(response);
        }
      }
    );

    // Renderer for driver to pickup route (orange)
    if (driverToPickupRenderer.current) driverToPickupRenderer.current.setMap(null);
    driverToPickupRenderer.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: "#FF6B35", strokeWeight: 5, strokeOpacity: 0.9 },
    });
    driverToPickupRenderer.current.setMap(mapInstance.current);

    // Join socket room
    joinBookingRoom(activeBooking._id, "driver");

    // Listen for user location updates
    onUserLocation((userLoc) => {
      if (userLoc && userLoc.lat && userLoc.lng) {
        setUserLocation({ lat: userLoc.lat, lng: userLoc.lng });
      }
    });

    // Function to draw route from driver to pickup
    const drawDriverToPickupRoute = (driverLoc) => {
      if (!mapInstance.current) {
        console.log("Map not ready");
        return;
      }
      
      console.log("Drawing driver to pickup route from:", driverLoc, "to:", { lat: activeBooking.pickupLat, lng: activeBooking.pickupLng });
      
      const directionsServiceLocal = new window.google.maps.DirectionsService();
      
      // Create a new renderer each time to ensure it works
      if (driverToPickupRenderer.current) {
        driverToPickupRenderer.current.setMap(null);
      }
      driverToPickupRenderer.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { 
          strokeColor: "#FF6B35", 
          strokeWeight: 6, 
          strokeOpacity: 1.0 
        },
        preserveViewport: true,
      });
      driverToPickupRenderer.current.setMap(mapInstance.current);
      
      directionsServiceLocal.route(
        {
          origin: driverLoc,
          destination: { lat: activeBooking.pickupLat, lng: activeBooking.pickupLng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          console.log("Driver to pickup route status:", status);
          if (status === "OK" && driverToPickupRenderer.current) {
            driverToPickupRenderer.current.setDirections(response);
            console.log("Orange route drawn successfully");
          } else {
            console.error("Failed to draw driver route:", status);
          }
        }
      );
    };

    // Start sharing driver location and draw route
    if (navigator.geolocation) {
      console.log("Starting geolocation tracking...");
      // Get initial position immediately
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          console.log("Got driver location:", loc);
          setDriverLocation(loc);
          emitDriverLocation(activeBooking._id, loc.lat, loc.lng);
          updateDriverMarker(loc);
          
          // Call drawDriverToPickupRoute after a small delay to ensure map is ready
          setTimeout(() => {
            drawDriverToPickupRoute(loc);
          }, 500);
          
          // Fit map bounds to show all markers
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(loc);
          bounds.extend({ lat: activeBooking.pickupLat, lng: activeBooking.pickupLng });
          bounds.extend({ lat: activeBooking.destLat, lng: activeBooking.destLng });
          mapInstance.current.fitBounds(bounds);
        },
        (err) => {
          console.error("Geolocation error:", err);
        },
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      
      // Continue updating location
      trackingInterval.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setDriverLocation(loc);
            emitDriverLocation(activeBooking._id, loc.lat, loc.lng);
            updateDriverMarker(loc);
            drawDriverToPickupRoute(loc);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000 }
        );
      }, 3000);
    }

    return () => {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
    };
  }, [activeBooking]);

  const updateDriverMarker = (loc) => {
    if (!mapInstance.current) return;

    if (driverMarker.current) driverMarker.current.setMap(null);

    driverMarker.current = new window.google.maps.Marker({
      position: loc,
      map: mapInstance.current,
      title: "Your Location",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        scaledSize: new window.google.maps.Size(40, 40),
      },
      animation: window.google.maps.Animation.BOUNCE,
    });
  };

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

  const handleDutyToggle = async () => {
    try {
      const newStatus = !onDuty;
      
      // Check if profile is complete before turning on duty
      if (newStatus) {
        if (!isProfileComplete(driverProfile)) {
          setProfileError("Please fill all the details in your profile");
          // Auto-clear error after 5 seconds
          setTimeout(() => setProfileError(""), 5000);
          return;
        }
      }
      
      // Clear any existing error
      setProfileError("");
      
      const res = await fetch("http://localhost:5000/api/users/duty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ onDuty: newStatus }),
      });

      if (res.ok) {
        setOnDuty(newStatus);
        showToast(newStatus ? "✅ You are now on duty" : "⚠️ You are now off duty", "success");
        if (!newStatus) {
          setPendingBookings([]);
        }
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to update duty status", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update duty status", "error");
    }
  };

  const acceptBooking = async (id) => {
    try {
      const res = await fetch(`/api/bookings/${id}/accept`, {
        method: "PUT",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.message || "Failed to accept booking", "error");
        return;
      }

      const updated = await res.json();
      showToast("✅ Booking accepted!", "success");
      setPendingBookings(prev => prev.filter(b => b._id !== id));
      setActiveBooking(updated);
    } catch (err) {
      console.error(err);
      showToast("Failed to accept booking", "error");
    }
  };

  const completeBooking = async () => {
    try {
      const res = await fetch(`/api/bookings/${activeBooking._id}/complete`, {
        method: "PUT",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to complete booking");
      
      showToast("✅ Booking completed!", "success");
      setActiveBooking(null);
      
      // Clear map markers
      if (pickupMarker.current) pickupMarker.current.setMap(null);
      if (destinationMarker.current) destinationMarker.current.setMap(null);
      if (driverMarker.current) driverMarker.current.setMap(null);
      
      // Navigate to history
      navigate("/driver/history");
    } catch (err) {
      console.error(err);
      showToast("Failed to complete booking", "error");
    }
  };

  return (
    <div className="driver-dashboard">
      <h2 className="driver-title-top">Driver Dashboard</h2>
      
      {/* Duty Toggle */}
      <div className="duty-toggle-container">
        <label className="duty-toggle-label" onClick={handleDutyToggle}>
          <span>Go On Duty</span>
          <div className={`duty-toggle-switch ${onDuty ? 'active' : ''}`}></div>
        </label>
        <span className={`duty-status-badge ${onDuty ? 'on-duty' : 'off-duty'}`}>
          {onDuty ? "On Duty" : "Off Duty"}
        </span>
        {profileError && (
          <span className="profile-error-message">{profileError}</span>
        )}
      </div>

      {/* Active Booking View with Map */}
      {activeBooking ? (
        <div className="active-booking-card">
          <div className="active-booking-header">
            <h3>Active Booking</h3>
          </div>
          
          <div className="booking-info-grid">
            <div className="booking-info-item">
              <label>Patient</label>
              <span>{activeBooking.user?.username} ({activeBooking.user?.mobile})</span>
            </div>
            <div className="booking-info-item">
              <label>Pickup Location</label>
              <span>{addresses[activeBooking._id] || "Loading address..."}</span>
            </div>
            <div className="booking-info-item">
              <label>Destination</label>
              <span>{activeBooking.destination}</span>
            </div>
          </div>
          
          

          {/* Google Map */}
          <div ref={mapRef} className="map-container"></div>

          <button onClick={completeBooking} className="btn complete">
            Mark as Completed
          </button>
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          {onDuty ? (
            <div className="driver-section">
              <h3 className="driver-section-title">
                Pending Requests <span className="count-badge">{pendingBookings.length}</span>
              </h3>
              {pendingBookings.length === 0 ? (
                <p className="muted">No pending requests available</p>
              ) : (
                pendingBookings.map((b) => (
                  <div key={b._id} className="driver-card">
                    <p><strong>Patient:</strong> {b.user?.username} ({b.user?.mobile})</p>
                    <p><strong>Pickup:</strong> {addresses[b._id] || "Loading address..."}</p>
                    <p><strong>Destination:</strong> {b.destination}</p>
                    <button onClick={() => acceptBooking(b._id)} className="btn accept">
                      Accept Request
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="off-duty-message">
              <p>Toggle "Go On Duty" to start receiving booking requests</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DriverDashboard;
