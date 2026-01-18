const mongoose = require("mongoose");

const BloodRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },
  hospital: {
    type: String,
    required: true,
    trim: true,
  },
  urgency: {
    type: String,
    required: true,
    enum: ["low", "medium", "high", "critical"],
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "completed", "cancelled"],
    default: "pending",
  },
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  acceptedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("BloodRequest", BloodRequestSchema);
