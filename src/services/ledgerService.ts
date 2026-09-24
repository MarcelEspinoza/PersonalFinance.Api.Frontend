import apiClient from "../lib/apiClient";
import type {
  ChartOfAccounts,
  ConfirmLedgerEntryPayload,
  CreateLedgerEntryPayload,
  MonthlyEntry,
  MonthlySummary,
  SeedChartOfAccountsResult,
  UpdateLedgerEntryPayload,
} from "../types/ledger";

/**
 * Cliente del dominio nuevo. El usuario nunca viaja en la petición: el
 * backend lo saca del token, así que no hay forma de pedir los datos de otro.
 */
export const LedgerService = {
  getMonth: async (year: number, month: number): Promise<MonthlySummary> => {
    const { data } = await apiClient.get<MonthlySummary>(`/periods/${year}/${month}`);
    return data;
  },

  closeMonth: async (year: number, month: number, actualClosingBalance?: number | null) => {
    const { data } = await apiClient.post<MonthlySummary>(`/periods/${year}/${month}/close`, {
      actualClosingBalance: actualClosingBalance ?? null,
    });
    return data;
  },

  reopenMonth: async (year: number, month: number): Promise<MonthlySummary> => {
    const { data } = await apiClient.post<MonthlySummary>(`/periods/${year}/${month}/reopen`);
    return data;
  },

  createEntry: async (payload: CreateLedgerEntryPayload): Promise<MonthlyEntry> => {
    const { data } = await apiClient.post<MonthlyEntry>("/ledger-entries", payload);
    return data;
  },

  updateEntry: async (id: string, payload: UpdateLedgerEntryPayload): Promise<MonthlyEntry> => {
    const { data } = await apiClient.put<MonthlyEntry>(`/ledger-entries/${id}`, payload);
    return data;
  },

  confirmEntry: async (id: string, payload: ConfirmLedgerEntryPayload): Promise<MonthlyEntry> => {
    const { data } = await apiClient.post<MonthlyEntry>(`/ledger-entries/${id}/confirm`, payload);
    return data;
  },

  unconfirmEntry: async (id: string): Promise<MonthlyEntry> => {
    const { data } = await apiClient.post<MonthlyEntry>(`/ledger-entries/${id}/unconfirm`);
    return data;
  },

  skipEntry: async (id: string): Promise<MonthlyEntry> => {
    const { data } = await apiClient.post<MonthlyEntry>(`/ledger-entries/${id}/skip`);
    return data;
  },

  unskipEntry: async (id: string): Promise<MonthlyEntry> => {
    const { data } = await apiClient.post<MonthlyEntry>(`/ledger-entries/${id}/unskip`);
    return data;
  },

  deleteEntry: async (id: string): Promise<void> => {
    await apiClient.delete(`/ledger-entries/${id}`);
  },

  getChartOfAccounts: async (): Promise<ChartOfAccounts> => {
    const { data } = await apiClient.get<ChartOfAccounts>("/chart-of-accounts");
    return data;
  },

  seedChartOfAccounts: async (
    budgetYear?: number,
    budgetMonth?: number,
  ): Promise<SeedChartOfAccountsResult> => {
    const { data } = await apiClient.post<SeedChartOfAccountsResult>(
      "/chart-of-accounts/seed",
      null,
      { params: { budgetYear, budgetMonth } },
    );
    return data;
  },
};

/** Saca el mensaje que manda el middleware del backend, sin filtrar ruido técnico. */
export function ledgerErrorMessage(error: unknown, fallback = "Ha ocurrido un error."): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ?? fallback;
}
