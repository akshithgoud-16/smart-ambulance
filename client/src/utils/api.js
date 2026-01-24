// src/utils/api.js

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://smart-ambulance-w3i0.onrender.com");

/**
 * authFetch
 * - Automatically adds Authorization header if token exists
 * - Uses localhost backend in development
 * - Uses production backend in production
 */
export async function authFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });
}
