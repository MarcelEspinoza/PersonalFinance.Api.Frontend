import apiClient from "../lib/apiClient";
import type { Bank } from "../types/bank";

export const bankService = {
  getAll: () => apiClient.get<Bank[]>("/banks"),
  getById: (id: string) => apiClient.get<Bank>(`/banks/${id}`),
  create: (payload: Partial<Bank>) => apiClient.post("/banks", payload),
  update: (id: string, payload: Partial<Bank>) => apiClient.put(`/banks/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/banks/${id}`),
  updateColor: (id: string, color: string) => apiClient.put(`/banks/${id}`, { color }),
};

export default bankService;