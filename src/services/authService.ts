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
    const data = res?.data;

    if (!data || !data.token) {
      throw new Error("Respuesta inválida del servidor: falta token");
    }

    localStorage.setItem("token", data.token);

    return { user: data.user, token: data.token };
  } catch (err: any) {
    console.error("Error en login:", err);
    return {
      error: {
        message: err.response?.data?.message || err.message || "Login failed",
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
