import React from "react";
import { Link } from "react-router-dom"; // 1. Import Link
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
            <span className="title-line">Life-Saving.</span>
          </h1>
          <p className="hero-subtitle">
            Your emergency response partner, just a click away
          </p>
          {/* 2. Replace button with Link */}
          <Link to="/bookambulance" className="cta-button">
            Book Ambulance Now
          </Link>
        </div>
        <div className="hero-visual">
          <div className="pulse-ring"></div>
          <div className="ambulance-icon">🚑</div>
        </div>
      </section>

      {/* Features Section (rest of the content remains the same) */}
      <section className="features">
        <h2 className="section-title">Why to Choose Us?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Booking</h3>
            <p>
              Book an ambulance in under 30 seconds with our streamlined process
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Real-Time Tracking</h3>
            <p>
              Track your ambulance location live on the map from dispatch to
              arrival
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏥</div>
            <h3>Hospital Network</h3>
            <p>
              Connected to 500+ hospitals for seamless emergency care
              coordination
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Transparent Pricing</h3>
            <p>
              No hidden charges. Clear pricing displayed before confirmation
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🩺</div>
            <h3>Medical Support</h3>
            <p>
              All ambulances equipped with essential life-saving medical
              equipment
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Private</h3>
            <p>
              Your medical information is encrypted and completely confidential
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2 className="section-title">How to Use RapidCare</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Enter Location</h3>
              <p>
                Provide your current location or allow GPS access for automatic
                detection
              </p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Choose Service</h3>
              <p>
                Select ambulance type based on emergency level and required
                medical support
              </p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Confirm Booking</h3>
              <p>
                Review details and confirm. Nearest ambulance will be dispatched
                immediately
              </p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Track & Arrive</h3>
              <p>
                Track ambulance in real-time. Driver will contact you upon
                arrival
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Drivers Section */}
      <section className="our-team">
        <h2 className="section-title">Our Drivers</h2>
        <p className="section-subtitle">
          Trained professionals committed to saving lives
        </p>
        <div className="team-grid">
          <div className="team-card">
            <div className="team-icon">👨‍⚕️</div>
            <h3>Certified Professionals</h3>
            <p>
              All drivers are certified EMTs with advanced life support training
            </p>
          </div>
          <div className="team-card">
            <div className="team-icon">🎯</div>
            <h3>Expert Navigation</h3>
            <p>
              Experienced in finding fastest routes during critical emergencies
            </p>
          </div>
          <div className="team-card">
            <div className="team-icon">❤️</div>
            <h3>Compassionate Care</h3>
            <p>
              Trained to provide emotional support and reassurance during
              transport
            </p>
          </div>
          <div className="team-card">
            <div className="team-icon">📞</div>
            <h3>24/7 Availability</h3>
            <p>Round-the-clock driver network ready to respond at any moment</p>
          </div>
        </div>
      </section>

      {/* Our Police Section */}
      <section className="our-police">
        <h2 className="section-title">Our Police Partnership</h2>
        <p className="section-subtitle">Coordinated response for your safety</p>
        <div className="police-grid">
          <div className="police-card">
            <div className="police-icon">🚔</div>
            <h3>Emergency Escort</h3>
            <p>
              Police escort available for critical cases requiring traffic
              clearance
            </p>
          </div>
          <div className="police-card">
            <div className="police-icon">🛡️</div>
            <h3>Safe Transport</h3>
            <p>
              Enhanced security for patient safety in sensitive or high-risk
              situations
            </p>
          </div>
          <div className="police-card">
            <div className="police-icon">📡</div>
            <h3>Direct Communication</h3>
            <p>
              Integrated system for instant police coordination during
              emergencies
            </p>
          </div>
          <div className="police-card">
            <div className="police-icon">⚖️</div>
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
        {/* 3. Replace button with Link */}
        <Link to="/bookambulance" className="cta-button-large">
          Book Your Ambulance Now
        </Link>
      </section>
    </div>
  );
};

export default Home;