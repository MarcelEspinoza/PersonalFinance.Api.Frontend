import apiClient from "../lib/apiClient";
import type { BudgetStatus } from "../types/BudgetStatus";

export type CreateBudgetDto = {
  categoryId: number;
  monthlyLimit: number;
  startMonth: string;
  endMonth?: string | null;
  isActive: boolean;
};

export const budgetService = {
  // 🔎 estado mensual (dashboard)
  getMonthlyStatus: (year?: number, month?: number) =>
    apiClient.get<BudgetStatus[]>("/budgets/status", {
      params: { year, month },
    }),

  // ➕ crear presupuesto
  create: (payload: CreateBudgetDto) =>
    apiClient.post("/budgets", payload),

  // ✏️ actualizar
  update: (id: string, payload: CreateBudgetDto) =>
    apiClient.put(`/budgets/${id}`, payload),

  // ❌ desactivar / borrar
  remove: (id: string) =>
    apiClient.delete(`/budgets/${id}`),
};
