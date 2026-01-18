// src/hooks/useBookingSocket.js
// Custom hook for booking socket operations

import { useCallback, useRef } from "react";
import {
  joinBookingRoom,
  onBookingAccepted,
  onBookingCompleted,
  onDriverCancelled,
  onDriverLocation,
  emitUserLocation
} from "../utils/socket";

export const useBookingSocket = (currentBooking, showToast) => {
  const userLocationIntervalRef = useRef(null);

  // 🔹 Start sharing user location after driver accepts
  const startUserLocationSharing = useCallback((setUserLocation) => {
    if (!currentBooking || userLocationIntervalRef.current) return;

    const shareLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          setUserLocation(userLoc);
          emitUserLocation(
            String(currentBooking._id),
            userLoc.lat,
            userLoc.lng
          );
        },
        (error) => {
          console.error("❌ Error getting user location:", error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    };

    // Share immediately + every 5 seconds
    shareLocation();
    userLocationIntervalRef.current = setInterval(shareLocation, 5000);
  }, [currentBooking]);

  // 🔹 Stop sharing user location
  const stopUserLocationSharing = useCallback(() => {
    if (userLocationIntervalRef.current) {
      clearInterval(userLocationIntervalRef.current);
      userLocationIntervalRef.current = null;
    }
  }, []);

  // 🔹 Setup all socket listeners for this booking
  const setupSocketListeners = useCallback((booking, callbacks) => {
    if (!booking?._id) return;

    const bookingId = String(booking._id);
    const {
      onAccepted,
      onCompleted,
      onDriverCancelledCallback,
      onDriverLocationUpdate,
      setUserLocation
    } = callbacks;

    // ✅ JOIN ROOM FIRST (critical)
    console.log("🟢 Joining booking room:", bookingId);
    joinBookingRoom(bookingId, "user");

    // 🔥 BOOKING ACCEPTED
    onBookingAccepted((payload) => {
      console.log("📡 bookingAccepted received:", payload);

      const payloadBookingId =
        payload?.bookingId ||
        payload?.booking?._id ||
        payload?._id;

      if (String(payloadBookingId) !== bookingId) return;

      onAccepted(payload);
      startUserLocationSharing(setUserLocation);
    });

    // ✅ BOOKING COMPLETED
    onBookingCompleted((payload) => {
      console.log("📡 bookingCompleted received:", payload);

      const payloadBookingId =
        payload?.bookingId ||
        payload?.booking?._id ||
        payload?._id;

      if (String(payloadBookingId) !== bookingId) return;

      onCompleted(payload);
      stopUserLocationSharing();
    });

    // ⚠️ DRIVER CANCELLED - Re-search for new driver
    onDriverCancelled((payload) => {
      console.log("📡 driverCancelled received:", payload);

      const payloadBookingId =
        payload?.bookingId ||
        payload?.booking?._id ||
        payload?._id;

      if (String(payloadBookingId) !== bookingId) return;

      if (onDriverCancelledCallback) {
        onDriverCancelledCallback(payload);
      }
      stopUserLocationSharing();
    });

    // 📍 DRIVER LOCATION UPDATES
    onDriverLocation((loc) => {
      if (!loc) return;
      onDriverLocationUpdate(loc);
    });

  }, [startUserLocationSharing, stopUserLocationSharing]);

  return {
    setupSocketListeners,
    stopUserLocationSharing
  };
};
