/**
 * Socket.IO Event Handlers
 * Manages real-time communication for driver locations and booking updates
 */

const User = require("../models/User");
const Booking = require("../models/Booking");

/**
 * Setup socket handlers for the application
 * @param {Server} io - Socket.IO server instance
 */
const setupSocketHandlers = (io) => {
  // Track active driver locations
  const driverLocations = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Driver updates their location
    socket.on("driver:location:update", async (data) => {
      try {
        const { driverId, lat, lng } = data;

        // Update driver location in database
        await User.findByIdAndUpdate(
          driverId,
          {
            "currentLocation.lat": lat,
            "currentLocation.lng": lng,
            "currentLocation.updatedAt": new Date(),
          },
          { new: true }
        );

        // Store in memory for quick access
        driverLocations.set(driverId, { lat, lng, timestamp: Date.now() });

        // Broadcast driver location to all connected clients (for live tracking)
        socket.broadcast.emit("driver:location:update", {
          driverId,
          lat,
          lng,
          timestamp: new Date(),
        });

        console.log(`Driver ${driverId} location updated: ${lat}, ${lng}`);
      } catch (error) {
        console.error("Error updating driver location:", error);
        socket.emit("error", { message: "Failed to update location" });
      }
    });

    // Driver goes on duty
    socket.on("driver:on-duty", async (data) => {
      try {
        const { driverId } = data;
        await User.findByIdAndUpdate(
          driverId,
          { onDuty: true },
          { new: true }
        );
        
        socket.emit("driver:on-duty:success", { 
          message: "You are now on duty" 
        });
        
        console.log(`Driver ${driverId} is now on duty`);
      } catch (error) {
        console.error("Error updating driver status:", error);
        socket.emit("error", { message: "Failed to update status" });
      }
    });

    // Driver goes off duty
    socket.on("driver:off-duty", async (data) => {
      try {
        const { driverId } = data;
        await User.findByIdAndUpdate(
          driverId,
          { onDuty: false },
          { new: true }
        );
        
        socket.emit("driver:off-duty:success", { 
          message: "You are now off duty" 
        });
        
        console.log(`Driver ${driverId} is now off duty`);
      } catch (error) {
        console.error("Error updating driver status:", error);
        socket.emit("error", { message: "Failed to update status" });
      }
    });

    // Subscribe to booking updates
    socket.on("booking:subscribe", (data) => {
      const { bookingId, role } = data;
      socket.join(`booking:${bookingId}`);
      console.log(`${role} subscribed to booking:${bookingId}`);
    });

    // Unsubscribe from booking
    socket.on("booking:unsubscribe", (data) => {
      const { bookingId } = data;
      socket.leave(`booking:${bookingId}`);
      console.log(`Client unsubscribed from booking:${bookingId}`);
    });

    // Driver location during active booking
    socket.on("driver:location", (data) => {
      const { bookingId, lat, lng } = data;
      io.to(`booking:${bookingId}`).emit("driver:location", {
        bookingId,
        lat,
        lng,
        timestamp: new Date(),
      });
    });

    // User location during booking
    socket.on("user:location", (data) => {
      const { bookingId, lat, lng } = data;
      io.to(`booking:${bookingId}`).emit("user:location", {
        bookingId,
        lat,
        lng,
        timestamp: new Date(),
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

/**
 * Notify nearby drivers about a new booking
 * @param {Server} io - Socket.IO server instance
 * @param {Array} nearbyDrivers - Array of nearby driver objects
 * @param {Object} booking - Booking object
 */
const notifyNearbyDrivers = (io, nearbyDrivers, booking) => {
  nearbyDrivers.forEach((driver) => {
    // Emit to all sockets (in case driver has multiple tabs open)
    io.emit("booking:new", {
      bookingId: booking._id,
      pickup: booking.pickup,
      destination: booking.destination,
      pickupLat: booking.pickupLat,
      pickupLng: booking.pickupLng,
      destLat: booking.destLat,
      destLng: booking.destLng,
      etaToPickup: driver.eta,
      distance: driver.distance,
      userPhone: booking.userPhone,
      timestamp: new Date(),
    });
  });
};

/**
 * Notify a specific driver about a booking assignment
 * @param {Server} io - Socket.IO server instance
 * @param {string} driverId - Driver ID
 * @param {Object} booking - Booking object
 */
const notifyDriverAssignment = (io, driverId, booking) => {
  io.emit("booking:assigned", {
    bookingId: booking._id,
    pickup: booking.pickup,
    destination: booking.destination,
    pickupLat: booking.pickupLat,
    pickupLng: booking.pickupLng,
    destLat: booking.destLat,
    destLng: booking.destLng,
    etaToPickup: booking.etaToPickup,
    status: "assigned",
    timestamp: new Date(),
  });
};

module.exports = {
  setupSocketHandlers,
  notifyNearbyDrivers,
  notifyDriverAssignment,
};
