import apiClient from "../lib/apiClient";
import type { BudgetStatus } from "../types/BudgetStatus";

export interface BudgetPayload {
  categoryId: number;
  monthlyLimit: number;
  startMonth: string; // YYYY-MM-01
  endMonth?: string | null;
}

export const budgetService = {
  getMonthlyStatus: (year?: number, month?: number) =>
    apiClient.get<BudgetStatus[]>("/budgets/status", {
      params: { year, month }
    }),

  create: (payload: BudgetPayload) =>
    apiClient.post("/budgets", payload),

  update: (id: string, payload: BudgetPayload) =>
    apiClient.put(`/budgets/${id}`, payload),

  remove: (id: string) =>
    apiClient.delete(`/budgets/${id}`)
};
