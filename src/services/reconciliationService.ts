import apiClient from "../lib/apiClient";
import { Reconciliation, ReconciliationSuggestion } from "../types/bank";

export const reconciliationService = {
  getForMonth: (year: number, month: number) => apiClient.get<Reconciliation[]>("/reconciliations", { params: { year, month } }),
  create: (payload: any) => apiClient.post("/reconciliations", payload),
  suggest: (year: number, month: number, bankId?: string) => apiClient.get<ReconciliationSuggestion>("/reconciliations/suggest", { params: { year, month, bankId } }),
  markReconciled: (id: string) => apiClient.post(`/reconciliations/${id}/mark`),
};