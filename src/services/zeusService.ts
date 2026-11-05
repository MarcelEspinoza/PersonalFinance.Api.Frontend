import apiClient from "../lib/apiClient";

export interface ZeusExpense {
  id: string;
  date: string;
  description: string;
  conceptName: string;
  accountName: string;
  amount: number;
}

export interface ZeusPass {
  id: string;
  purchasedOn: string;
  minutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  expense: ZeusExpense;
}

export interface ZeusUsage {
  id: string;
  date: string;
  minutes: number;
  note?: string | null;
  allocations: { passId: string; purchasedOn: string; minutes: number }[];
}

export interface ZeusSummary {
  purchasedMinutes: number;
  usedMinutes: number;
  availableMinutes: number;
  totalSpent: number;
  passes: ZeusPass[];
  usages: ZeusUsage[];
}

export interface BuyZeusPass {
  id: string;
  minutes: number;
  ledgerEntryId?: string;
  newExpense?: { conceptId: string; accountId: string; date: string; amount: number };
}

export interface SaveZeusUsage {
  id: string;
  date: string;
  minutes: number;
  note: string;
}

export function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours > 0 || remainder === 0 ? `${hours} h` : "", remainder > 0 ? `${remainder} min` : ""]
    .filter(Boolean).join(" ");
}

export const ZeusService = {
  get: async () => (await apiClient.get<ZeusSummary>("/zeus")).data,
  expenses: async (month: string) => (await apiClient.get<ZeusExpense[]>("/zeus/expenses", {
    params: { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) },
  })).data,
  buy: async (payload: BuyZeusPass) => (await apiClient.post<ZeusSummary>("/zeus/passes", payload)).data,
  removePass: async (id: string) => (await apiClient.delete<ZeusSummary>(`/zeus/passes/${id}`)).data,
  saveUsage: async (payload: SaveZeusUsage, editing: boolean) => editing
    ? (await apiClient.put<ZeusSummary>(`/zeus/usage/${payload.id}`, payload)).data
    : (await apiClient.post<ZeusSummary>("/zeus/usage", payload)).data,
  removeUsage: async (id: string) => (await apiClient.delete<ZeusSummary>(`/zeus/usage/${id}`)).data,
};
