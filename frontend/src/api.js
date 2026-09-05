// Shared API client + auth token handling for the React app.

export const API_BASE = "http://127.0.0.1:8000";

export const TokenStore = {
  getToken() {
    return localStorage.getItem("df_token");
  },
  setToken(t) {
    localStorage.setItem("df_token", t);
  },
  clearToken() {
    localStorage.removeItem("df_token");
  },
  getUser() {
    const raw = localStorage.getItem("df_user");
    return raw ? JSON.parse(raw) : null;
  },
  setUser(u) {
    localStorage.setItem("df_user", JSON.stringify(u));
  },
  isLoggedIn() {
    return !!this.getToken();
  },
};

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  const token = TokenStore.getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  if (options.json) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.json);
  }
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (res.status === 401) {
    TokenStore.clearToken();
    localStorage.removeItem("df_user");
    window.location.hash = "#/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    let detail = "Request failed";
    try {
      detail = (await res.json()).detail || detail;
    } catch (e) {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const Api = {
  signup: (name, email, password) =>
    apiFetch("/auth/signup", { method: "POST", json: { name, email, password } }),
  login: (email, password) =>
    apiFetch("/auth/login", { method: "POST", json: { email, password } }),
  me: () => apiFetch("/auth/me"),
  updateProfile: (name, organization) =>
    apiFetch("/profile", { method: "PUT", json: { name, organization } }),
  changePassword: (currentPassword, newPassword) =>
    apiFetch("/profile/password", {
      method: "PUT",
      json: { current_password: currentPassword, new_password: newPassword },
    }),
  forgotPassword: (email) =>
    apiFetch("/auth/forgot-password", { method: "POST", json: { email } }),
  resetPassword: (token, newPassword) =>
    apiFetch("/auth/reset-password", { method: "POST", json: { token, new_password: newPassword } }),
  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append("file", file);
    const headers = {};
    const token = TokenStore.getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(API_BASE + "/profile/photo", {
      method: "POST",
      body: formData,
      headers,
    });
    if (!res.ok) {
      let detail = "Upload failed";
      try {
        detail = (await res.json()).detail || detail;
      } catch (e) {}
      throw new Error(detail);
    }
    return res.json();
  },
  history: (page = 1, pageSize = 10, verdict = "all", mediaType = "all") =>
    apiFetch(
      `/history?page=${page}&page_size=${pageSize}&verdict=${verdict}&media_type=${mediaType}`
    ),
  analytics: () => apiFetch("/analytics"),

  async predictImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    const headers = {};
    const token = TokenStore.getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(API_BASE + "/predict/image", {
      method: "POST",
      body: formData,
      headers,
    });
    if (!res.ok) throw new Error("Prediction failed: " + res.status);
    return res.json();
  },

  async predictVideo(file) {
    const formData = new FormData();
    formData.append("file", file);
    const headers = {};
    const token = TokenStore.getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(API_BASE + "/predict/video", {
      method: "POST",
      body: formData,
      headers,
    });
    if (!res.ok) throw new Error("Prediction failed: " + res.status);
    return res.json();
  },
};
