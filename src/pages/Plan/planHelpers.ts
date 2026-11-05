import type {
  ExpensePlanMonths,
  ExpensePlanning,
  ExpensePlanningAccount,
  ExpensePlanningItem,
} from "../../services/expensePlanningService";
import { ConceptKind, ConceptNature } from "../../types/ledger";
import { euros, monthLabel, nextMonth, today } from "../../utils/civilDate";

/** How a concept gets its amounts in the plan. */
export type PlanChoice = "monthly" | "bimonthly" | "variable" | "manual";

/** What the «Cambiar» dialog opens: one concept, or a new fixed income or expense. */
export type PlanDialogTarget = { mode: "edit"; conceptId: string } | { mode: "new"; kind: ConceptKind };

export interface PlanConcept {
  item: ExpensePlanningItem;
  kind: ConceptKind;
  groupName: string;
}

/** null = empty, undefined = not a valid amount. Accepts "70,5", "70.5" and "2.400". */
export function parseAmount(text: string): number | null | undefined {
  const trimmed = text.trim().replace(/\s*€$/, "");
  if (!trimmed) return null;
  const normalized = /^\d{1,3}(\.\d{3})+(,\d*)?$/.test(trimmed)
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : undefined;
}

export function serverMessage(error: unknown): string | null {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  return typeof data === "string" && data.trim() ? data : null;
}

/** 70.5 -> "70,5", for a text box. */
export const amountText = (value?: number | null) => (value == null ? "" : String(value).replace(".", ","));

export const sameAmount = (a?: number | null, b?: number | null) =>
  a == null || b == null ? a == null && b == null : Math.abs(a - b) < 0.005;

export const choiceOf = (item: ExpensePlanningItem): PlanChoice =>
  item.nature === ConceptNature.Variable ? "variable" : (item.frequency ?? "manual");

export const repeatsByItself = (item: ExpensePlanningItem) =>
  item.nature === ConceptNature.Fixed && item.frequency != null;

export function conceptsById(planning: ExpensePlanning | null): Map<string, PlanConcept> {
  const concepts = new Map<string, PlanConcept>();
  for (const group of planning?.groups ?? []) {
    for (const item of group.items) concepts.set(item.conceptId, { item, kind: group.kind, groupName: group.name });
  }
  return concepts;
}

/** Where a row's amounts come from, e.g. "Cada mes · día 5 · Conjunta 1646". */
export function scheduleText(concept: PlanConcept, accounts: ExpensePlanningAccount[]): string {
  const { item } = concept;
  const choice = choiceOf(item);
  if (choice === "manual") return "No se repite solo · cuenta lo apuntado";
  if (choice === "variable") {
    if (item.monthlyBudget == null) return "Varía · cuenta lo apuntado";
    return concept.kind === ConceptKind.Income
      ? `Varía · unos ${euros(item.monthlyBudget)} al mes`
      : `Varía · máximo ${euros(item.monthlyBudget)} al mes`;
  }
  const account = accounts.find((candidate) => candidate.id === item.accountId)?.name;
  return [choice === "bimonthly" ? "Cada 2 meses" : "Cada mes", item.dayOfMonth ? `día ${item.dayOfMonth}` : null, account]
    .filter(Boolean)
    .join(" · ");
}

const monthNumber = (year: number, month: number) => year * 12 + month;

function currentMonth() {
  const now = today();
  return { year: Number(now.slice(0, 4)), month: Number(now.slice(5, 7)) };
}

/**
 * Concepts with something already in this month or a later one. If they start repeating by
 * themselves, what is already noted could count twice.
 */
export function conceptsWithAmountsAhead(data: ExpensePlanMonths | null): Set<string> {
  const ids = new Set<string>();
  if (!data) return ids;
  const now = currentMonth();
  const ahead = data.months.map((month) => monthNumber(month.year, month.month) >= monthNumber(now.year, now.month));
  for (const row of [...(data.income ?? []), ...data.fixed]) {
    if (row.cells.some((cell, index) => ahead[index] && Math.abs(cell.amount) > 0.005)) ids.add(row.conceptId);
  }
  for (const row of data.variable) {
    if (row.cells.some((cell, index) => ahead[index] && cell.planned > 0.005)) ids.add(row.conceptId);
  }
  return ids;
}

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/** "2026-11" of today. */
export function thisMonthKey(): string {
  const now = currentMonth();
  return monthKey(now.year, now.month);
}

/** Choices for the next bill: this month, the next one and the one already saved. */
export function monthChoices(saved: string): { value: string; label: string }[] {
  const now = currentMonth();
  const next = nextMonth(now.year, now.month);
  const thisKey = monthKey(now.year, now.month);
  const nextKey = monthKey(next.year, next.month);
  const values = [thisKey, nextKey];
  if (saved && !values.includes(saved)) values.push(saved);
  return values.sort().map((value) => {
    const note = value === thisKey ? " (este mes)" : value === nextKey ? " (el que viene)" : "";
    return { value, label: monthLabel(Number(value.slice(0, 4)), Number(value.slice(5, 7))) + note };
  });
}
