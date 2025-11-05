import apiClient from '../lib/apiClient';

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
  isCurrent: boolean;
  savings: number;
  projectedSavings: number; 
  plannedBalance: number; // ahorro proyectado del mes
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savings: number;
  projectedSavings: number;  // suma de ahorros proyectados futuros
  plannedBalance: number;
}


export const getDashboardProjection = () =>
  apiClient.get<{ monthlyData: MonthlyData[]; summary: Summary }>("/dashboard/projection");

