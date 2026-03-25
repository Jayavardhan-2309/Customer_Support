import axios from "axios";

const api = axios.create({
  baseURL: "https://customer-support-1nng.onrender.com/api/v1/",
  withCredentials: true, //REQUIRED for httpOnly cookies
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
