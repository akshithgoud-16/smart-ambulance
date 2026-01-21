import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "../styles/Auth.css";

function ResetPassword() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const email = searchParams.get("email") || "";

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Unable to reset password");
        return;
      }
      setInfo("Password updated. You can login now.");
      setTimeout(() => navigate("/auth"), 1500);
    } catch (err) {
      console.error(err);
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-glass">
        <div className="auth-left">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter a new password to regain access.</p>
          {email && <p className="hint">Resetting for: {email}</p>}
          {info && <p className="text-success">{info}</p>}
          {error && <p className="text-danger">{error}</p>}
        </div>
        <div className="auth-right">
          <form onSubmit={handleReset} className="auth-form">
            <h2>Create New Password</h2>
            <div className="form-group">
              <input
                type="password"
                required
                minLength={8}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
              />
              <label>New Password</label>
            </div>
            <div className="form-group">
              <input
                type="password"
                required
                minLength={8}
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder=" "
              />
              <label>Confirm Password</label>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
