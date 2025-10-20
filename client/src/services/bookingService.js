// Booking service for API operations

export const createBooking = async (bookingData) => {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookingData),
    credentials: "include",
  });

  if (!res.ok) {
    const errData = await res.json();
    if (res.status === 401) {
      throw new Error("Please login to book an ambulance.");
    }
    throw new Error(errData.message || "Failed to book ambulance");
  }

  return await res.json();
};
