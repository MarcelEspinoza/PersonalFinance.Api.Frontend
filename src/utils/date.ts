export function formatDate(dateString: string | null | undefined): string {
  return dateString ? dateString.slice(0, 10) : "";
}
