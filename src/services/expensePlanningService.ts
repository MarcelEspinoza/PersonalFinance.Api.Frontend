import apiClient from "../lib/apiClient";
import { ConceptKind, ConceptNature } from "../types/ledger";

export type PlanningFrequency = "monthly" | "bimonthly";

export interface ExpensePlanningItem {
  conceptId: string;
  name: string;
  nature: ConceptNature;
  monthlyAmount?: number | null;
  monthlyBudget?: number | null;
  dayOfMonth?: number | null;
  accountId?: string | null;
  frequency?: PlanningFrequency | null;
  /** Primer día del mes del próximo recibo, p. ej. "2026-11-01". */
  nextDueMonth?: string | null;
}

export interface ExpensePlanningGroup {
  name: string;
  kind: ConceptKind;
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
  frequency?: PlanningFrequency | null;
  firstDueMonth?: string | null;
}

export interface ExpensePlanMonth {
  year: number;
  month: number;
  isCurrent: boolean;
  isClosed: boolean;
  income: number;
  fixedExpense: number;
  variableExpense: number;
}

export interface ExpensePlanFixedRow {
  conceptId: string;
  name: string;
  groupName?: string | null;
  cells: { amount: number; paid: boolean }[];
}

export interface ExpensePlanVariableCell {
  /** The month's own limit when it has one, otherwise the usual limit. */
  budget?: number | null;
  isOverride: boolean;
  spent: number;
  /** Paid plus still pending entries of the month. */
  planned: number;
  /** What the forecast counts: the larger of planned and budget. */
  counted: number;
}

export interface ExpensePlanVariableRow {
  conceptId: string;
  name: string;
  groupName?: string | null;
  defaultBudget?: number | null;
  cells: ExpensePlanVariableCell[];
}

export interface ExpensePlanMonths {
  months: ExpensePlanMonth[];
  fixed: ExpensePlanFixedRow[];
  variable: ExpensePlanVariableRow[];
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

  /** 6 months of fixed and variable expenses, from the given month (default: the current one). */
  getMonths: async (start?: { year: number; month: number }): Promise<ExpensePlanMonths> => {
    const { data } = await apiClient.get<ExpensePlanMonths>("/expense-planning/months", { params: start });
    return data;
  },

  /** Usual monthly limit of a variable expense; null removes it. */
  setDefaultBudget: async (conceptId: string, limit: number | null): Promise<void> => {
    await apiClient.put(`/expense-planning/${conceptId}/budget`, { limit });
  },

  /** Limit for one month only; null goes back to the usual limit. */
  setMonthBudget: async (conceptId: string, year: number, month: number, limit: number | null): Promise<void> => {
    await apiClient.put(`/expense-planning/${conceptId}/budget/${year}/${month}`, { limit });
  },
};
