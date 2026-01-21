// Profile service for API operations

export const getProfile = async () => {
  const res = await fetch("/api/users/profile", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch profile");
  }

  return await res.json();
};

export const updateProfile = async (profileData) => {
  const res = await fetch("/api/users/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData),
    credentials: "include",
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.message || "Failed to update profile");
  }

  return await res.json();
};
