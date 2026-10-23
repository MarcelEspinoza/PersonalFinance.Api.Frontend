import type { Reminder, ReminderRepeat } from "../../types/reminder";
import { civilDate, today } from "../../utils/civilDate";

export const MAX_NOTIFY_DAYS = 30;

export const REPEAT_OPTIONS: { value: ReminderRepeat; label: string }[] = [
  { value: "none", label: "Una vez" },
  { value: "weekly", label: "Cada semana" },
  { value: "monthly", label: "Cada mes" },
  { value: "yearly", label: "Cada año" },
];

export const SNOOZE_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: "1 día" },
  { days: 3, label: "3 días" },
  { days: 7, label: "7 días" },
];

export type ReminderUrgency = "overdue" | "today" | "soon";

export const URGENCY_LABEL: Record<ReminderUrgency, string> = {
  overdue: "Vencido",
  today: "Hoy",
  soon: "Pronto",
};

export function repeatLabel(repeat: ReminderRepeat): string {
  return REPEAT_OPTIONS.find((option) => option.value === repeat)?.label ?? "Una vez";
}

/** Option text for the "Avisarme" select. */
export function noticeOptionLabel(days: number): string {
  if (days <= 0) return "El mismo día";
  return days === 1 ? "1 día antes" : `${days} días antes`;
}

export function noticeLabel(days: number): string {
  if (days <= 0) return "Avisa el mismo día";
  return days === 1 ? "Avisa 1 día antes" : `Avisa ${days} días antes`;
}

export function clampNoticeDays(days: number | null | undefined): number {
  const value = Math.round(Number(days ?? 0));
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_NOTIFY_DAYS, Math.max(0, value));
}

/** "2026-01-05" (or an ISO datetime) -> "05/01/2026". */
export function formatCivilDate(value: string | null | undefined): string {
  if (!value || value.length < 10) return "";
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Timestamps (completedAt, createdAt) shown as the local day "dd/MM/yyyy". */
export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatCivilDate(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

function dayNumber(value: string): number {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return Date.UTC(year, month - 1, day) / 86400000;
}

export function addDaysCivil(value: string, days: number): string {
  const date = new Date((dayNumber(value) + days) * 86400000);
  return civilDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Whole days from `from` to `value` (negative when `value` is in the past). */
export function daysUntil(value: string, from: string = today()): number {
  return Math.round(dayNumber(value) - dayNumber(from));
}

/** "hoy", "mañana", "en 3 días", "hace 2 días"… */
export function relativeDayLabel(value: string, from: string = today()): string {
  const days = daysUntil(value, from);
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days === -1) return "ayer";
  return days > 0 ? `en ${days} días` : `hace ${-days} días`;
}

/** Badge for active reminders: overdue, due today, or inside its notice window. */
export function reminderUrgency(reminder: Reminder, todayValue: string = today()): ReminderUrgency | null {
  if (reminder.isDone) return null;
  const dueDate = reminder.dueDate.slice(0, 10);
  if (dueDate < todayValue) return "overdue";
  if (dueDate === todayValue) return "today";
  const noticeStart = addDaysCivil(dueDate, -clampNoticeDays(reminder.notifyDaysBefore));
  return todayValue >= noticeStart ? "soon" : null;
}

/** Day the bell shows it again, only while it is snoozed into the future. */
export function activeSnoozeDate(reminder: Reminder, todayValue: string = today()): string | null {
  const value = reminder.snoozedUntil?.slice(0, 10);
  return !reminder.isDone && value && value > todayValue ? value : null;
}

/**
 * Accepts "49,99", "49.99", "1.234,56" or "1.200" (dots as thousands separators, as in es-ES).
 * Returns null when empty and NaN when it is not a number.
 */
export function parseAmount(text: string): number | null {
  const raw = text.trim().replace(/[\s€]/g, "");
  if (!raw) return null;
  const thousandsOnly = /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(raw);
  const normalized = raw.includes(",") || thousandsOnly ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return /^-?(\d+(\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/** 49.9 -> "49,9" so it can be edited with the decimal comma. */
export function formatAmountInput(value: number | null | undefined): string {
  return value === null || value === undefined || value === 0 ? "" : String(value).replace(".", ",");
}

export function hasAmount(reminder: Reminder): reminder is Reminder & { amount: number } {
  return typeof reminder.amount === "number" && reminder.amount !== 0;
}

/** Active ones first (closest date first), then the done ones (most recent first). */
export function sortReminders(items: Reminder[]): Reminder[] {
  return [...items].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    if (!a.isDone) return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title, "es");
    return (b.completedAt ?? b.dueDate).localeCompare(a.completedAt ?? a.dueDate);
  });
}
