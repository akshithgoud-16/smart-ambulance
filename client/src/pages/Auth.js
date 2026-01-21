// src/pages/Auth.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";
import { getSocket } from "../utils/socket";

function Auth({ setIsLoggedIn }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("user");
  const [signupStep, setSignupStep] = useState(1);

  const [forgotEmail, setForgotEmail] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const resetMessages = () => {
    setError("");
    setInfo("");
  };

  const persistSession = (payload) => {
    localStorage.setItem("token", payload.token);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("role", payload.user.role || "user");
    localStorage.setItem("username", payload.user.username || payload.user.email);
    localStorage.setItem("userId", payload.user._id);
    setIsLoggedIn(true);

    if (payload.user.role === "driver") navigate("/driver");
    else if (payload.user.role === "police") navigate("/police");
    else navigate("/");

    if (payload.user.role === "user") {
      const socket = getSocket();
      socket.emit("user:join", payload.user._id);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      persistSession(data);
    } catch (err) {
      console.error(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Unable to send OTP");
        return;
      }

      setSignupStep(2);
      setInfo("OTP sent to your email. It expires in 5 minutes.");
    } catch (err) {
      console.error(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail, otp: signupOtp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "OTP verification failed");
        return;
      }

      setSignupStep(3);
      setInfo("OTP verified. You can now set your password.");
    } catch (err) {
      console.error(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail, password: signupPassword, role: signupRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to set password");
        return;
      }

      persistSession(data);
    } catch (err) {
      console.error(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Unable to process request");
        return;
      }
      setInfo(data.message || "If that email exists, a reset link has been sent.");
    } catch (err) {
      console.error(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setInfo("");
    setLoading(false);
    if (nextMode !== "signup") {
      setSignupStep(1);
      setSignupOtp("");
      setSignupPassword("");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-glass">
        <div className="auth-left">
          <h1 className="auth-title">Secure Access</h1>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Login with your verified email and password."
              : mode === "signup"
              ? "Signup requires email OTP first, then password."
              : "Reset your password via email link."}
          </p>
          <div className="auth-switches">
            <button className={mode === "login" ? "toggle-btn active" : "toggle-btn"} onClick={() => switchMode("login")}>
              Login
            </button>
            <button className={mode === "signup" ? "toggle-btn active" : "toggle-btn"} onClick={() => switchMode("signup")}>
              Sign Up
            </button>
            <button className={mode === "forgot" ? "toggle-btn active" : "toggle-btn"} onClick={() => switchMode("forgot")}>
              Forgot Password
            </button>
          </div>
          {info && <p className="text-success" style={{ marginTop: "1rem" }}>{info}</p>}
          {error && <p className="text-danger" style={{ marginTop: "1rem" }}>{error}</p>}
        </div>

        <div className="auth-right">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="auth-form">
              <h2>Login</h2>
              <div className="form-group">
                <input
                  type="email"
                  required
                  className="form-control"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder=" "
                />
                <label>Email</label>
              </div>
              <div className="form-group">
                <input
                  type="password"
                  required
                  className="form-control"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder=" "
                />
                <label>Password</label>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Please wait..." : "Login"}
              </button>
            </form>
          )}

          {mode === "signup" && (
            <div className="auth-form">
              <h2>Sign Up</h2>
              <div className="stepper">
                <span className={signupStep >= 1 ? "step active" : "step"}>1. Email</span>
                <span className={signupStep >= 2 ? "step active" : "step"}>2. OTP</span>
                <span className={signupStep >= 3 ? "step active" : "step"}>3. Password</span>
              </div>

              {signupStep === 1 && (
                <form onSubmit={handleSendOtp}>
                  <div className="form-group">
                    <input
                      type="email"
                      required
                      className="form-control"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder=" "
                    />
                    <label>Email</label>
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </form>
              )}

              {signupStep === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <div className="form-group">
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={signupOtp}
                      onChange={(e) => setSignupOtp(e.target.value)}
                      placeholder=" "
                      maxLength={6}
                    />
                    <label>OTP</label>
                  </div>
                  <p className="hint">Max 3 attempts • Expires in 5 minutes</p>
                  <div className="action-row">
                    <button type="button" className="btn-secondary" onClick={(e) => { setSignupStep(1); setSignupOtp(""); setInfo(""); setError(""); }}>
                      Change Email
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </div>
                </form>
              )}

              {signupStep === 3 && (
                <form onSubmit={handleSetPassword}>
                  <div className="form-group">
                    <input
                      type="password"
                      required
                      className="form-control"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder=" "
                      minLength={8}
                    />
                    <label>Create Password</label>
                  </div>

                  <div className="form-group">
                    <select
                      className="form-control"
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="driver">Driver</option>
                      <option value="police">Police</option>
                    </select>
                    <label>Select Role</label>
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Saving..." : "Set Password & Continue"}
                  </button>
                </form>
              )}
            </div>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <h2>Forgot Password</h2>
              <div className="form-group">
                <input
                  type="email"
                  required
                  className="form-control"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder=" "
                />
                <label>Email</label>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
