export const bootstrapAuthFetch = () => {
  if (typeof window === "undefined" || window.__authFetchInstalled) return;

  const originalFetch = window.fetch.bind(window);
  window.__authFetchInstalled = true;

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const isApiRequest = url.startsWith("/api") || url.startsWith("http://localhost:5000/api");

    if (!isApiRequest) {
      return originalFetch(input, init);
    }

    const token = localStorage.getItem("token");
    const headers = new Headers(init.headers || {});

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const updatedInit = { ...init, headers };
    return originalFetch(input, updatedInit);
  };
};
