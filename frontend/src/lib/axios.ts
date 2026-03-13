import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1/",
  withCredentials: true, //REQUIRED for httpOnly cookies
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
