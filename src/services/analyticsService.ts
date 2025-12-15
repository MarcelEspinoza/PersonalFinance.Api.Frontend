import apiClient from "../lib/apiClient";

export const analyticsService = {
  getMonthly: (year: number, month: number, bankId?: string) => {
    return apiClient.get("/analytics/monthly", {
      params: { year, month, bankId },
    });
  },
};
