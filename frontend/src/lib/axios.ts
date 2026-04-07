import axios from "axios";

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
    const status = error.response?.status;

    // Global auth handling
    if (status === 401) {
      console.log("Unauthorized → redirecting to login");
      window.location.href = "/login";
    }

    // Optional: log errors globally
    console.error("API Error:", error.response?.data || error.message);

    return Promise.reject(error); // IMPORTANT
  }
);

export default api;
