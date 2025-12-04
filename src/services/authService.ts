// src/services/authService.ts
import apiClient from "../lib/apiClient";

export const authService = {
  register: (email: string, password: string, fullName: string) =>
    apiClient.post("/auth/register", { email, password, fullName }),

  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),

  // No pasar token aquí: apiClient ya inyecta Authorization desde localStorage
  getMe: () => apiClient.get("/Users/me"),
};