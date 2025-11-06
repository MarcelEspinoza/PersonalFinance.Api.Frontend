import apiClient from "../lib/apiClient";

interface CategoryData {
  name: string;
  description?: string;
  isActive?: boolean;
}

export const CategoriesService = {
  getAll: () => apiClient.get("/category").then(r => r.data),
  create: (data: CategoryData) =>
    apiClient.post("/category", data).then(r => r.data),
  update: (id: number, data: Partial<CategoryData>) => apiClient.put(`/category/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/category/${id}`).then(r => r.data),
};
