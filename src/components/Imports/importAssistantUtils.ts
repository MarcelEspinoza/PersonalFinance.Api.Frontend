import { EntryDirection } from "../../types/ledger";
import type { CivilDate, ImportRow, PlannedCandidate } from "../../types/ledger";
import type { ReminderRepeat } from "../../types/reminder";
import { money } from "../../utils/civilDate";

/** Amount with its currency; EUR uses the app-wide format ("-33,00 €"). */
export function formatAmount(amount: number, currency?: string | null): string {
  return !currency || currency.toUpperCase() === "EUR" ? money(amount) : `${amount.toFixed(2)} ${currency}`;
}

/** "2026-10-12" -> "12/10/2026". Civil dates are handled as text, never through new Date(string). */
export function formatCivilDate(value: CivilDate | null | undefined): string {
  if (!value || value.length < 10) return value ?? "";
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

const civilDateToUtc = (value: CivilDate) =>
  Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));

/** Absolute number of days between two civil dates. */
export function daysBetween(a: CivilDate, b: CivilDate): number {
  return Math.round(Math.abs(civilDateToUtc(a) - civilDateToUtc(b)) / 86_400_000);
}

/** Collapses whitespace and cuts the text with an ellipsis. */
export function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Bank outflows (negative amounts) can only be deducted from "out" planned entries, inflows from "in" ones. */
export function directionForAmount(amount: number): EntryDirection {
  return amount < 0 ? EntryDirection.Out : EntryDirection.In;
}

export function plannedEntryLabel(candidate: Pick<PlannedCandidate, "conceptName" | "description">): string {
  return candidate.conceptName?.trim() || candidate.description?.trim() || "Previsto sin concepto";
}

/** Planned entries a row can be deducted from: same direction, closest due date first. */
export function candidatesForRow(candidates: PlannedCandidate[], row: ImportRow): PlannedCandidate[] {
  const direction = directionForAmount(row.amount);
  return candidates
    .filter((candidate) => candidate.direction === direction)
    .sort(
      (a, b) =>
        daysBetween(a.dueDate, row.valueDate) - daysBetween(b.dueDate, row.valueDate) ||
        a.dueDate.localeCompare(b.dueDate),
    );
}

/**
 * What would remain of the planned entry once these rows are deducted too.
 * Rows already linked to it are counted in remainingAfterLinks, so they are not subtracted twice.
 */
export function remainingIncludingRows(candidate: PlannedCandidate, rows: ImportRow[]): number {
  const extra = rows
    .filter((row) => row.plannedEntryId !== candidate.id && !candidate.linkedRowIds.includes(row.id))
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);
  return candidate.remainingAfterLinks - extra;
}

/** "quedan 30,00 €", "queda cubierto" or "se supera en 5,00 €". */
export function remainingText(remaining: number): string {
  if (Math.abs(remaining) < 0.005) return "queda cubierto";
  return remaining < 0 ? `se supera en ${money(-remaining)}` : `quedan ${money(remaining)}`;
}

const reminderRepeats: ReminderRepeat[] = ["none", "weekly", "monthly", "yearly"];

/** The assistant sends the repeat as free text; anything unknown is treated as a one-off reminder. */
export function normalizeReminderRepeat(repeat: string | null | undefined): ReminderRepeat {
  const value = repeat?.trim().toLowerCase();
  return reminderRepeats.find((option) => option === value) ?? "none";
}
