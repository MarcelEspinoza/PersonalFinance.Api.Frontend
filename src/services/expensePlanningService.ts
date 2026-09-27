import apiClient from "../lib/apiClient";
import { ConceptNature } from "../types/ledger";

export interface ExpensePlanningItem {
  conceptId: string;
  name: string;
  nature: ConceptNature;
  monthlyAmount?: number | null;
  monthlyBudget?: number | null;
  dayOfMonth?: number | null;
  accountId?: string | null;
}

export interface ExpensePlanningGroup {
  name: string;
  sortOrder: number;
  items: ExpensePlanningItem[];
}

export interface ExpensePlanningAccount {
  id: string;
  name: string;
}

export interface ExpensePlanning {
  groups: ExpensePlanningGroup[];
  accounts: ExpensePlanningAccount[];
}

export interface UpdateExpensePlanning {
  nature: ConceptNature;
  monthlyAmount?: number | null;
  monthlyBudget?: number | null;
  dayOfMonth?: number | null;
  accountId?: string | null;
}

export const expensePlanningService = {
  get: async (): Promise<ExpensePlanning> => {
    const { data } = await apiClient.get<ExpensePlanning>("/expense-planning");
    return data;
  },

  update: async (
    conceptId: string,
    payload: UpdateExpensePlanning,
  ): Promise<ExpensePlanningItem> => {
    const { data } = await apiClient.put<ExpensePlanningItem>(
      `/expense-planning/${conceptId}`,
      payload,
    );
    return data;
  },
};
