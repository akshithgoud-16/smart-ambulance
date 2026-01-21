// src/pages/BookAmbulance.js - Refactored
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { MapManager, initializeAutocomplete } from "../utils/mapUtils";
import { useLocation } from "../hooks/useLocation";
import { useBookingSocket } from "../hooks/useBookingSocket";
import { createBooking, getBookingById, checkPendingBooking, cancelBooking } from "../services/bookingService";
import { calculateETA } from "../services/locationService";
import { SearchingOverlay, DriverPanel } from "../components/BookingStatus";
import "../styles/bookAmbulance.css";
import { useProfileCompletion } from "../hooks/useProfileCompletion";

function BookAmbulance({ showToast }) {
  // Booking state
  const [bookingStatus, setBookingStatus] = useState(null); // null, 'searching', 'accepted', 'completed', 'timeout'
  const [currentBooking, setCurrentBooking] = useState(null);
  const [driver, setDriver] = useState(null);
  const [searchingTime, setSearchingTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Search timeout constant (90 seconds)
  const SEARCH_TIMEOUT_SECONDS = 90;

  // Refs
  const mapRef = useRef(null);
  const mapManagerRef = useRef(null);
  const statusPollingRef = useRef(null);
  const driverLocationPollingRef = useRef(null);
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();

  // Profile completion status
  const { isProfileComplete } = useProfileCompletion(!!localStorage.getItem("token"));

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

  // Handle driver cancellation redirect - auto-search for new driver
  useEffect(() => {
    const handleDriverCancelledRedirect = async () => {
      if (routerLocation.state?.driverCancelled && routerLocation.state?.bookingId) {
        console.log("🔄 Driver cancelled redirect detected, bookingId:", routerLocation.state.bookingId);
        
        // Immediately set to searching state while we fetch booking data
        setBookingStatus("searching");
        setSearchingTime(0);
        setDriver(null);
        setIsTracking(false);
        setDriverLocation(null);
        setEstimatedTime(null);
        
        try {
          // Fetch the updated booking (now back to pending status)
          const booking = await getBookingById(routerLocation.state.bookingId);
          console.log("🔄 Fetched booking:", booking);
          if (booking) {
            setCurrentBooking(booking);
            showToast("🔍 Searching for another ambulance...", "info");
          }
          // Clear the navigation state to prevent re-triggering
          window.history.replaceState({}, document.title);
        } catch (err) {
          console.error("Error fetching booking after driver cancel:", err);
          // Fallback: check for pending booking
          try {
            const { hasPendingBooking, booking } = await checkPendingBooking();
            if (hasPendingBooking && booking) {
              setCurrentBooking(booking);
              showToast("🔍 Searching for another ambulance...", "info");
            }
          } catch (fallbackErr) {
            console.error("Fallback also failed:", fallbackErr);
          }
        }
      }
    };
    
    handleDriverCancelledRedirect();
  }, [routerLocation.state, showToast]);

  // Check for existing pending booking on page load
  useEffect(() => {
    const checkExistingBooking = async () => {
      // Skip if we're handling a driver cancellation redirect
      if (routerLocation.state?.driverCancelled) return;
      
      try {
        const { hasPendingBooking, booking } = await checkPendingBooking();
        if (hasPendingBooking && booking) {
          // Calculate elapsed time since booking was created
          const createdAt = new Date(booking.createdAt);
          const elapsedSeconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);
          
          // Only restore if within the timeout window
          if (elapsedSeconds < SEARCH_TIMEOUT_SECONDS) {
            setCurrentBooking(booking);
            setBookingStatus("searching");
            setSearchingTime(elapsedSeconds); // Resume from where it was
            showToast("🔍 You have an existing booking request. Searching for ambulance...", "info");
          }
        }
      } catch (err) {
        console.error("Error checking pending booking:", err);
      }
    };
    
    checkExistingBooking();
  }, [showToast, routerLocation.state]);

  // Track searching time while in 'searching' state and handle timeout
  useEffect(() => {
    if (bookingStatus !== "searching") return;
    const intervalId = setInterval(() => {
      setSearchingTime((prev) => {
        const newTime = prev + 1;
        // Check for timeout after 90 seconds
        if (newTime >= SEARCH_TIMEOUT_SECONDS) {
          setBookingStatus("timeout");
          showToast("No drivers available at the moment. Please try again later.", "error");
          return newTime;
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [bookingStatus, showToast]);

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

      const payloadBookingId =
        payload?.bookingId ||
        payload?.booking?._id ||
        payload?._id ||
        currentBooking?._id;

      if (payloadBookingId) {
        navigate(`/track/${payloadBookingId}`, {
          state: {
            booking: currentBooking || payload.booking,
            driver: payload.driver,
          },
        });
      }
    },

    onCompleted: () => {
      setBookingStatus("completed");
      showToast("✅ Ride completed! Thank you for using Smart Ambulance.", "success");
      setIsTracking(false);
    },

    // Handle driver cancellation - auto re-search for new driver
    onDriverCancelledCallback: (payload) => {
      console.log("⚠️ Driver cancelled booking", payload);
      showToast("⚠️ Driver cancelled. Searching for another ambulance...", "warning");
      
      // Reset to searching state
      setBookingStatus("searching");
      setDriver(null);
      setIsTracking(false);
      setSearchingTime(0);
      setDriverLocation(null);
      setEstimatedTime(null);
      
      // Navigate back to booking page if on tracking page
      navigate("/book-ambulance");
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
}, [currentBooking, navigate, setupSocketListeners, showToast]);

  // Fallback polling in case socket event is missed
  useEffect(() => {
    if (!currentBooking || bookingStatus !== "searching") return;

    const poll = async () => {
      try {
        const latest = await getBookingById(currentBooking._id);
        if (latest.status === "accepted") {
          setBookingStatus("accepted");
          setDriver(latest.driver);
          navigate(`/track/${latest._id}`, { state: { booking: latest, driver: latest.driver } });
        }
        if (latest.status === "completed" || latest.status === "cancelled") {
          setBookingStatus(latest.status);
        }
      } catch (err) {
        // swallow errors to keep polling lightweight
      }
    };

    statusPollingRef.current = setInterval(poll, 4000);
    return () => {
      if (statusPollingRef.current) clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    };
  }, [bookingStatus, currentBooking, navigate]);




  const handleSubmit = async (e) => {
    e.preventDefault();

    // Block if profile incomplete
    if (!isProfileComplete) {
      showToast("Complete your profile to continue", "error");
      navigate("/profile");
      return;
    }

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

  // Handle cancel booking
  const handleCancelBooking = async () => {
    if (!currentBooking?._id) {
      showToast("❌ No active booking to cancel", "error");
      return;
    }

    setIsCancelling(true);
    try {
      await cancelBooking(currentBooking._id);
      showToast("✅ Booking cancelled successfully", "success");
      setBookingStatus(null);
      setCurrentBooking(null);
      setSearchingTime(0);
      setDriver(null);
      setIsTracking(false);
      stopUserLocationSharing();
    } catch (err) {
      console.error("Cancel booking error:", err);
      showToast("❌ " + err.message, "error");
    } finally {
      setIsCancelling(false);
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
        <SearchingOverlay 
          searchingTime={searchingTime} 
          maxSearchTime={SEARCH_TIMEOUT_SECONDS}
          onCancel={handleCancelBooking}
          isCancelling={isCancelling}
        />
      )}

      {bookingStatus === "timeout" && (
        <SearchingOverlay 
          searchingTime={searchingTime} 
          maxSearchTime={SEARCH_TIMEOUT_SECONDS}
          isTimeout={true}
          onRetry={() => {
            setBookingStatus(null);
            setSearchingTime(0);
            setCurrentBooking(null);
          }}
        />
      )}

      {bookingStatus === "accepted" && driver && (
        <DriverPanel 
          driver={driver}
          estimatedTime={estimatedTime}
          driverLocation={driverLocation}
          userLocation={userLocation}
          isTracking={isTracking}
          onCancel={handleCancelBooking}
          isCancelling={isCancelling}
        />
      )}
    </div>
  );
}

export default BookAmbulance;