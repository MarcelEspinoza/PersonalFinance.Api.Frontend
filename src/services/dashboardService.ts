import apiClient from "../lib/apiClient";
import type { DashboardAlerts } from "../types/DashboardAlerts";
import type { CivilDate, ConceptKind, ConceptNature, EntryDirection } from "../types/ledger";

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

export interface AccountOutlook {
  accountId: string;
  name: string;
  baseBalance: number;
  pendingIncome: number;
  pendingExpense: number;
  projectedEndBalance: number;
  lowestBalance: number;
  lowestBalanceDate?: CivilDate | null;
  shortfall: number;
  actualBalance: number;
  reconciledBalance?: number | null;
  isReconciled: boolean;
}

export interface OutlookItem {
  dueDate: CivilDate;
  description: string;
  conceptName: string;
  accountId?: string | null;
  accountName?: string | null;
  direction: EntryDirection;
  amount: number;
  isOverdue: boolean;
  isTransfer: boolean;
  isVariableReserve: boolean;
}

export interface TransferSuggestion {
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  before?: CivilDate | null;
}

export interface ConceptDeviation {
  conceptId: string;
  name: string;
  kind: ConceptKind;
  nature: ConceptNature;
  planned: number;
  actual: number;
  pending: number;
  deviation: number;
}

export interface MonthOutlook {
  year: number;
  month: number;
  isPast: boolean;
  isCurrent: boolean;
  accounts: AccountOutlook[];
  unassigned: {
    pendingIncome: number;
    pendingExpense: number;
    variableExpenseReserve: number;
    variableIncomeExpected: number;
  };
  pendingItems: OutlookItem[];
  overdueItems: OutlookItem[];
  suggestedTransfers: TransferSuggestion[];
  uncoveredShortfall: number;
  freeMoney: number;
  variableExpenseReserve: number;
  deviations: ConceptDeviation[];
}

export interface PeriodState {
  status: "notOpened" | "open" | "closed";
  closedAt?: string | null;
  closingBalance?: number | null;
}

export interface DashboardProjection {
  monthlyData: MonthlyData[];
  summary: Summary;
  alerts: DashboardAlerts;
  accounts: DashboardAccount[];
  outlook: MonthOutlook;
  period: PeriodState;
  defaultYear: number;
  defaultMonth: number;
  minYear: number;
  minMonth: number;
}

export const getDashboardProjection = (
  year?: number,
  month?: number,
  includeVariableReserve = true,
) =>
  apiClient.get<DashboardProjection>("/dashboard/projection", {
    params: {
      ...(year && month ? { year, month } : {}),
      includeVariableReserve,
    },
  });

export type AdviceSeverity = "danger" | "warning" | "info" | "good";

export interface MonthAdviceInsight {
  severity: AdviceSeverity;
  title: string;
  detail: string;
}

export interface MonthAdvice {
  available: boolean;
  year: number;
  month: number;
  summary: string;
  insights: MonthAdviceInsight[];
  generatedAt: string;
}

export const getMonthAdvice = (year: number, month: number) =>
  apiClient.post<MonthAdvice>("/dashboard/advice", null, { params: { year, month } });
