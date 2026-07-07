const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fetch = require("node-fetch");
const User = require("../models/User");
const Otp = require("../models/Otp");

const OTP_EXP_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_TIMEOUT_MS = 15_000;

const sendEmail = async ({ to, subject, html }) => {
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Email service not configured");
  }

  const fromEmail = process.env.FROM_EMAIL;
  const fromName = process.env.FROM_NAME || "Smart Ambulance";

  if (!fromEmail) {
    throw new Error("FROM_EMAIL not configured");
  }

  const headers = {
    "api-key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const sender = { email: fromEmail, name: fromName };

  if (apiKey.startsWith("xsmtpsib-")) {
    console.warn(
      "BREVO_API_KEY appears to be an SMTP key (xsmtpsib-). For HTTP API, use an API key starting with xkeysib-."
    );
  }

  // Send primary email to user (must succeed or throw)
  const mainResponse = await fetch(BREVO_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    timeout: BREVO_TIMEOUT_MS,
  });

  if (!mainResponse.ok) {
    let errorBody = "";
    try {
      errorBody = await mainResponse.text();
    } catch (_) {}
    if (mainResponse.status === 401) {
      console.error(
        `Brevo unauthorized (401). Key length: ${apiKey.length}, startsWith xkeysib-: ${apiKey.startsWith("xkeysib-")}, startsWith xsmtpsib-: ${apiKey.startsWith("xsmtpsib-")}`
      );
    }
    throw new Error(
      `Failed to send email (${mainResponse.status}): ${errorBody || mainResponse.statusText}`
    );
  }

  // Best-effort confirmation email to developer; failures are logged only
  try {
    const timestamp = new Date().toISOString();
    const confirmationResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sender,
        to: [{ email: "srishanthreddyy05@gmail.com" }],
        subject: "Brevo HTTP Email API – HTTPS Confirmed",
        htmlContent: `<p>Timestamp: ${timestamp}</p><p>Original recipient: ${to}</p><p>Sent via Brevo HTTP Email API (HTTPS).</p>`,
      }),
      timeout: BREVO_TIMEOUT_MS,
    });

    if (!confirmationResponse.ok) {
      let errorBody = "";
      try {
        errorBody = await confirmationResponse.text();
      } catch (_) {}
      console.error("Confirmation email failed:", errorBody || `${confirmationResponse.status} ${confirmationResponse.statusText}`);
    }
  } catch (err) {
    console.error("Confirmation email failed:", err.message);
  }
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET");
  }
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const obj = user.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

// 1) Signup - Send OTP
const sendSignupOtp = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: "User already registered" });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    await Otp.findOneAndUpdate(
      { email },
      { otpHash, expiresAt, attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendEmail({
      to: email,
      subject: "Your Smart Ambulance verification code",
      html: `<p>Your OTP is <strong>${otp}</strong>. It expires in ${OTP_EXP_MINUTES} minutes.</p>`,
    });
    console.log(`OTP email sent to ${email}`);


    return res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("Error sending signup OTP:", err);
    return res.status(500).json({ message: "Unable to send OTP right now" });
  }
};

// 2) Signup - Verify OTP
const verifySignupOtp = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const otp = req.body.otp?.trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const record = await Otp.findOne({ email });
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Maximum OTP attempts exceeded" });
    }

    const isMatch = await bcrypt.compare(otp, record.otpHash);
    if (!isMatch) {
      await Otp.updateOne({ email }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, isVerified: true, password: null });
    } else {
      user.isVerified = true;
      await user.save();
    }

    await Otp.deleteOne({ email });
    return res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

// 3) Signup - Set Password (generate JWT here)
const setSignupPassword = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "OTP verification required before setting password" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    if (role && ["user", "driver", "police"].includes(role)) {
      user.role = role;
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    const token = generateToken(user);
    return res.json({ message: "Password set successfully", token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Error setting password:", err);
    return res.status(500).json({ message: "Failed to set password" });
  }
};

// 4) Login
const login = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    if (!user.password) {
      return res.status(403).json({ message: "Password not set. Complete signup first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);
    return res.json({ message: "Login successful", token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
};

// 5) Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email }).select("_id email isVerified");
    if (user) {
      console.log(`Forgot password: preparing reset email for ${email}`);
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      const resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

      user.resetPasswordToken = resetPasswordToken;
      user.resetPasswordExpire = resetPasswordExpire;
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}?email=${encodeURIComponent(email)}`;
      await sendEmail({
        to: email,
        subject: "Reset your Smart Ambulance password",
        html: `<p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
      });
      console.log(`Forgot password: reset email sent (Brevo) to ${email}`);
    }

    return res.json({ message: "If that email exists, a reset link has been sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Unable to process request" });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.json({ message: "Password has been reset" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Unable to reset password" });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    console.log("Logout request from user:", req.user?._id);
    // Clear the JWT token by instructing client to remove it
    // Also clear any session data if using sessions
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Unable to logout" });
  }
};

module.exports = {
  sendSignupOtp,
  verifySignupOtp,
  setSignupPassword,
  login,
  forgotPassword,
  resetPassword,
  logout,
};
