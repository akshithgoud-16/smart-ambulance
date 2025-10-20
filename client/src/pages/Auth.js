// src/pages/Auth.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

function Auth({ setIsLoggedIn }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); 
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const url = isLogin
        ? "http://localhost:5000/api/auth/login"
        : "http://localhost:5000/api/auth/signup";

      const body = isLogin
        ? { username, password }
        : { username, email, password, role };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      // Save logged-in state
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("username", data.user.username);

      setIsLoggedIn(true);

      // Redirect based on role
      if (data.user.role === "driver") navigate("/driver");
      else if (data.user.role === "police") navigate("/police");
      else navigate("/"); // default user home

    } catch (err) {
      console.error(err);
      setError("Server error. Try again later.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-glass">
        <div className="auth-left">
          <h1 className="auth-title">
            {isLogin ? "Welcome Back!" : "Join Smart Ambulance"}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? "Login to access your dashboard and book ambulances instantly."
              : "Sign up to become part of our innovative ambulance platform."}
          </p>
          <button
            className="toggle-btn"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </div>

        <div className="auth-right">
          <form onSubmit={handleSubmit} className="auth-form">
            <h2>{isLogin ? "Login" : "Sign Up"}</h2>

            {/* Username field */}
            <div className="form-group">
              <input
                type="text"
                required
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=" "
              />
              <label>Username</label>
            </div>

            {/* Email field only for signup */}
            {!isLogin && (
              <div className="form-group">
                <input
                  type="email"
                  required
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                />
                <label>Email</label>
              </div>
            )}

            {/* Password */}
            <div className="form-group">
              <input
                type="password"
                required
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
              />
              <label>Password</label>
            </div>

            {/* Role selection only for signup */}
            {!isLogin && (
              <div className="form-group">
                <select
                  className="form-control"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="driver">Driver</option>
                  <option value="police">Police</option>
                </select>
                <label>Select Role</label>
              </div>
            )}

            {error && <p className="text-danger">{error}</p>}

            <button type="submit" className="btn-primary">
              {isLogin ? "Login" : "Sign Up"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Auth;
