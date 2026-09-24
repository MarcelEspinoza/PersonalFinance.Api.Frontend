import type { CivilDate } from "../types/ledger";

/**
 * Fechas civiles "YYYY-MM-DD" tratadas como texto.
 *
 * El backend usa DateOnly: un día del calendario, sin hora ni zona. Pasar
 * esas cadenas por `new Date(...)` las interpreta como medianoche UTC, y en
 * España eso muestra el día anterior durante el horario de verano. Aquí no
 * se construye ningún Date salvo para formatear, y siempre con sus partes
 * explícitas.
 */

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

export function monthLabel(year: number, month: number): string {
  return `${monthName(month)} ${year}`;
}

export function civilDate(year: number, month: number, day: number): CivilDate {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function today(): CivilDate {
  const now = new Date();
  return civilDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function firstDayOf(year: number, month: number): CivilDate {
  return civilDate(year, month, 1);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** "2026-01-25" -> "25 ene" */
export function shortDate(value: CivilDate | null | undefined): string {
  if (!value || value.length < 10) return "";

  const day = Number(value.slice(8, 10));
  const month = Number(value.slice(5, 7));

  return `${day} ${monthName(month).slice(0, 3)}`;
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

const CURRENCY = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function money(value: number | null | undefined): string {
  return CURRENCY.format(value ?? 0);
}
