import apiClient from "../lib/apiClient";
import { Reconciliation, ReconciliationSuggestion } from "../types/bank";

export const reconciliationService = {
  getForMonth: (year: number, month: number) =>
    apiClient.get<Reconciliation[]>("/reconciliations", { params: { year, month } }),

  create: (payload: any) => apiClient.post("/reconciliations", payload),

  suggest: (year: number, month: number, bankId?: string) =>
    apiClient.get<ReconciliationSuggestion>("/reconciliations/suggest", { params: { year, month, bankId } }),

  // Ahora acepta reconciledAtIso opcional y lo envía como query param si existe
  markReconciled: (id: string, reconciledAtIso?: string | null) => {
    const url = `/reconciliations/${id}/mark`;
    if (reconciledAtIso) {
      // enviamos un POST vacío con params para que el controller reciba reconciledAt desde query
      return apiClient.post(url, null, { params: { reconciledAt: reconciledAtIso } });
    }
    return apiClient.post(url);
  },
};

export default reconciliationService;