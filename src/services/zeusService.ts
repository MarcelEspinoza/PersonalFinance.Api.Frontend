import apiClient from "../lib/apiClient";

export interface ZeusExpense {
  id: string;
  date: string;
  description: string;
  conceptName: string;
  accountName: string;
  amount: number;
  allocatedAmount?: number;
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
  startTime?: string | null;
  endTime?: string | null;
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
  careStays: ZeusCareStay[];
}

export type ZeusCareProvider = "daycare" | "alessia";
export type ZeusCareKind = "day" | "night";

export interface ZeusCareStay {
  id: string;
  provider: ZeusCareProvider;
  kind: ZeusCareKind;
  date: string;
  startTime: string | null;
  endTime: string | null;
  nights: number;
  amount: number;
  note: string | null;
  expense: ZeusExpense | null;
}

export type SaveZeusCareStay = Omit<ZeusCareStay, "expense">;

export interface PayZeusCare {
  stayIds: string[];
  ledgerEntryId?: string;
  newExpense?: BuyZeusPass["newExpense"];
}

export const zeusDaycarePackages = [
  { id: "6-1", days: 1, dailyHours: 6, price: 13 },
  { id: "6-5", days: 5, dailyHours: 6, price: 55 },
  { id: "6-10", days: 10, dailyHours: 6, price: 100 },
  { id: "6-20", days: 20, dailyHours: 6, price: 160 },
  { id: "12-1", days: 1, dailyHours: 12, price: 21 },
  { id: "12-5", days: 5, dailyHours: 12, price: 95 },
  { id: "12-10", days: 10, dailyHours: 12, price: 180 },
  { id: "12-20", days: 20, dailyHours: 12, price: 320 },
];

export function daycareNightPrice(nights: number) {
  return nights >= 6 ? nights * 21 : [0, 28, 52, 75, 96, 115][nights];
}

export function careProviderName(provider: ZeusCareProvider) {
  return provider === "alessia" ? "Alessia · Niñera" : "Guardería";
}

export function timeRangeMinutes(startTime: string, endTime: string) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return (endHour - startHour) * 60 + endMinute - startMinute;
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
  startTime: string;
  endTime: string;
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
  expenses: async (month: string, provider?: ZeusCareProvider) => (await apiClient.get<ZeusExpense[]>("/zeus/expenses", {
    params: { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)), provider },
  })).data,
  buy: async (payload: BuyZeusPass) => (await apiClient.post<ZeusSummary>("/zeus/passes", payload)).data,
  removePass: async (id: string) => (await apiClient.delete<ZeusSummary>(`/zeus/passes/${id}`)).data,
  saveUsage: async (payload: SaveZeusUsage, editing: boolean) => editing
    ? (await apiClient.put<ZeusSummary>(`/zeus/usage/${payload.id}`, payload)).data
    : (await apiClient.post<ZeusSummary>("/zeus/usage", payload)).data,
  removeUsage: async (id: string) => (await apiClient.delete<ZeusSummary>(`/zeus/usage/${id}`)).data,
  saveCare: async (payload: SaveZeusCareStay, editing: boolean) => editing
    ? (await apiClient.put<ZeusSummary>(`/zeus/care/${payload.id}`, payload)).data
    : (await apiClient.post<ZeusSummary>("/zeus/care", payload)).data,
  removeCare: async (id: string) => (await apiClient.delete<ZeusSummary>(`/zeus/care/${id}`)).data,
  payCare: async (payload: PayZeusCare) => (await apiClient.post<ZeusSummary>("/zeus/care/payments", payload)).data,
  unlinkCarePayment: async (id: string) => (await apiClient.delete<ZeusSummary>(`/zeus/care/${id}/payment`)).data,
};
