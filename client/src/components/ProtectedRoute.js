// src/components/ProtectedRoute.js
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;
  const role = localStorage.getItem("role");

  if (!isLoggedIn) {
    // Not logged in, redirect to auth page
    return <Navigate to="/auth" />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Logged in but role not allowed, redirect to role-specific page
    if (role === "driver") return <Navigate to="/driver" />;
    if (role === "police") return <Navigate to="/police" />;
    return <Navigate to="/" />; // fallback user home
  }

  return children; // authorized
}
