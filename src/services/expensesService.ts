import apiClient from "../lib/apiClient";

export const ExpensesService = {
  getAll: (year?: number, month?: number) =>
    apiClient.get("/expense", { params: year && month ? { year, month } : undefined }),
  getById: (id: number) => apiClient.get(`/expense/${id}`),
  create: (data: any) => apiClient.post("/expense", data),
  update: (id: number, data: any) => apiClient.put(`/expense/${id}`, data),
  delete: (id: number) => apiClient.delete(`/expense/${id}`),

  
};
