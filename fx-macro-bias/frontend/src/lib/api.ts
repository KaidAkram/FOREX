import axios from "axios";

// In development, Next.js rewrites /api/* → http://localhost:8001/api/*
// In production, set NEXT_PUBLIC_API_URL
const configuredBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const BASE_URL = configuredBase.endsWith("/api") ? configuredBase : `${configuredBase}/api`;

export const api = axios.create({
  baseURL: `${BASE_URL}/admin`,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  headers: {
    "Content-Type": "application/json",
    // Dev bypass: no Authorization header required
    // In prod, intercept to add: Authorization: `Bearer ${token}`
  },
  timeout: 30_000,
});

let tokenRefresh: Promise<void> | null = null;
api.interceptors.request.use(async (config) => {
  if (typeof window === 'undefined') return config;
  let token = sessionStorage.getItem('shiftfx_access');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      if (payload.exp * 1000 < Date.now() + 60000) {
        tokenRefresh ||= (async () => {
          const response = await fetch('/api/auth/token/refresh/', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh:sessionStorage.getItem('shiftfx_refresh')})});
          if (!response.ok) throw new Error('Administrator session expired. Please sign in again.');
          const data = await response.json();
          sessionStorage.setItem('shiftfx_access',data.access);
          if (data.refresh) sessionStorage.setItem('shiftfx_refresh',data.refresh);
        })().finally(() => {tokenRefresh = null;});
        await tokenRefresh;
        token = sessionStorage.getItem('shiftfx_access');
      }
    } catch {throw new Error('Administrator session expired. Please sign in again.');}
    config.headers.Authorization = 'Bearer '+token;
  }
  return config;
});

// ── Response interceptor for consistent error handling ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.response?.data?.detail ??
      error.message ??
      "An unexpected error occurred.";
    return Promise.reject(new Error(message));
  }
);

// ── Typed API helpers ────────────────────────────────────

export const dashboardApi = {
  kpis: () => api.get("/dashboard/kpis"),
  latestData: () => api.get("/dashboard/latest-data"),
  dataStatus: () => api.get("/dashboard/data-status"),
};

export const rulesApi = {
  list: (indicator: string) => api.get(`/rating-rules/${indicator}`),
  create: (indicator: string, data: object) => api.post(`/rating-rules/${indicator}`, data),
  update: (indicator: string, id: number, data: object) =>
    api.put(`/rating-rules/${indicator}/${id}`, data),
  delete: (indicator: string, id: number) => api.delete(`/rating-rules/${indicator}/${id}`),
};

export const macroDataApi = {
  matrix: (indicator: string) => api.get(`/macro-data/matrix?indicator=${indicator}`),
  refreshFxReserves: () => api.post("/macro-data/fx-reserves/refresh", {}, { timeout: 180_000 }),
  refreshEquity: () => api.post("/macro-data/equity/refresh", {}, { timeout: 180_000 }),
  manualEntry: (data: object) => api.post("/macro-data/manual-entry", data),
  differential: (pair: string, indicator: string) =>
    api.get(`/macro-data/differential?pair=${pair}&indicator=${indicator}`),
  rating: (pair: string, indicator: string) =>
    api.get(`/macro-data/rating?pair=${pair}&indicator=${indicator}`),
  recalculate: (data: object) => api.post("/macro-data/recalculate", data),
};

export const finalScoreApi = {
  matrix: () => api.get("/final-score/matrix"),
  drilldown: (pair: string, month: string) =>
    api.get(`/final-score/drilldown?pair=${pair}&month=${month}`),
};

export const settingsApi = {
  get: () => api.get("/settings"),
  save: (data: object) => api.post("/settings", data),
  runScraper: () => api.post("/settings/run-scraper", {}, { timeout: 90_000 }),
  auditLogs: () => api.get("/settings/audit-logs"),
};

