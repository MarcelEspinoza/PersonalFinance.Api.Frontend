import apiClient from '../lib/apiClient';

export const IncomesService = {
  getAll: () => apiClient.get("/income"),
  getById: (id: number) => apiClient.get(`/income/${id}`),
  create: (data: any) => apiClient.post("/income", data),
  update: (id: number, data: any) => apiClient.put(`/income/${id}`, data),
  delete: (id: number) => apiClient.delete(`/income/${id}`),
};
