const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",   // link to User collection
    required: true,
  },
    driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  pickup: { type: String, required: true },
  destination: { type: String, required: true },
  pickupLat: Number,
  pickupLng: Number,
  destLat: Number,
  destLng: Number,
  status: {
    type: String,
    enum: ["pending", "accepted", "completed", "cancelled"],
    default: "pending",
  },
  timestamp: { type: Date, default: Date.now },
  alertedPolice: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
});

module.exports = mongoose.model("Booking", bookingSchema);
