// src/utils/api.js

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:5000/api";

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
