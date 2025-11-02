import apiClient from "../lib/apiClient";

export const CategoriesService = {
  getAll: () => apiClient.get("/category"),
  create: (data: { name: string; description?: string; isActive?: boolean }) =>
    apiClient.post("/category", data),
  update: (id: number, data: any) => apiClient.put(`/category/${id}`, data),
  delete: (id: number) => apiClient.delete(`/category/${id}`),
};
