import type { CivilDate, MonthlyEntry, MonthlyGroup } from "../../types/ledger";

interface SearchToken {
  text: string;
  amount: { whole: string; cents: string | null } | null;
  date: { day: number; month: number; year: number | null } | null;
}

export interface LedgerSearchResult {
  /** Matching groups by groupId with only their matching concepts and entries; totals are left untouched. */
  groups: Map<string, MonthlyGroup>;
  count: number;
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** "45" matches any 45,xx; "45,9" or "45.9" matches 45,90-45,99; "1.234,56" and "1,234.56" are read as thousands. */
function parseAmount(token: string): SearchToken["amount"] {
  let value = token.replace(/^[+-]/, "");
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) value = value.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(value)) value = value.replace(/,/g, "");
  else value = value.replace(",", ".");

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  return match ? { whole: String(Number(match[1])), cents: match[2] ?? null } : null;
}

/** dd/mm or dd/mm/yyyy (also d/m and yy). */
function parseDate(token: string): SearchToken["date"] {
  const match = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(token);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const year = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : null;
  return { day, month, year };
}

/** Splits the term into tokens (all must match); null when there is nothing to search. */
export function parseLedgerSearch(term: string): SearchToken[] | null {
  const tokens = normalize(term).replace(/€/g, " ").split(/\s+/).filter(Boolean);
  return tokens.length > 0
    ? tokens.map((text) => ({ text, amount: parseAmount(text), date: parseDate(text) }))
    : null;
}

function amountMatches(value: number | null | undefined, amount: NonNullable<SearchToken["amount"]>) {
  if (value === null || value === undefined) return false;
  const [whole, cents] = Math.abs(value).toFixed(2).split(".");
  return whole === amount.whole && (amount.cents === null || cents.startsWith(amount.cents));
}

function dateMatches(value: CivilDate | null | undefined, date: NonNullable<SearchToken["date"]>) {
  if (!value || value.length < 10) return false;
  return (
    Number(value.slice(8, 10)) === date.day &&
    Number(value.slice(5, 7)) === date.month &&
    (date.year === null || Number(value.slice(0, 4)) === date.year)
  );
}

function entryMatches(entry: MonthlyEntry, context: string[], tokens: SearchToken[]) {
  const text = normalize(
    [entry.description, entry.notes, entry.accountName, ...context].filter(Boolean).join("\n"),
  );
  const shownDate = entry.valueDate ?? entry.dueDate;

  return tokens.every(
    (token) =>
      text.includes(token.text) ||
      (token.amount !== null &&
        (amountMatches(entry.forecastAmount, token.amount) || amountMatches(entry.actualAmount, token.amount))) ||
      (token.date !== null && dateMatches(shownDate, token.date)),
  );
}

/** Keeps only the entries that match, plus the concepts and groups that still have any. */
export function searchLedgerGroups(groups: MonthlyGroup[], tokens: SearchToken[]): LedgerSearchResult {
  const matched = new Map<string, MonthlyGroup>();
  let count = 0;

  for (const group of groups) {
    const concepts = group.concepts
      .map((concept) => ({
        ...concept,
        entries: concept.entries.filter((entry) => entryMatches(entry, [concept.name, group.name], tokens)),
      }))
      .filter((concept) => concept.entries.length > 0);

    if (concepts.length === 0) continue;

    count += concepts.reduce((sum, concept) => sum + concept.entries.length, 0);
    matched.set(group.groupId, { ...group, concepts });
  }

  return { groups: matched, count };
}
