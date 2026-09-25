import axios from "axios";

// In development, Next.js rewrites /api/* → http://localhost:8000/api/*
// In production, set NEXT_PUBLIC_API_URL
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/admin`,
  headers: {
    "Content-Type": "application/json",
    // Dev bypass: no Authorization header required
    // In prod, intercept to add: Authorization: `Bearer ${token}`
  },
  timeout: 15_000,
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
  runScraper: () => api.post("/settings/run-scraper"),
};

