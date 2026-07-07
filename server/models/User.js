const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    label: { type: String, trim: true },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    trim: true,
  },
  password: { type: String, select: false },
  isVerified: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ["user", "driver", "police"],
    default: "user",
  },
  // Profile fields - REQUIRED for profile completion
  name: { type: String, trim: true },
  mobileNumber: { type: String, trim: true },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String, trim: true },
  area: { type: String, trim: true },
  pincode: { type: String, trim: true },
  
  // Legacy/additional fields
  displayName: { type: String, trim: true },
  mobile: { type: String, trim: true },
  dob: { type: Date },
  station: { type: String, trim: true },
  vehicleNumber: { type: String, trim: true },
  profilePhoto: { type: String }, // data URL or remote URL
  currentLocation: LocationSchema,
  onDuty: { type: Boolean, default: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
});

// Virtual property to check if profile is complete
UserSchema.virtual('isProfileComplete').get(function() {
  return !!(
    this.name &&
    this.mobileNumber &&
    this.mobileNumber.length === 10 &&
    this.dateOfBirth &&
    this.bloodGroup &&
    this.area &&
    this.pincode &&
    this.pincode.length === 6
  );
});

// Ensure virtuals are included in JSON responses
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

UserSchema.pre("save", function (next) {
  if (!this.username) {
    this.username = this.email;
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);
