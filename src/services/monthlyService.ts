// src/services/monthlyService.ts
import apiClient from "../lib/apiClient";

export const MonthlyService = {
  getMonthData: (userId: string, start: string, end: string) =>
    apiClient.get(`/dashboard/monthly`, {
      params: { userId, start, end },
    }),
};
