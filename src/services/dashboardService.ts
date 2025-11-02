import apiClient from '../lib/apiClient';

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savings: number;
}

export async function getDashboardData() {
  const response = await apiClient.get<{ monthlyData: MonthlyData[]; summary: Summary }>('/dashboard');
  return response.data;
}
