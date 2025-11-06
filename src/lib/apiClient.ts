import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // ← ahora usa variable de entorno
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
