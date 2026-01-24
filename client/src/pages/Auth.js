// src/pages/Auth.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";
import { getSocket } from "../utils/socket";
import { authFetch } from "../utils/api"; // adjust path if needed
function Auth({ setIsLoggedIn }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("user");

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
      const res = await authFetch("/auth/login", {
        method: "POST",
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
    const res = await authFetch("/auth/signup/send-otp", {
      method: "POST",
      body: JSON.stringify({ email: signupEmail })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Unable to send OTP");
      return;
    }

    setInfo("OTP sent to your email. It expires in 5 minutes.");
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
      const res = await authFetch("/auth/forgot-password", {
        method: "POST",
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
            <button className={mode === "login" ? "toggle-btn active" : "toggle-btn"} onClick={() => switchMode("login")}>Login</button>
            <button className={mode === "signup" ? "toggle-btn active" : "toggle-btn"} onClick={() => switchMode("signup")}>Sign Up</button>
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
              <div style={{ marginTop: "1rem", textAlign: "right" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "auto", padding: "0.5rem 1.2rem", fontSize: "0.95rem" }}
                  onClick={() => switchMode("forgot")}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form className="auth-form signup-form-custom" onSubmit={async (e) => {
              e.preventDefault();
              resetMessages();
              setLoading(true);
              try {
                // If OTP not verified, verify it first
                if (!signupOtp) {
                  setError("Please enter OTP sent to your email.");
                  setLoading(false);
                  return;
                }
                // If OTP is not verified, verify it
                const otpRes = await authFetch("/auth/signup/verify-otp", {
                  method: "POST",
                  body: JSON.stringify({ email: signupEmail, otp: signupOtp }),
                });
                const otpData = await otpRes.json();
                if (!otpRes.ok) {
                  setError(otpData.message || "OTP verification failed");
                  setLoading(false);
                  return;
                }
                // Set password
                const passRes = await authFetch("/auth/signup/set-password", {
                  method: "POST",
                  body: JSON.stringify({ email: signupEmail, password: signupPassword, role: signupRole }),
                });
                const passData = await passRes.json();
                if (!passRes.ok) {
                  setError(passData.message || "Failed to set password");
                  setLoading(false);
                  return;
                }
                persistSession(passData);
              } catch (err) {
                setError("Server error. Try again later.");
              } finally {
                setLoading(false);
              }
            }}>
              <h2>Sign Up</h2>
              <div className="form-group">
                <input
                  type="email"
                  required
                  className="form-control signup-input"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder=" "
                  autoComplete="username"
                />
                <label>Email</label>
              </div>
              <div className="form-group signup-otp-row">
                <input
                  type="text"
                  required
                  className="form-control signup-input"
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value)}
                  placeholder="Enter OTP"
                  maxLength={6}
                  autoComplete="one-time-code"
                  style={{ minWidth: 0, flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-secondary otp-btn small-otp-btn"
                  disabled={loading || !signupEmail}
                  onClick={handleSendOtp}
                >
                  Send OTP
                </button>
              </div>
              <div className="form-group">
                <input
                  type="password"
                  required
                  className="form-control signup-input"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder=" "
                  minLength={8}
                  autoComplete="new-password"
                />
                <label>Create Password</label>
              </div>
              <div className="form-group">
                <select
                  className="form-control signup-input"
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
                {loading ? "Signing up..." : "Sign Up"}
              </button>
            </form>
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


