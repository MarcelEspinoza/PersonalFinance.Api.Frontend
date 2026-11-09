export function monthLabel(month: number, year: number): string {
  if (isNaN(month) || isNaN(year)) return "—";
  const name = new Date(year, month - 1, 1).toLocaleString("es-ES", { month: "long" });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function shortMonthLabel(month: number, year: number): string {
  if (isNaN(month) || isNaN(year)) return "—";
  const name = new Date(year, month - 1, 1).toLocaleString("es-ES", { month: "short" }).replace(".", "");
  return `${name} ${String(year).slice(2)}`;
}

export function apiErrorText(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  return typeof data === "string" && data ? data : fallback;
}
