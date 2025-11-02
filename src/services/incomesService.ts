// src/services/incomesService.ts
import apiClient from "../lib/apiClient";

export const IncomesService = {
  // --- FIXED INCOMES ---
  getFixed: (userId: string) => apiClient.get(`/incomes/fixed/${userId}`),
  createFixed: (data: any) => apiClient.post("/incomes/fixed", data),
  updateFixed: (id: string, data: any) => apiClient.put(`/incomes/fixed/${id}`, data),
  deleteFixed: (id: string) => apiClient.delete(`/incomes/fixed/${id}`),

  // --- VARIABLE INCOMES ---
  getVariable: (userId: string) => apiClient.get(`/incomes/variable/${userId}`),
  createVariable: (data: any) => apiClient.post("/incomes/variable", data),
  updateVariable: (id: string, data: any) => apiClient.put(`/incomes/variable/${id}`, data),
  deleteVariable: (id: string) => apiClient.delete(`/incomes/variable/${id}`),
};
