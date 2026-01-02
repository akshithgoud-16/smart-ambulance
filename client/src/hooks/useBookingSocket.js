// Custom hook for booking socket operations
import { useCallback, useRef } from "react";
import { 
  joinBookingRoom, 
  onBookingAccepted, 
  onBookingCompleted, 
  onDriverLocation, 
  emitUserLocation 
} from "../utils/socket";

export const useBookingSocket = (currentBooking, showToast) => {
  const userLocationIntervalRef = useRef(null);

  const startUserLocationSharing = useCallback((setUserLocation) => {
    if (!currentBooking || userLocationIntervalRef.current) return;

    const shareLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLoc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(userLoc);
            emitUserLocation(currentBooking._id, userLoc.lat, userLoc.lng);
          },
          (error) => {
            console.error("Error getting user location:", error);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      }
    };

    // Share location immediately and then every 5 seconds
    shareLocation();
    userLocationIntervalRef.current = setInterval(shareLocation, 5000);
  }, [currentBooking]);

  const stopUserLocationSharing = useCallback(() => {
    if (userLocationIntervalRef.current) {
      clearInterval(userLocationIntervalRef.current);
      userLocationIntervalRef.current = null;
    }
  }, []);

  const setupSocketListeners = useCallback((booking, callbacks) => {
    const { onAccepted, onCompleted, onDriverLocationUpdate, setUserLocation } = callbacks;

    // Subscribe to booking room for real-time updates
    joinBookingRoom(String(booking._id), "user");

    // Socket listeners
    onBookingAccepted((payload) => {
      if (!payload || payload.bookingId !== String(booking._id)) return;
      onAccepted(payload);
      startUserLocationSharing(setUserLocation);
    });

    onBookingCompleted((payload) => {
      if (!payload || payload.bookingId !== String(booking._id)) return;
      onCompleted(payload);
      stopUserLocationSharing();
    });

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
