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
      console.log("Unauthorized or session expired, redirecting to login");
      window.location.href = "/login";
    }

    // Optional: log errors globally
    console.error("API Error:", error.response?.data || error.message);

    return Promise.reject(error); // IMPORTANT
  }
);

export default api;
