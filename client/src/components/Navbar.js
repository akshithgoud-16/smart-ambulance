// src/components/Navbar.js
import { useState, useEffect, useRef } from "react";
import logo from "../assets/logo.png";
import "../styles/Navbar.css";
import { Link, useNavigate } from "react-router-dom";

function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [role, setRole] = useState("user");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const storedRole = localStorage.getItem("role") || "user";
    setRole(storedRole);
  }, [isLoggedIn]);

  const handleLogout = async () => {
    // Clear local storage and state
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    navigate("/auth");
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Role-specific links
  const links = {
    user: [
      { name: "Home", path: "/" },
      { name: "Book Ambulance", path: "/bookAmbulance" },
      { name: "Help", path: "/help" },
      { name: "My Bookings", path: "/MyBookings" },
      { name: "Profile", path: "/profile" },
    ],
    driver: [
      { name: "Dashboard", path: "/driver" },
      { name: "Booking History", path: "/driver/history" },
      { name: "Profile", path: "/driver/profile" },
    ],
    police: [
      { name: "Dashboard", path: "/police" },
      { name: "Profile", path: "/police/profile" },
    ],
  };

  const roleLinks = isLoggedIn ? links[role] : links["user"];

  return (
    <nav className="navbar navbar-expand-lg navbar-custom">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center me-4" to="/">
          <img src={logo} alt="Logo" className="navbar-logo" />
          <span className="navbar-title">Smart Ambulance</span>
        </Link>

        {/* Hamburger toggler, right-aligned */}
        <button
          className={`navbar-toggler custom-hamburger${drawerOpen ? " open" : ""}`}
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>

        {/* Desktop nav */}
        <div className="collapse navbar-collapse justify-content-end d-none d-lg-flex" id="navbarNav">
          <ul className="navbar-nav align-items-lg-center">
            {roleLinks.map((link) => (
              <li className="nav-item" key={link.name}>
                <Link className="nav-link" to={link.path}>
                  {link.name}
                </Link>
              </li>
            ))}
            {!isLoggedIn ? (
              <li className="nav-item ms-lg-4 mt-2 mt-lg-0">
                <Link className="btn btn-light btn-signup" to="/auth">
                  Login / Sign Up
                </Link>
              </li>
            ) : (
              <li
                className="nav-item ms-lg-4 mt-2 mt-lg-0 position-relative"
                ref={dropdownRef}
              >
                <i
                  className="bi bi-person-circle user-icon"
                  onClick={() => setOpen(!open)}
                ></i>
                <div
                  className={`dropdown-menu position-absolute end-0 mt-2 ${open ? "show" : ""}`}
                >
                  <span className="dropdown-item-text">Role: {role}</span>
                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    Logout <i className="bi bi-box-arrow-right logout-icon"></i>
                  </button>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Mobile drawer nav */}
        <div className={`mobile-drawer${drawerOpen ? " open" : ""}`}>
          <ul className="navbar-nav align-items-lg-center">
            {roleLinks.map((link) => (
              <li className="nav-item" key={link.name}>
                <Link className="nav-link" to={link.path} onClick={() => setDrawerOpen(false)}>
                  {link.name}
                </Link>
              </li>
            ))}
            {!isLoggedIn ? (
              <li className="nav-item ms-lg-4 mt-2 mt-lg-0">
                <Link className="btn btn-light btn-signup" to="/auth" onClick={() => setDrawerOpen(false)}>
                  Login / Sign Up
                </Link>
              </li>
            ) : (
              <li
                className="nav-item ms-lg-4 mt-2 mt-lg-0 position-relative"
                ref={dropdownRef}
              >
                <i
                  className="bi bi-person-circle user-icon"
                  onClick={() => setOpen(!open)}
                ></i>
                <div
                  className={`dropdown-menu position-absolute end-0 mt-2 ${open ? "show" : ""}`}
                >
                  <span className="dropdown-item-text">Role: {role}</span>
                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    Logout <i className="bi bi-box-arrow-right logout-icon"></i>
                  </button>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
