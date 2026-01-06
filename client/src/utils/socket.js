import { io } from "socket.io-client";

let socketInstance = null;

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket"],
    });
  }
  return socketInstance;
}

export function joinBookingRoom(bookingId, role) {
  const socket = getSocket();
  socket.emit("booking:subscribe", { bookingId, role });
}

export function onBookingAccepted(handler) {
  const socket = getSocket();
  socket.on("booking:accepted", handler);
}

export function onBookingCompleted(handler) {
  const socket = getSocket();
  socket.on("booking:completed", handler);
}

export function onDriverLocation(handler) {
  const socket = getSocket();
  socket.on("driver:location", handler);
}

export function emitDriverLocation(bookingId, lat, lng) {
  const socket = getSocket();
  socket.emit("driver:location", { bookingId, lat, lng });
}

export function emitUserLocation(bookingId, lat, lng) {
  const socket = getSocket();
  socket.emit("user:location", { bookingId, lat, lng });
}

export function onUserLocation(handler) {
  const socket = getSocket();
  socket.on("user:location", handler);
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}


