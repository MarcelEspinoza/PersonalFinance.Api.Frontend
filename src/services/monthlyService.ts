import apiClient from "../lib/apiClient";

export const MonthlyService = {
  getMonthData: (userId: string, startDate: string, endDate: string) =>
    apiClient.get(`/monthly/${userId}`, {
      params: { startDate, endDate },
    }),
};
