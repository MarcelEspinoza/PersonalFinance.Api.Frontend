// src/lib/apiClient.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://localhost:7035/api", // cambia si usas otro puerto en tu .NET
  headers: {
    "Content-Type": "application/json",
  },
});

// Incluir el token JWT si existe
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
