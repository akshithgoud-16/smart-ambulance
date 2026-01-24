const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookingRoutes");
const policeRoutes = require("./routes/policeRoutes");
const userRoutes = require("./routes/userRoutes");
const bloodRoutes = require("./routes/bloodRoutes");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

// Get allowed origins from environment or use defaults
const getAllowedOrigins = () => {
  const origins = ["http://localhost:3000"];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  if (process.env.VERCEL_FRONTEND_URL) {
    origins.push(process.env.VERCEL_FRONTEND_URL);
  }
  // Keep hardcoded production domain as fallback
  origins.push("https://smart-ambulance-dun.vercel.app");
  // Remove duplicates
  return [...new Set(origins)];
};

const allowedOrigins = getAllowedOrigins();
console.log("Allowed CORS origins:", allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// expose io to routes/controllers
app.set("io", io);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
// Health check route
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Smart Ambulance backend is running." });
});

// Connect to MongoDB Atlas
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/police", policeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/blood", bloodRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io handlers
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // Client subscribes to a booking room
  socket.on("booking:subscribe", ({ bookingId, role }) => {
    if (!bookingId) return;
    const room = `booking:${bookingId}`;
    socket.join(room);
    console.log(`📦 ${role} joined ${room}`);
  });

  // ================================
  // ✅ NEW: Police joins OWN room
  // ================================
  socket.on("police:join", (policeId) => {
    if (!policeId) return;
    socket.join(`police:${policeId}`);
    console.log(`👮 Police joined room police:${policeId}`);
  });

  // ================================
  // ✅ NEW: User joins OWN room (for blood notifications)
  // ================================
  socket.on("user:join", (userId) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    console.log(`👤 User joined room user:${userId}`);
  });

  // Driver shares live location
  socket.on("driver:location", ({ bookingId, lat, lng }) => {
    if (!bookingId || typeof lat !== "number" || typeof lng !== "number") return;
    const room = `booking:${bookingId}`;
    io.to(room).emit("driver:location", {
      lat,
      lng,
      timestamp: Date.now(),
    });
  });

  // User shares live location
  socket.on("user:location", ({ bookingId, lat, lng }) => {
    if (!bookingId || typeof lat !== "number" || typeof lng !== "number") return;
    const room = `booking:${bookingId}`;
    io.to(room).emit("user:location", {
      lat,
      lng,
      timestamp: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
