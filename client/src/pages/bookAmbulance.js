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

    const stableMapClickHandler = (loc) => {
      if (handleMapClickRef.current) handleMapClickRef.current(loc);
    };

    // Initialize the map once with the stable handler
    if (window.google) {
      mapManagerRef.current.initializeMap(stableMapClickHandler);

      // Initialize destination autocomplete (always visible)
      initializeAutocomplete(
        null, // Don't initialize pickup yet, as it's conditionally rendered
        "destination-input",
        null,
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
    manualClickState, // eslint-disable-line no-unused-vars
    captureCurrentLocation,
    handleMapClick,
    toggleLocationMode,
    handlePickupSelected,
    handleDestinationSelected,
    validateAndGetDestinationCoords
  } = useLocation(mapManagerRef, showToast);

  const { setupSocketListeners, stopUserLocationSharing } = useBookingSocket(currentBooking, showToast);

  // Keep refs updated with latest callback versions
  useEffect(() => {
    handleMapClickRef.current = handleMapClick;
    handlePickupSelectedRef.current = handlePickupSelected;
    handleDestinationSelectedRef.current = handleDestinationSelected;
    captureCurrentLocationRef.current = captureCurrentLocation;
  }, [handleMapClick, handlePickupSelected, handleDestinationSelected, captureCurrentLocation]);

  // When the user switches to 'auto' mode, capture current location. We use a ref to call
  // the latest version of captureCurrentLocation without re-initializing the map.
  useEffect(() => {
    if (locationMode === "auto" && captureCurrentLocationRef.current) {
      captureCurrentLocationRef.current();
    }
    // When switching to manual mode, initialize pickup autocomplete
    if (locationMode === "manual" && window.google) {
      setTimeout(() => {
        const pickupInput = document.getElementById("manual-location-input");
        if (pickupInput && !pickupInput.autocompleteInitialized) {
          const pickupAutocomplete = new window.google.maps.places.Autocomplete(pickupInput, {
            types: ["establishment", "geocode"],
            componentRestrictions: { country: "in" },
          });
          pickupAutocomplete.addListener("place_changed", () => {
            const place = pickupAutocomplete.getPlace();
            if (place.geometry && handlePickupSelectedRef.current) {
              const loc = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              };
              handlePickupSelectedRef.current(place.formatted_address, loc);
            }
          });
          pickupInput.autocompleteInitialized = true;
        }
      }, 100);
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
    // Copy ref values to variables inside the effect
    const statusInterval = statusPollingRef.current;
    const driverLocationInterval = driverLocationPollingRef.current;
    
    return () => {
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

    if (!mapManagerRef.current) {
      showToast("⚠ Map is not ready yet. Please wait a moment.", "error");
      return;
    }

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
      // Optimistically enter searching state so the user gets feedback immediately
      setBookingStatus("searching");
      setSearchingTime(0);
      showToast("🔍 Searching for nearby ambulance...", "info");
      // Fallback toast in case rendering timing swallows the first one
      setTimeout(() => showToast("🔍 Searching for nearby ambulance...", "info"), 25);

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

      setCurrentBooking(data.booking);
    } catch (err) {
      console.error(err);
      setBookingStatus(null);
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