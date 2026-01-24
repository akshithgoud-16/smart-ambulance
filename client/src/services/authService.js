/**
 * Auth Service
 * Centralized module for all authentication-related API calls
 * Ensures consistent error handling, logging, and request/response formatting
 */

import { authFetch } from "../utils/api";

/**
 * Send OTP to email for signup verification
 * @param {string} email - User email
 * @returns {Promise<{message: string}>}
 */
export const sendSignupOtp = async (email) => {
  console.log("[authService] Sending OTP to:", email);
  try {
    const res = await authFetch("/api/auth/signup/send-otp", {
      method: "POST",
      body: JSON.stringify({ email: email.toLowerCase().trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || "Failed to send OTP");
      error.status = res.status;
      error.response = data;
      throw error;
    }

    console.log("[authService] OTP sent successfully");
    return data;
  } catch (err) {
    console.error("[authService] sendSignupOtp error:", {
      message: err.message,
      status: err.status,
      response: err.response,
    });
    throw err;
  }
};

/**
 * Verify OTP submitted by user
 * @param {string} email - User email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{message: string}>}
 */
export const verifySignupOtp = async (email, otp) => {
  console.log("[authService] Verifying OTP for:", email);
  try {
    const res = await authFetch("/api/auth/signup/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        otp: otp.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || "OTP verification failed");
      error.status = res.status;
      error.response = data;
      throw error;
    }

    console.log("[authService] OTP verified successfully");
    return data;
  } catch (err) {
    console.error("[authService] verifySignupOtp error:", {
      message: err.message,
      status: err.status,
      response: err.response,
    });
    throw err;
  }
};

/**
 * Set password after OTP verification (completes signup)
 * @param {string} email - User email
 * @param {string} password - New password
 * @param {string} role - User role (user|driver|police)
 * @returns {Promise<{message: string, token: string, user: object}>}
 */
export const setSignupPassword = async (email, password, role = "user") => {
  console.log("[authService] Setting password for:", email, "role:", role);
  try {
    const res = await authFetch("/api/auth/signup/set-password", {
      method: "POST",
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password,
        role,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || "Failed to set password");
      error.status = res.status;
      error.response = data;
      throw error;
    }

    console.log("[authService] Password set and user signed up");
    return data;
  } catch (err) {
    console.error("[authService] setSignupPassword error:", {
      message: err.message,
      status: err.status,
      response: err.response,
    });
    throw err;
  }
};

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{message: string, token: string, user: object}>}
 */
export const login = async (email, password) => {
  console.log("[authService] Logging in user:", email);
  try {
    const res = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || "Login failed");
      error.status = res.status;
      error.response = data;
      throw error;
    }

    console.log("[authService] Login successful for user:", email);
    return data;
  } catch (err) {
    console.error("[authService] login error:", {
      message: err.message,
      status: err.status,
      response: err.response,
    });
    throw err;
  }
};

/**
 * Request password reset link via email
 * @param {string} email - User email
 * @returns {Promise<{message: string}>}
 */
export const forgotPassword = async (email) => {
  console.log("[authService] Requesting password reset for:", email);
  try {
    const res = await authFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || "Failed to request password reset");
      error.status = res.status;
      error.response = data;
      throw error;
    }

    console.log("[authService] Password reset email sent");
    return data;
  } catch (err) {
    console.error("[authService] forgotPassword error:", {
      message: err.message,
      status: err.status,
      response: err.response,
    });
    throw err;
  }
};

/**
 * Reset password with token from email link
 * @param {string} token - Reset token from email URL
 * @param {string} password - New password
 * @returns {Promise<{message: string}>}
 */
export const resetPassword = async (token, password) => {
  console.log("[authService] Resetting password with token:", token.substring(0, 10) + "...");
  try {
    const res = await authFetch(`/api/auth/reset-password/${token}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || "Failed to reset password");
      error.status = res.status;
      error.response = data;
      throw error;
    }

    console.log("[authService] Password reset successfully");
    return data;
  } catch (err) {
    console.error("[authService] resetPassword error:", {
      message: err.message,
      status: err.status,
      response: err.response,
    });
    throw err;
  }
};

/**
 * Logout (clears token from localStorage)
 * @returns {Promise<{message: string}>}
 */
export const logout = async () => {
  console.log("[authService] Logging out user");
  try {
    const res = await authFetch("/api/auth/logout", {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn("[authService] Logout returned non-OK status:", res.status);
      // Still clear token even if backend fails
    }

    console.log("[authService] User logged out");
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    return data;
  } catch (err) {
    console.error("[authService] logout error:", {
      message: err.message,
      status: err.status,
    });
    // Still clear token even if network fails
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    throw err;
  }
};

export default {
  sendSignupOtp,
  verifySignupOtp,
  setSignupPassword,
  login,
  forgotPassword,
  resetPassword,
  logout,
};
