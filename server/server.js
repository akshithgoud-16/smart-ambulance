const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookingRoutes"); // booking routes
const policeRoutes = require("./routes/policeRoutes");   // police routes
const userRoutes = require("./routes/userRoutes");       // user routes
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Trust proxy if behind one (needed for secure cookies over proxies)
app.set("trust proxy", 1);

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "secretKey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 60 * 60 * 24, // 1 day
      autoRemove: "native",
    }),
    cookie: {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd, // true only in production over HTTPS
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
app.use("/api/bookings", bookingRoutes); // booking API
app.use("/api/police", policeRoutes);    // police API
app.use("/api/users", userRoutes);       // user API

// Example protected route
app.get("/api/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Socket.io handlers
io.on("connection", (socket) => {
  // Client subscribes to a booking room
  socket.on("booking:subscribe", ({ bookingId, role }) => {
    if (!bookingId) return;
    const room = `booking:${bookingId}`;
    socket.join(room);
  });

  // Driver shares live location
  socket.on("driver:location", ({ bookingId, lat, lng }) => {
    if (!bookingId || typeof lat !== "number" || typeof lng !== "number") return;
    const room = `booking:${bookingId}`;
    io.to(room).emit("driver:location", { lat, lng, timestamp: Date.now() });
  });

  // User shares live location
  socket.on("user:location", ({ bookingId, lat, lng }) => {
    if (!bookingId || typeof lat !== "number" || typeof lng !== "number") return;
    const room = `booking:${bookingId}`;
    io.to(room).emit("user:location", { lat, lng, timestamp: Date.now() });
  });
});

server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
