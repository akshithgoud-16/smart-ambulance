// src/pages/BookAmbulance.js - Refactored
import { useState, useEffect, useRef } from "react";
import { MapManager, initializeAutocomplete } from "../utils/mapUtils";
import { useLocation } from "../hooks/useLocation";
import { useBookingSocket } from "../hooks/useBookingSocket";
import { createBooking } from "../services/bookingService";
import { calculateETA } from "../services/locationService";
import { SearchingOverlay, DriverPanel } from "../components/BookingStatus";
import "../styles/bookAmbulance.css";

function BookAmbulance({ showToast }) {
  // Booking state
  const [bookingStatus, setBookingStatus] = useState(null); // null, 'searching', 'accepted', 'completed'
  const [currentBooking, setCurrentBooking] = useState(null);
  const [driver, setDriver] = useState(null);
  const [searchingTime, setSearchingTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  // Refs
  const mapRef = useRef(null);
  const mapManagerRef = useRef(null);
  const statusPollingRef = useRef(null);
  const driverLocationPollingRef = useRef(null);

  // Stable refs for passing latest callbacks into the map listener
  const handleMapClickRef = useRef(null);
  const handlePickupSelectedRef = useRef(null);
  const handleDestinationSelectedRef = useRef(null);
  const captureCurrentLocationRef = useRef(null);

  // Initialize map manager once and wire a stable click handler that delegates to the latest
  // callbacks via refs. This prevents re-initializing the Google Map when callback identities change
  // (which caused the blinking behavior).
  useEffect(() => {
    if (!mapManagerRef.current) {
      mapManagerRef.current = new MapManager(mapRef, showToast);
    }

    // set current refs to the latest callbacks
    handleMapClickRef.current = handleMapClick;
    handlePickupSelectedRef.current = handlePickupSelected;
    handleDestinationSelectedRef.current = handleDestinationSelected;
    captureCurrentLocationRef.current = captureCurrentLocation;

    const stableMapClickHandler = (loc) => {
      if (handleMapClickRef.current) handleMapClickRef.current(loc);
    };

    // Initialize the map once with the stable handler
    if (window.google) {
      mapManagerRef.current.initializeMap(stableMapClickHandler);

      initializeAutocomplete(
        "manual-location-input",
        "destination-input",
        (address, loc) => { if (handlePickupSelectedRef.current) handlePickupSelectedRef.current(address, loc); },
        (address, loc) => { if (handleDestinationSelectedRef.current) handleDestinationSelectedRef.current(address, loc); }
      );
    }
    // We intentionally run this effect only once on mount to avoid re-initializing the map.
    // Updates to the callbacks are delivered through the refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Custom hooks
  const {
    pickup,
    setPickup,
    destination,
    setDestination,
    locationMode,
    manualClickState,
    captureCurrentLocation,
    handleMapClick,
    toggleLocationMode,
    handlePickupSelected,
    handleDestinationSelected,
    validateAndGetDestinationCoords
  } = useLocation(mapManagerRef, showToast);

  const { setupSocketListeners, stopUserLocationSharing } = useBookingSocket(currentBooking, showToast);

  // When the user switches to 'auto' mode, capture current location. We use a ref to call
  // the latest version of captureCurrentLocation without re-initializing the map.
  useEffect(() => {
    if (locationMode === "auto" && captureCurrentLocationRef.current) {
      captureCurrentLocationRef.current();
    }
  }, [locationMode]);

  // Track searching time while in 'searching' state
  useEffect(() => {
    if (bookingStatus !== "searching") return;
    const intervalId = setInterval(() => {
      setSearchingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [bookingStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const statusInterval = statusPollingRef.current;
      const driverLocationInterval = driverLocationPollingRef.current;
      
      if (statusInterval) clearInterval(statusInterval);
      if (driverLocationInterval) clearInterval(driverLocationInterval);
      stopUserLocationSharing();
    };
  }, [stopUserLocationSharing]);

// Attach socket listeners as soon as booking is available
useEffect(() => {
  if (!currentBooking) return;

  setupSocketListeners(currentBooking, {
    onAccepted: (payload) => {
      console.log("✅ Booking accepted", payload);

      setBookingStatus("accepted");
      setDriver(payload.driver);
      setEstimatedTime(Math.floor(Math.random() * 15) + 5);
      showToast("🚑 Ambulance found! Driver is on the way.", "success");
      setIsTracking(true);
    },

    onCompleted: () => {
      setBookingStatus("completed");
      showToast("✅ Ride completed! Thank you for using Smart Ambulance.", "success");
      setIsTracking(false);
    },

    onDriverLocationUpdate: async (loc) => {
      setDriverLocation({ lat: loc.lat, lng: loc.lng });
      mapManagerRef.current.addDriverMarker({ lat: loc.lat, lng: loc.lng });

      const pickupPos = mapManagerRef.current.getPickupPosition();
      if (pickupPos) {
        const eta = await calculateETA(
          { lat: loc.lat, lng: loc.lng },
          pickupPos
        );
        if (eta) setEstimatedTime(eta);
      }
    },

    setUserLocation
  });
}, [currentBooking, setupSocketListeners, showToast]);




  const handleSubmit = async (e) => {
    e.preventDefault();

    const pickupPosition = mapManagerRef.current.getPickupPosition();
    if (!pickupPosition) {
      showToast("⚠ Please set your pickup location first!", "error");
      return;
    }
    if (!destination.trim()) {
      showToast("⚠ Please enter a destination!", "error");
      return;
    }

    try {
      // Validate and get destination coordinates
      const destCoords = await validateAndGetDestinationCoords();

      const bookingData = {
        pickup,
        destination,
        pickupLat: pickupPosition.lat(),
        pickupLng: pickupPosition.lng(),
        destLat: destCoords.lat,
        destLng: destCoords.lng,
      };

      const data = await createBooking(bookingData);
      console.log("Booking response:", data);

      // Start the booking process
      setCurrentBooking(data.booking);
      setBookingStatus("searching");
      setSearchingTime(0);
      showToast("🔍 Searching for nearby ambulance...", "info");

      // Setup socket listeners
     

    } catch (err) {
      console.error(err);
      showToast("❌ " + err.message, "error");
    }
  };

  return (
    <div className="ambulance-page">
      <div className="map-side">
        <div ref={mapRef} className="map-box" />
      </div>
      
      <div className="form-side">
        <h2>Book Your Ambulance</h2>

        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-btn ${locationMode === "auto" ? "active" : ""}`}
            onClick={() => toggleLocationMode("auto")}
          >
            Your current location
          </button>
          <button
            type="button"
            className={`mode-btn ${locationMode === "manual" ? "active" : ""}`}
            onClick={() => toggleLocationMode("manual")}
          >
            Enter location manually
          </button>
        </div>

        {locationMode === "manual" && (
          <div className="manual-location-box">
            <label>Pickup Location</label>
            <input
              id="manual-location-input"
              type="text"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="Enter pickup location"
            />
          </div>
        )}

        <div className="destination-box">
          <label>Destination Hospital</label>
          <input
            id="destination-input"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination hospital"
          />
        </div>

        <div className="tip-box">
          💡 <strong>Tip:</strong> Click on the map to set pickup or destination points directly.
        </div>

        <button onClick={handleSubmit} className="book-btn" disabled={bookingStatus === "searching"}>
          {bookingStatus === "searching" ? "Searching..." : "Book now"}
        </button>
      </div>

      {/* Booking Status Overlays */}
      {bookingStatus === "searching" && (
        <SearchingOverlay searchingTime={searchingTime} />
      )}

      {bookingStatus === "accepted" && driver && (
        <DriverPanel 
          driver={driver}
          estimatedTime={estimatedTime}
          driverLocation={driverLocation}
          userLocation={userLocation}
          isTracking={isTracking}
        />
      )}
    </div>
  );
}

export default BookAmbulance;