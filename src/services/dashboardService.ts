import apiClient from "../lib/apiClient";
import type { DashboardAlerts } from "../types/DashboardAlerts";

export interface MonthlyData {
  month: string;
  year: number;
  monthNumber: number;
  income: number;
  expense: number;
  balance: number;
  isCurrent: boolean;
  projectionSource: string;
  pendingIncome: number;
  pendingExpense: number;
}

export interface Summary {
  currentBalance: number;
  monthOpeningBalance: number;
  currentMonthIncome: number;
  currentMonthExpense: number;
  currentMonthResult: number;
}

export interface DashboardAccount {
  accountId: string;
  name: string;
  currency: string;
  balance: number;
}

export const getDashboardProjection = () =>
  apiClient.get<{
    monthlyData: MonthlyData[];
    summary: Summary;
    alerts: DashboardAlerts;
    accounts: DashboardAccount[];
  }>("/dashboard/projection");
