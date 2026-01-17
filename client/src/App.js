// src/App.js
import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


// Pages & Components
import Auth from "./pages/Auth";
import HomeRouter from "./pages/HomeRouter";
import BookAmbulance from "./pages/bookAmbulance";
import LiveTracking from "./pages/LiveTracking";
import Help from "./pages/help";
import ContactUs from "./pages/contactUs";
import MyBookings from "./pages/MyBookings";
import DriverDashboard from "./pages/DriverDashboard";
import DriverHistory from "./pages/DriverHistory";
import DriverTracking from "./pages/DriverTracking";
import PoliceDashboard from "./pages/PoliceDashboard";
import PoliceBookingDetail from "./pages/PoliceBookingDetail";
import PoliceProfile from "./pages/PoliceProfile";
import DriverProfile from "./pages/DriverProfile";
import UserProfile from "./pages/profile";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Toast from "./components/Toast";
import "./styles/toast.css"; // Import toast styles globally

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Global toast state
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
  }, []);

  return (
    <Router>
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      {/* Routes */}
      <Routes>
        <Route path="/" element={<HomeRouter showToast={showToast} />} />
        <Route path="/auth" element={<Auth setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/bookAmbulance" element={<BookAmbulance showToast={showToast} />} />
        <Route path="/track/:bookingId" element={<LiveTracking showToast={showToast} />} />
        <Route path="/help" element={<Help />} />
        <Route path="/contactUs" element={<ContactUs />} />
        <Route path="/MyBookings" element={<MyBookings showToast={showToast} />} />
        <Route path="/driver" element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverDashboard showToast={showToast} />
          </ProtectedRoute>
        }/>
        <Route path="/driver/history" element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverHistory showToast={showToast} />
          </ProtectedRoute>
        }/>
        <Route path="/driver/track/:bookingId" element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverTracking showToast={showToast} />
          </ProtectedRoute>
        }/>
        <Route path="/driver/profile" element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverProfile showToast={showToast} />
          </ProtectedRoute>
        }/>
        <Route path="/police" element={
          <ProtectedRoute allowedRoles={["police"]}>
            <PoliceDashboard showToast={showToast} />
          </ProtectedRoute>
        }/>
        <Route path="/police/bookings" element={
          <ProtectedRoute allowedRoles={["police"]}>
            <PoliceDashboard showToast={showToast} />
          </ProtectedRoute>
        }/>
        <Route path="/police/booking/:bookingId" element={
          <ProtectedRoute allowedRoles={["police"]}>
            <PoliceBookingDetail showToast={showToast} />
          </ProtectedRoute>
        }/>
        <Route path="/police/profile" element={
          <ProtectedRoute allowedRoles={["police"]}>
            <PoliceProfile showToast={showToast} />
          </ProtectedRoute>
        }/>
        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={["user"]}>
            <UserProfile showToast={showToast} />
          </ProtectedRoute>
        }/>
      </Routes>

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
          />
        ))}
      </div>
    </Router>
  );
}

export default App;
