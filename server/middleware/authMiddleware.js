const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Validate JWT and attach user to request
const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("+password");
    if (!user || !user.isVerified || !user.password) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    user.password = undefined; // prevent downstream leakage
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Check if user is a driver
const isDriver = (req, res, next) => {
  if (req.user?.role === "driver") return next();
  res.status(403).json({ message: "Forbidden: Only drivers allowed" });
};

// Check if user is a police
const isPolice = (req, res, next) => {
  if (req.user?.role === "police") return next();
  res.status(403).json({ message: "Forbidden: Only police allowed" });
};

module.exports = { isAuthenticated, isDriver, isPolice };
