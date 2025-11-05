import apiClient from '../lib/apiClient';

export interface PlanSavingsDto {
  monthlyAmount: number;
  months: number;
  startDate?: string;
  userId: string;
}

export const planSavings = (dto: PlanSavingsDto) =>
  apiClient.post('/savings/plan', dto);