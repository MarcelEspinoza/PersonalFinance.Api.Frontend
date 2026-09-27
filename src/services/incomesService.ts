import apiClient from '../lib/apiClient';

export const IncomesService = {
  getAll: (year?: number, month?: number) =>
    apiClient.get("/income", { params: year && month ? { year, month } : undefined }),
  getById: (id: number) => apiClient.get(`/income/${id}`),
  create: (data: any) => apiClient.post("/income", data),
  update: (id: number, data: any) => apiClient.put(`/income/${id}`, data),
  delete: (id: number) => apiClient.delete(`/income/${id}`),
};
