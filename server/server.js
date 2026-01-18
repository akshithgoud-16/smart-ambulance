const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
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
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// expose io to routes/controllers
app.set("io", io);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Connect to MongoDB Atlas
connectDB();

// Session setup
const isProd = process.env.NODE_ENV === "production";
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("Missing MONGODB_URI. Check server/.env.");
  process.exit(1);
}

app.set("trust proxy", 1);

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "secretKey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 60 * 60 * 24,
      autoRemove: "native",
    }),
    cookie: {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport setup
const User = require("./models/User");
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/police", policeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/blood", bloodRoutes);

// Example protected route
app.get("/api/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

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
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
