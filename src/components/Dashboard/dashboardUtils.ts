import type { MonthOutlook, OutlookItem } from "../../services/dashboardService";
import { EntryDirection } from "../../types/ledger";

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const ledgerLink = (year: number, month: number) => `/ledger?year=${year}&month=${month}`;

export const reconcileLink = (year: number, month: number) => `/monthly?year=${year}&month=${month}`;

/** Year and month of a civil date such as "2026-10-24". */
export function monthOf(date: string): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

/** "a", "a y b", "a, b y c". */
export function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

const APP_ROUTES = [
  "/dashboard",
  "/monthly",
  "/ledger",
  "/plan",
  "/imports",
  "/movements",
  "/loans",
  "/pasanaco",
  "/settlements",
  "/reminders",
  "/assistant",
  "/settings",
  "/ayuda",
];

/** The action, but only when it points to a screen that exists in the app (some backend alerts don't). */
export function appRoute(action?: string | null): string | null {
  if (!action || !action.startsWith("/")) return null;
  const path = action.split(/[?#]/)[0].replace(/\/+$/, "");
  return APP_ROUTES.some((route) => path === route || path.startsWith(`${route}/`)) ? action : null;
}

export type PendingFlows = {
  toCollect: number;
  collectCount: number;
  toPay: number;
  payCount: number;
  /** Estimated variable spending included in `toPay`. */
  variableExpense: number;
  /** Expected variable income included in `toCollect`. */
  variableIncome: number;
};

const sumAmounts = (items: OutlookItem[]) => items.reduce((total, item) => total + item.amount, 0);

/** What is still to come in and go out in the month. Transfers between your own accounts are left out. */
export function pendingFlows(outlook: MonthOutlook): PendingFlows {
  const items = outlook.pendingItems.filter((item) => !item.isTransfer);
  const incomes = items.filter((item) => item.direction === EntryDirection.In);
  const expenses = items.filter((item) => item.direction === EntryDirection.Out);
  const reserveItems = expenses.filter((item) => item.isVariableReserve);
  const unassignedReserve = outlook.unassigned.variableExpenseReserve;
  const variableIncome = outlook.unassigned.variableIncomeExpected;

  return {
    toCollect: sumAmounts(incomes) + variableIncome,
    collectCount: incomes.length,
    toPay: sumAmounts(expenses) + unassignedReserve,
    payCount: expenses.length - reserveItems.length,
    variableExpense: sumAmounts(reserveItems) + unassignedReserve,
    variableIncome,
  };
}
