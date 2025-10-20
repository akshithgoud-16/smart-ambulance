const express = require("express");
const router = express.Router();
const { isAuthenticated, isPolice } = require("../middleware/authMiddleware");
const { getAcceptedBookings } = require("../controllers/policeController");

// GET /api/police/bookings → get all accepted bookings
router.get("/bookings", isAuthenticated, isPolice, getAcceptedBookings);

module.exports = router;
