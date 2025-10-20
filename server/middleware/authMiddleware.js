// server/middleware/authMiddleware.js

// Check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
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
