import apiClient from '../lib/apiClient';

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
  isCurrent: boolean;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savings: number;
}


export const getDashboardProjection = () =>
  apiClient.get<{ monthlyData: MonthlyData[]; summary: Summary }>("/dashboard/projection");

