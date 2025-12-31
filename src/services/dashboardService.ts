import apiClient from "../lib/apiClient";
import type { DashboardAlerts } from "../types/DashboardAlerts";

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
  savings: number;
  projectedSavings: number;
  plannedBalance?: number;
  isCurrent: boolean;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savings: number;
  projectedSavings: number;
  plannedBalance: number;
}

export const getDashboardProjection = () =>
  apiClient.get<{
    monthlyData: MonthlyData[];
    summary: Summary;
    alerts: DashboardAlerts;
  }>("/dashboard/projection");


