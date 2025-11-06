import apiClient from "../lib/apiClient";

export const CategoriesService = {
  getAll: () => apiClient.get("/category").then(r => r.data),
  create: (data: { name: string; description?: string; isActive?: boolean }) =>
    apiClient.post("/category", data).then(r => r.data),
  update: (id: number, data: any) => apiClient.put(`/category/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/category/${id}`).then(r => r.data),
};
