const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

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
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ["user", "driver", "police"],
    default: "user",
  },
  displayName: { type: String, trim: true },
  dob: { type: Date },
  station: { type: String, trim: true },
  area: { type: String, trim: true },
  pincode: { type: String, trim: true },
  vehicleNumber: { type: String, trim: true },
  profilePhoto: { type: String }, // data URL or remote URL
  currentLocation: LocationSchema,
  onDuty: { type: Boolean, default: false },
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
