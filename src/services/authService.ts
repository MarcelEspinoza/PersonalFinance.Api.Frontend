// src/services/authService.ts
import apiClient from "../lib/apiClient";

export const authService = {
  register: (email: string, password: string, fullName: string) =>
    apiClient.post("/Auth/register", { email, password, fullName }),

  login: (email: string, password: string) =>
    apiClient.post("/Auth/login", { email, password }),

  getMe: (token: string) => 
    apiClient.get('/Users/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
};
