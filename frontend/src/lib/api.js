const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL);

export const apiUrl = (path = "") => {
  const normalizedPath = String(path || "");
  const route = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  return API_BASE_URL ? new URL(route, `${API_BASE_URL}/`).toString() : route;
};

export const apiFetch = (path, options = {}) => fetch(apiUrl(path), options);

const parseJsonSafe = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Invalid response" };
  }
};

const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem("paylio-session") || "null");
  } catch {
    return null;
  }
};

const saveAccessToken = (accessToken) => {
  if (!accessToken) return;
  localStorage.setItem("paylio-token", accessToken);

  const session = getSession();
  if (session) {
    localStorage.setItem("paylio-session", JSON.stringify({ ...session, token: accessToken }));
  }
};

const refreshAccessToken = async () => {
  const session = getSession();
  const refreshToken = session?.refreshToken || localStorage.getItem("paylio-refresh-token");
  if (!refreshToken) {
    throw new Error("Session expired. Please login again.");
  }

  const response = await apiFetch("/api/auth/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data.message || "Session expired. Please login again.");
  }

  const payload = data?.data || data || {};
  const accessToken = payload.accessToken || payload.token;
  if (!accessToken) {
    throw new Error("Session expired. Please login again.");
  }

  saveAccessToken(accessToken);
  return accessToken;
};

const isExpiredTokenError = (response, data) =>
  response.status === 401 && /jwt expired|token expired/i.test(String(data?.message || data?.error || ""));

export const authFetch = async (url, options = {}, retry = true) => {
  const token = localStorage.getItem("paylio-token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await apiFetch(url, { ...options, headers });
  const data = await parseJsonSafe(response);

  if (!response.ok && retry && isExpiredTokenError(response, data)) {
    const nextToken = await refreshAccessToken();
    return authFetch(
      url,
      {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${nextToken}`,
        },
      },
      false
    );
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
};
