import React from "react";
import { Link } from "react-router-dom";
import "../styles/UserHome.css";

const Home = () => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="emergency-badge">🚨 24/7 Emergency Service</div>
          <h1 className="hero-title">
            <span className="title-line">Fast.</span>
            <span className="title-line">Reliable.</span>
            <span className="title-line">Life Saving.</span>
          </h1>
          <p className="hero-subtitle">
            Your emergency response partner, just a click away
          </p>
          <Link to="/bookambulance" className="cta-button">
            Book Ambulance Now
          </Link>
        </div>
        <div className="hero-visual">
          <div className="pulse-ring"></div>
          {/* Font Awesome icon for the main visual */}
          <div className="ambulance-icon"><i className="fa-solid fa-truck-medical"></i></div>
        </div>
      </section>

      {/* Features Section (Icons were updated previously) */}
      <section className="features">
        <h2 className="section-title">Why Us?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><i className="fa-solid fa-bolt"></i></div>
            <h3>Instant Booking</h3>
            <p>
              Book an ambulance in under 30 seconds with our streamlined process
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="fa-solid fa-location-dot"></i></div>
            <h3>Real-Time Tracking</h3>
            <p>
              Track your ambulance location live on the map from dispatch to
              arrival
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="fa-solid fa-hospital"></i></div>
            <h3>Hospital Network</h3>
            <p>
              Connected to the hospitals for seamless emergency care
              coordination
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="fa-solid fa-sack-dollar"></i></div>
            <h3>Transparent Pricing</h3>
            <p>
              No hidden charges. Clear pricing displayed before confirmation
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="fa-solid fa-stethoscope"></i></div>
            <h3>Medical Support</h3>
            <p>
              All ambulances equipped with essential life saving medical
              equipment
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="fa-solid fa-lock"></i></div>
            <h3>Secure & Private</h3>
            <p>
              Your medical information is encrypted and completely confidential
            </p>
          </div>
        </div>
      </section>

      {/* 🟢 RESTORED & UPDATED: How It Works Section */}
      <section className="how-it-works">
        <h2 className="section-title">How to Use?</h2>
        <div className="steps-container">
          <div className="step">
            {/* Font Awesome icon for Step 1 */}
            <div className="step-number"><i className="fa-solid fa-map-location-dot"></i></div>
            <div className="step-content">
              <h3>Enter Location</h3>
              <p>
                Provide your pickup and destination details via map or manual entry
              </p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            {/* Font Awesome icon for Step 2 */}
            <div className="step-number"><i className="fa-solid fa-truck-medical"></i></div>
            <div className="step-content">
              <h3>Check Details</h3>
              <p>
                Review your information to ensure everything is correct before booking
              </p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            {/* Font Awesome icon for Step 3 */}
            <div className="step-number"><i className="fa-solid fa-check"></i></div>
            <div className="step-content">
              <h3>Confirm Booking</h3>
              <p>
                Click ‘Book Now’ to instantly confirm your ambulance request and get help on the way
              </p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            {/* Font Awesome icon for Step 4 */}
            <div className="step-number"><i className="fa-solid fa-route"></i></div>
            <div className="step-content">
              <h3>Track & Arrive</h3>
              <p>
                Track ambulance in real time. Driver will contact you upon
                arrival
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* 🟢 END RESTORED & UPDATED SECTION */}

      {/* Our Drivers Section (Icons were updated previously) */}
      <section className="our-team">
        <h2 className="section-title">Our Drivers</h2>
        <p className="section-subtitle">
          Trained professionals committed to saving lives
        </p>
        <div className="team-grid">
          <div className="team-card">
            <div className="team-icon"><i class="fa-solid fa-user"></i></div>
            <h3>Certified Professionals</h3>
            <p>
              All drivers are certified EMTs with advanced life support training
            </p>
          </div>
          <div className="team-card">
            <div className="team-icon"><i className="fa-solid fa-compass"></i></div>
            <h3>Expert Navigation</h3>
            <p>
              Experienced in finding fastest routes during critical emergencies
            </p>
          </div>
          <div className="team-card">
            <div className="team-icon"><i className="fa-solid fa-hand-holding-medical"></i></div>
            <h3>Compassionate Care</h3>
            <p>
              Trained to provide emotional support and reassurance during
              transport
            </p>
          </div>
          <div className="team-card">
            <div className="team-icon"><i className="fa-solid fa-headset"></i></div>
            <h3>24/7 Availability</h3>
            <p>Round-the-clock driver network ready to respond at any moment</p>
          </div>
        </div>
      </section>

      {/* Our Police Section (Icons were updated previously) */}
      <section className="our-police">
        <h2 className="section-title">Our Police Partnership</h2>
        <p className="section-subtitle">Coordinated response for your safety</p>
        <div className="police-grid">
          <div className="police-card">
            <div className="police-icon"><i className="fa-solid fa-siren-on"></i></div>
            <h3>Emergency Escort</h3>
            <p>
              Police escort available for critical cases requiring traffic
              clearance
            </p>
          </div>
          <div className="police-card">
            <div className="police-icon"><i className="fa-solid fa-shield-halved"></i></div>
            <h3>Safe Transport</h3>
            <p>
              Enhanced security for patient safety in sensitive or high-risk
              situations
            </p>
          </div>
          <div className="police-card">
            <div className="police-icon"><i className="fa-solid fa-satellite-dish"></i></div>
            <h3>Direct Communication</h3>
            <p>
              Integrated system for instant police coordination during
              emergencies
            </p>
          </div>
          <div className="police-card">
            <div className="police-icon"><i className="fa-solid fa-scale-balanced"></i></div>
            <h3>Legal Support</h3>
            <p>
              Assistance with accident documentation and legal requirements
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="footer-cta">
        <h2>Ready to Get Started?</h2>
        <p>Emergency medical help is just one click away</p>
        <Link to="/bookambulance" className="cta-button-large">
          Book Your Ambulance Now
        </Link>
      </section>
    </div>
  );
};

export default Home;