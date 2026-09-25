/**
 * Espejo de los DTOs del backend (Features/Ledger/Dtos).
 *
 * Las fechas viajan como "YYYY-MM-DD": son fechas civiles, no instantes.
 * Nunca deben pasar por `new Date(...)` porque el navegador las
 * interpretaría en UTC y restaría un día según la zona horaria.
 */

export type CivilDate = string;

/**
 * El backend serializa los enums como strings en camelCase
 * (JsonStringEnumConverter con JsonNamingPolicy.CamelCase), no como números.
 */

export enum ConceptKind {
  Income = "income",
  Expense = "expense",
  Transfer = "transfer",
}

export enum ConceptNature {
  Fixed = "fixed",
  Variable = "variable",
}

export enum EntryDirection {
  In = "in",
  Out = "out",
}

export enum EntryStatus {
  Planned = "planned",
  Pending = "pending",
  Paid = "paid",
  Skipped = "skipped",
}

export enum PeriodStatus {
  Open = "open",
  Closed = "closed",
}

export interface MonthlyEntry {
  id: string;
  direction: EntryDirection;
  status: EntryStatus;
  dueDate: CivilDate;
  /** El backend omite los nulls del JSON, así que estos campos llegan ausentes. */
  valueDate?: CivilDate | null;
  forecastAmount: number;
  actualAmount?: number | null;
  remaining: number;
  description?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  fromRecurringRule: boolean;
}

export interface MonthlyConcept {
  conceptId: string;
  name: string;
  nature: ConceptNature;
  sortOrder: number;
  forecastTotal: number;
  actualTotal: number;
  remainingTotal: number;
  budgetLimit?: number | null;
  isOverBudget: boolean;
  entries: MonthlyEntry[];
}

export interface MonthlyGroup {
  groupId: string;
  name: string;
  kind: ConceptKind;
  sortOrder: number;
  forecastTotal: number;
  actualTotal: number;
  remainingTotal: number;
  concepts: MonthlyConcept[];
}

export interface MonthlyTotals {
  incomeForecast: number;
  incomeActual: number;
  expenseForecast: number;
  expenseActual: number;
  projectedBalance: number;
  actualBalance: number;
  pendingExpense: number;
  pendingIncome: number;
}

export interface MonthlySummary {
  periodId: string;
  year: number;
  month: number;
  status: PeriodStatus;
  carryOverAmount: number;
  incomeGroups: MonthlyGroup[];
  expenseGroups: MonthlyGroup[];
  totals: MonthlyTotals;
}

export interface ChartConcept {
  id: string;
  name: string;
  nature: ConceptNature;
  sortOrder: number;
  isActive: boolean;
}

export interface ChartGroup {
  id: string;
  name: string;
  kind: ConceptKind;
  sortOrder: number;
  isActive: boolean;
  concepts: ChartConcept[];
}

export interface ChartOfAccounts {
  groups: ChartGroup[];
}

export interface SeedChartOfAccountsResult {
  groupsCreated: number;
  conceptsCreated: number;
  budgetsCreated: number;
  groupsAlreadyPresent: number;
  conceptsAlreadyPresent: number;
}

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "card" | "cash";
  currency: string;
  openingBalance: number;
  openingDate: CivilDate;
  isActive: boolean;
  entity?: string | null;
  accountNumber?: string | null;
  color?: string | null;
}

export interface CreateAccountInput {
  name: string;
  type: "checking" | "savings" | "card" | "cash";
  currency: string;
  openingBalance: number;
  openingDate: CivilDate;
  entity?: string | null;
  accountNumber?: string | null;
  color?: string | null;
}

export interface UpdateAccountInput {
  name: string;
  type: "checking" | "savings" | "card" | "cash";
  currency: string;
  entity?: string | null;
  accountNumber?: string | null;
  color?: string | null;
  isActive: boolean;
}

export interface ImportConceptOption {
  id: string;
  name: string;
  kind: string;
}

export interface ImportRow {
  id: string;
  rowNumber: number;
  valueDate: CivilDate;
  amount: number;
  currency?: string | null;
  rawDescription: string;
  normalizedDescription?: string | null;
  status: string;
  suggestedConceptId?: string | null;
  confirmedConceptId?: string | null;
  suggestionSource?: string | null;
}

export interface ImportReview {
  id: string;
  accountId: string;
  fileName?: string | null;
  status: string;
  rows: ImportRow[];
  concepts: ImportConceptOption[];
}

export interface ImportBatchResult {
  id: string;
  accountId: string;
  fileName?: string | null;
  totalRows: number;
  acceptedRows: number;
  duplicateRows: number;
  excludedRows: number;
  problems: string[];
}

export interface ImportChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ImportChatResponse {
  reply: string;
  appliedChanges: number;
  unrecognized: string[];
}

export interface CreateLedgerEntryPayload {
  conceptId: string;
  accountId?: string | null;
  direction: EntryDirection;
  dueDate: CivilDate;
  forecastAmount: number;
  actualAmount?: number | null;
  valueDate?: CivilDate | null;
  description?: string | null;
  notes?: string | null;
}

export interface UpdateLedgerEntryPayload {
  conceptId?: string | null;
  accountId?: string | null;
  dueDate?: CivilDate | null;
  forecastAmount?: number | null;
  description?: string | null;
  notes?: string | null;
}

export interface ConfirmLedgerEntryPayload {
  actualAmount: number;
  valueDate?: CivilDate | null;
  accountId?: string | null;
}
