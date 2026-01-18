const BloodRequest = require("../models/BloodRequest");
const User = require("../models/User");

// Create a new blood request
const createBloodRequest = async (req, res) => {
  try {
    const { bloodGroup, hospital, urgency } = req.body;

    if (!bloodGroup || !hospital || !urgency) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already has an active pending request
    const existingRequest = await BloodRequest.findOne({
      requester: req.user._id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "You already have a pending blood request",
        existingRequest,
      });
    }

    const bloodRequest = new BloodRequest({
      requester: req.user._id,
      bloodGroup,
      hospital,
      urgency,
    });

    await bloodRequest.save();

    // Find all users with matching blood group (potential donors)
    const potentialDonors = await User.find({
      bloodGroup: bloodGroup,
      _id: { $ne: req.user._id }, // Exclude the requester
      role: "user", // Only regular users can donate
    });

    // Emit socket notification to potential donors
    const io = req.app.get("io");
    if (io && potentialDonors.length > 0) {
      const requesterData = await User.findById(req.user._id).select("displayName mobile");
      
      potentialDonors.forEach((donor) => {
        io.to(`user:${donor._id}`).emit("blood:request", {
          requestId: bloodRequest._id,
          bloodGroup,
          hospital,
          urgency,
          requesterName: requesterData.displayName || "Anonymous",
          requesterMobile: requesterData.mobile || "N/A",
        });
      });
      
      console.log(`🩸 Blood request sent to ${potentialDonors.length} potential donors`);
    }

    res.status(201).json({
      message: "Blood request created successfully",
      bloodRequest,
    });
  } catch (err) {
    console.error("Error creating blood request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all blood requests made by the logged-in user
const getMyRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ requester: req.user._id })
      .populate("donor", "displayName mobile")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Error fetching my requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all donations made by the logged-in user (requests they've accepted)
const getMyDonations = async (req, res) => {
  try {
    const donations = await BloodRequest.find({ donor: req.user._id })
      .populate("requester", "displayName mobile")
      .sort({ acceptedAt: -1 });

    res.json(donations);
  } catch (err) {
    console.error("Error fetching my donations:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get pending blood requests for potential donors (matching blood group)
const getPendingRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.bloodGroup) {
      return res.status(400).json({ 
        message: "Please update your blood group in your profile to see donation requests" 
      });
    }

    const pendingRequests = await BloodRequest.find({
      bloodGroup: user.bloodGroup,
      status: "pending",
      requester: { $ne: req.user._id }, // Exclude own requests
    })
      .populate("requester", "displayName mobile")
      .sort({ createdAt: -1 });

    res.json(pendingRequests);
  } catch (err) {
    console.error("Error fetching pending requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Accept a blood request (become a donor)
const acceptBloodRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const bloodRequest = await BloodRequest.findById(requestId);

    if (!bloodRequest) {
      return res.status(404).json({ message: "Blood request not found" });
    }

    if (bloodRequest.status !== "pending") {
      return res.status(400).json({ message: "This request is no longer available" });
    }

    if (bloodRequest.requester.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot accept your own request" });
    }

    // Verify donor has matching blood group
    const donor = await User.findById(req.user._id);
    if (donor.bloodGroup !== bloodRequest.bloodGroup) {
      return res.status(400).json({ message: "Your blood group doesn't match the request" });
    }

    bloodRequest.donor = req.user._id;
    bloodRequest.status = "accepted";
    bloodRequest.acceptedAt = new Date();
    await bloodRequest.save();

    // Notify the requester that someone accepted
    const io = req.app.get("io");
    if (io) {
      const donorData = await User.findById(req.user._id).select("displayName mobile");
      io.to(`user:${bloodRequest.requester}`).emit("blood:accepted", {
        requestId: bloodRequest._id,
        donorName: donorData.displayName || "Anonymous",
        donorMobile: donorData.mobile || "N/A",
      });
      console.log(`🩸 Blood request accepted notification sent to requester`);
    }

    const populatedRequest = await BloodRequest.findById(requestId)
      .populate("requester", "displayName mobile")
      .populate("donor", "displayName mobile");

    res.json({
      message: "Blood request accepted successfully",
      bloodRequest: populatedRequest,
    });
  } catch (err) {
    console.error("Error accepting blood request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Complete a blood donation
const completeDonation = async (req, res) => {
  try {
    const { requestId } = req.params;

    const bloodRequest = await BloodRequest.findById(requestId);

    if (!bloodRequest) {
      return res.status(404).json({ message: "Blood request not found" });
    }

    if (bloodRequest.status !== "accepted") {
      return res.status(400).json({ message: "This request cannot be completed" });
    }

    // Only the donor or requester can complete
    const userId = req.user._id.toString();
    if (
      bloodRequest.donor?.toString() !== userId &&
      bloodRequest.requester.toString() !== userId
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    bloodRequest.status = "completed";
    bloodRequest.completedAt = new Date();
    await bloodRequest.save();

    // Notify both parties
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${bloodRequest.requester}`).emit("blood:completed", {
        requestId: bloodRequest._id,
      });
      io.to(`user:${bloodRequest.donor}`).emit("blood:completed", {
        requestId: bloodRequest._id,
      });
    }

    res.json({
      message: "Donation marked as completed",
      bloodRequest,
    });
  } catch (err) {
    console.error("Error completing donation:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel a blood request
const cancelBloodRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const bloodRequest = await BloodRequest.findOne({
      _id: requestId,
      requester: req.user._id,
      status: { $in: ["pending", "accepted"] },
    });

    if (!bloodRequest) {
      return res.status(404).json({ message: "Blood request not found or cannot be cancelled" });
    }

    const previousDonor = bloodRequest.donor;
    bloodRequest.status = "cancelled";
    await bloodRequest.save();

    // Notify donor if there was one
    const io = req.app.get("io");
    if (io && previousDonor) {
      io.to(`user:${previousDonor}`).emit("blood:cancelled", {
        requestId: bloodRequest._id,
      });
    }

    res.json({
      message: "Blood request cancelled successfully",
      bloodRequest,
    });
  } catch (err) {
    console.error("Error cancelling blood request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createBloodRequest,
  getMyRequests,
  getMyDonations,
  getPendingRequests,
  acceptBloodRequest,
  completeDonation,
  cancelBloodRequest,
};
