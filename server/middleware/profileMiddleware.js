const User = require("../models/User");

/**
 * Middleware to check if user profile is complete
 * Should be used AFTER authentication middleware
 */
const requireCompleteProfile = async (req, res, next) => {
  try {
    // req.user should be populated by isAuthenticated middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch fresh user data from database to ensure accuracy
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if profile is complete using the virtual property
    const isComplete = !!(
      user.name &&
      user.mobileNumber &&
      user.mobileNumber.length === 10 &&
      user.dateOfBirth &&
      user.bloodGroup &&
      user.area &&
      user.pincode &&
      user.pincode.length === 6
    );

    if (!isComplete) {
      return res.status(403).json({ 
        message: "Please complete your profile to continue",
        missingFields: getMissingFields(user)
      });
    }

    // Profile is complete, proceed
    next();
  } catch (err) {
    console.error("Profile middleware error:", err);
    return res.status(500).json({ message: "Unable to verify profile" });
  }
};

/**
 * Helper function to identify which fields are missing
 */
const getMissingFields = (user) => {
  const missing = [];
  
  if (!user.name) missing.push("name");
  if (!user.mobileNumber || user.mobileNumber.length !== 10) missing.push("mobileNumber");
  if (!user.dateOfBirth) missing.push("dateOfBirth");
  if (!user.bloodGroup) missing.push("bloodGroup");
  if (!user.area) missing.push("area");
  if (!user.pincode || user.pincode.length !== 6) missing.push("pincode");
  
  return missing;
};

module.exports = { requireCompleteProfile };
