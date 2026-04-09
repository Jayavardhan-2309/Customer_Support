import axios from "axios";
import { logger } from "@/logger";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if(!error.response){
      alert("Network error. Please check your connection.");
      return Promise.reject(error);
    }
    const status = error.response?.status;

    // server errors
    if(status>=500){
      alert("Server error. Please try again later.");
    }

    // Global auth handling
    if (status === 401) {
      logger.warn("Unauthorized or session expired, redirecting to login");
      window.location.href = "/login";
    }

    // Optional: log errors globally
    logger.error("API Error:", error.response?.data || error.message);

    return Promise.reject(error); // IMPORTANT
  }
);

export default api;

// ─── Typed fetcher helpers used by React Query hooks ────────────────────────

export const fetchers = {
  get: <T>(url: string) => api.get<T>(url).then((r) => r.data),
  post: <T>(url: string, body?: unknown) => api.post<T>(url, body).then((r) => r.data),
  patch: <T>(url: string, body?: unknown) => api.patch<T>(url, body).then((r) => r.data),
  delete: <T>(url: string) => api.delete<T>(url).then((r) => r.data),
}
