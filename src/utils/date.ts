export function formatDate(value?: string | Date | null): string {
  if (!value) return "";
  // Si ya es Date => usar toISOString (UTC) y quedarnos con YYYY-MM-DD
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    return value.toISOString().split("T")[0];
  }
  // Si es string: intentar parsear y devolver ISO date (UTC)
  const dt = new Date(value);
  if (isNaN(dt.getTime())) {
    // fallback: si la cadena tiene al menos 10 chars, devolver slice (lo que tenías)
    return value.length >= 10 ? value.slice(0, 10) : "";
  }
  return dt.toISOString().split("T")[0];
}