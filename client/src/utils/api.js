export const bootstrapAuthFetch = () => {
  if (typeof window === "undefined" || window.__authFetchInstalled) return;

  const originalFetch = window.fetch.bind(window);
  window.__authFetchInstalled = true;

  const API_BASE_URL = "https://smart-ambulance-w3i0.onrender.com";

  window.fetch = async (input, init = {}) => {
    let url = typeof input === "string" ? input : input?.url || "";
    const isApiRequest = url.startsWith("/api") || url.startsWith("http://localhost:5000/api") || url.startsWith(API_BASE_URL + "/api");

    if (url.startsWith("/api")) {
      url = API_BASE_URL + url;
    } else if (url.startsWith("http://localhost:5000/api")) {
      url = url.replace("http://localhost:5000", API_BASE_URL);
    }

    if (!isApiRequest) {
      return originalFetch(input, init);
    }

    const token = localStorage.getItem("token");
    const headers = new Headers(init.headers || {});

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const updatedInit = { ...init, headers };
    return originalFetch(url, updatedInit);
  };
};
