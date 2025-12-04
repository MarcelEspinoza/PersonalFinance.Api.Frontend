// src/services/authService.ts
import apiClient from "../lib/apiClient";

export const authService = {
  register: async (email: string, password: string, fullName: string) => {
    try {
      const res = await apiClient.post("/auth/register", { email, password, fullName });
      return { data: res.data };
    } catch (err: any) {
      return { error: { message: err.response?.data || "Registration failed" } };
    }
  },

  login: async (email: string, password: string) => {
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      return { user: res.data };
    } catch (err: any) {
      // Captura 403, 401 u otros errores del backend
      return {
        error: {
          message: err.response?.data || "Login failed",
        },
      };
    }
  },

  getMe: async () => {
    try {
      const res = await apiClient.get("/Users/me");
      return { user: res.data };
    } catch (err: any) {
      return { error: { message: err.response?.data || "Fetch user failed" } };
    }
  },
};
