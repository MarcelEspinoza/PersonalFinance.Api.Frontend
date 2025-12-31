import apiClient from "../lib/apiClient";
import type { CommitmentStatus } from "../types/CommitmentStatus";

export type CreateCommitmentDto = {
  name: string;
  type: "Income" | "Expense";
  expectedAmount: number;
  tolerance?: number;
  startMonth: string;
  endMonth?: string | null;
  categoryId?: number | null;
  bankId?: string | null;
  isActive: boolean;
};

export const commitmentService = {
  // 🔎 estado mensual
  getMonthlyStatus: (year?: number, month?: number) =>
    apiClient.get<CommitmentStatus[]>("/commitments/status", {
      params: { year, month },
    }),

  // ➕ crear
  create: (payload: CreateCommitmentDto) =>
    apiClient.post("/commitments", payload),

  // ✏️ actualizar
  update: (id: string, payload: CreateCommitmentDto) =>
    apiClient.put(`/commitments/${id}`, payload),

  // ❌ desactivar / borrar
  remove: (id: string) =>
    apiClient.delete(`/commitments/${id}`),
};
