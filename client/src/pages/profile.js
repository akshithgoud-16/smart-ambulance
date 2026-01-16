import { useCallback, useEffect, useState } from "react";
import "../styles/policeProfile.css";

function UserProfile({ showToast }) {
  const [form, setForm] = useState({
    displayName: "",
    mobile: "",
    dob: "",
    bloodGroup: "",
    area: "",
    pincode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/users/profile", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load profile");

      setForm({
        displayName: data.displayName || "",
        mobile: data.mobile || "",
        dob: data.dob ? data.dob.slice(0, 10) : "",
        bloodGroup: data.bloodGroup || "",
        area: data.area || "",
        pincode: data.pincode || "",
      });
    } catch (err) {
      setError(err.message);
      if (showToast) showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      displayName: form.displayName,
      mobile: form.mobile,
      dob: form.dob || undefined,
      bloodGroup: form.bloodGroup,
      area: form.area,
      pincode: form.pincode,
    };

    try {
      const res = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      const updatedUser = data.user || {};
      setForm((prev) => ({
        ...prev,
        displayName: updatedUser.displayName ?? prev.displayName,
        mobile: updatedUser.mobile ?? prev.mobile,
        dob: updatedUser.dob ? updatedUser.dob.slice(0, 10) : prev.dob,
        bloodGroup: updatedUser.bloodGroup ?? prev.bloodGroup,
        area: updatedUser.area ?? prev.area,
        pincode: updatedUser.pincode ?? prev.pincode,
      }));
      if (showToast) showToast("Profile updated.", "success");
    } catch (err) {
      setError(err.message);
      if (showToast) showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="police-profile-page">
      <div className="profile-header">
        <div>
          <h2>User Profile</h2>
          <p>Update your personal details for better service.</p>
        </div>
        <button className="refresh-btn" onClick={fetchProfile} disabled={loading}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      <div className="profile-grid">
        <div className="profile-card">
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Name</label>
              <input
                name="displayName"
                value={form.displayName}
                onChange={handleInputChange}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="form-row">
              <label>Mobile Number</label>
              <input
                name="mobile"
                value={form.mobile}
                onChange={handleInputChange}
                placeholder="e.g., 9876543210"
              />
            </div>
            <div className="form-row">
              <label>Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-row">
              <label>Blood Group</label>
              <select
                name="bloodGroup"
                value={form.bloodGroup}
                onChange={handleInputChange}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div className="form-row grid-2">
              <div>
                <label>Area</label>
                <input
                  name="area"
                  value={form.area}
                  onChange={handleInputChange}
                  placeholder="Your area"
                />
              </div>
              <div>
                <label>Pincode</label>
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={handleInputChange}
                  placeholder="e.g., 500001"
                />
              </div>
            </div>

            <button className="save-btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>

      {loading && <div className="loading-bar">Loading profile...</div>}
    </div>
  );
}

export default UserProfile;
