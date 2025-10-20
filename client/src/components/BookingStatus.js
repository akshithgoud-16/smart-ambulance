// Booking status components
import React from "react";

export const SearchingOverlay = ({ searchingTime }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="search-overlay">
      <div className="search-card">
        <div className="search-emoji">🔍</div>
        <h2 className="search-title">Searching for Ambulance</h2>
        <p className="search-subtitle">Finding the nearest available ambulance near you...</p>
        <div className="search-time-box">
          <p className="search-time-text">Search time: {formatTime(searchingTime)}</p>
        </div>
        <div className="search-wait">
          <div className="spinner"></div>
          <span className="search-wait-text">Please wait...</span>
        </div>
      </div>
    </div>
  );
};

export const DriverPanel = ({ driver, estimatedTime, driverLocation, userLocation, isTracking }) => {
  return (
    <div className="driver-panel">
      <div className="driver-header">
        <div className="driver-emoji">🚑</div>
        <div>
          <h3 className="driver-title">Ambulance Found!</h3>
          <p className="driver-subtitle">Driver: {driver.username}</p>
        </div>
      </div>
      <div className="driver-eta-box">
        <p className="driver-eta-text">ETA: {estimatedTime} minutes</p>
      </div>
      
      {/* Real-time location info */}
      <div className="location-info">
        {driverLocation && (
          <div style={{ backgroundColor: "#e3f2fd", padding: "8px", borderRadius: "4px", margin: "8px 0" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#1565c0" }}>
              <strong>🚗 Driver Location:</strong><br/>
              {driverLocation.lat.toFixed(6)}, {driverLocation.lng.toFixed(6)}
            </p>
          </div>
        )}
        
        {userLocation && (
          <div style={{ backgroundColor: "#f3e5f5", padding: "8px", borderRadius: "4px", margin: "8px 0" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#7b1fa2" }}>
              <strong>📍 Your Location:</strong><br/>
              {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
              <br/>
              <small>Sharing location with driver</small>
            </p>
          </div>
        )}
      </div>
      
      <p className="driver-tracking-text">
        {isTracking ? "🔄 Real-time tracking active" : "Driver is on the way!"}
      </p>
    </div>
  );
};
