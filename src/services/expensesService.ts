// src/services/expensesService.ts
import apiClient from "../lib/apiClient";

export const ExpensesService = {
  // --- FIXED EXPENSES ---
  getFixed: (userId: string) => apiClient.get(`/expenses/fixed/${userId}`),
  createFixed: (data: any) => apiClient.post("/expenses/fixed", data),
  updateFixed: (id: string, data: any) => apiClient.put(`/expenses/fixed/${id}`, data),
  deleteFixed: (id: string) => apiClient.delete(`/expenses/fixed/${id}`),

  // --- VARIABLE EXPENSES ---
  getVariable: (userId: string) => apiClient.get(`/expenses/variable/${userId}`),
  createVariable: (data: any) => apiClient.post("/expenses/variable", data),
  updateVariable: (id: string, data: any) => apiClient.put(`/expenses/variable/${id}`, data),
  deleteVariable: (id: string) => apiClient.delete(`/expenses/variable/${id}`),

  // --- TEMPORARY MOVEMENTS ---
  getTemporary: (userId: string) => apiClient.get(`/expenses/temporary/${userId}`),
  createTemporary: (data: any) => apiClient.post("/expenses/temporary", data),
  updateTemporary: (id: string, data: any) => apiClient.put(`/expenses/temporary/${id}`, data),
  deleteTemporary: (id: string) => apiClient.delete(`/expenses/temporary/${id}`),
};
