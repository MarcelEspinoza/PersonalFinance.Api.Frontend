import apiClient from "../lib/apiClient";
import { Bank } from "../types/bank";

export const bankService = {
  getAll: () => apiClient.get<Bank[]>("/banks"),
  create: (payload: Partial<Bank>) => apiClient.post("/banks", payload),
  update: (id: string, payload: Partial<Bank>) => apiClient.put(`/banks/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/banks/${id}`),
};