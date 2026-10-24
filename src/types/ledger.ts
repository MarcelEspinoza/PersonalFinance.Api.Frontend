/**
 * Espejo de los DTOs del backend (Features/Ledger/Dtos).
 *
 * Las fechas viajan como "YYYY-MM-DD": son fechas civiles, no instantes.
 * Nunca deben pasar por `new Date(...)` porque el navegador las
 * interpretaría en UTC y restaría un día según la zona horaria.
 */

import type { ReminderRepeat } from "./reminder";

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
  /** Nota libre: por qué se pagó así, a quién se le debe, etc. */
  notes?: string | null;
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

/** What is still left of a variable concept's monthly limit (or of a variable income's estimate). */
export interface MonthForecastReserveItem {
  conceptId: string;
  conceptName: string;
  isIncome: boolean;
  limit: number;
  used: number;
  /** limit − used: what the forecast still counts for this concept. */
  amount: number;
}

/** A pending reminder with an amount: the forecast counts it as an expense. */
export interface MonthForecastReminderItem {
  reminderId: string;
  title: string;
  date: CivilDate;
  amount: number;
  /** Its date already passed and it is not done yet. */
  isOverdue: boolean;
}

/** What an open settlement (mamá, Vane…) still expects: she pays me (isIncome) or I pay her. */
export interface MonthForecastSettlementItem {
  settlementId: string;
  title: string;
  date: CivilDate;
  isIncome: boolean;
  amount: number;
  /** Its expected date already passed and it is still open. */
  isOverdue: boolean;
}

/**
 * The month as the forecast sees it: the same numbers as the dashboard boxes and the «Plan de gastos».
 * income = entryIncome + ruleIncome + variableIncomeExpected + settlementIncome;
 * expense = entryExpense + ruleExpense + variableExpenseReserve + reminders + settlementExpense;
 * balance = income − expense, without the carry-over from the previous month.
 */
export interface MonthForecastSummary {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
  /** Entries already written in the month (paid or not). */
  entryIncome: number;
  entryExpense: number;
  /** Recurring payments of the month that are not written as entries yet. */
  ruleIncome: number;
  ruleExpense: number;
  variableExpenseReserve: number;
  variableIncomeExpected: number;
  /** Pending reminders with an amount. */
  reminders: number;
  /** What open settlements still expect to collect / to pay. */
  settlementIncome?: number;
  settlementExpense?: number;
  reserveItems: MonthForecastReserveItem[];
  reminderItems: MonthForecastReminderItem[];
  settlementItems?: MonthForecastSettlementItem[];
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
  /** Absent for months before the current one. */
  forecast?: MonthForecastSummary | null;
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

export interface CreateImportConceptInput {
  groupId: string;
  name: string;
  nature: ConceptNature;
  saveForFuture: boolean;
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
  /** Concepto de traspaso que esta cuenta refleja (por ejemplo, la hucha de Revolut). */
  transferConceptId?: string | null;
}

export interface AccountBalance {
  accountId: string;
  year: number;
  month: number;
  balance: number;
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
  transferConceptId?: string | null;
}

export interface UpdateAccountInput {
  name: string;
  type: "checking" | "savings" | "card" | "cash";
  currency: string;
  entity?: string | null;
  accountNumber?: string | null;
  color?: string | null;
  isActive: boolean;
  /** Si no se envía, no cambia. */
  openingBalance?: number;
  openingDate?: CivilDate;
  /** Si no se envía, no cambia; "00000000-0000-0000-0000-000000000000" quita el enlace. */
  transferConceptId?: string;
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
  /** Día en que el banco cobró/abonó el movimiento (mueve el saldo). */
  settledDate?: CivilDate | null;
  amount: number;
  currency?: string | null;
  rawDescription: string;
  normalizedDescription?: string | null;
  status: string;
  suggestedConceptId?: string | null;
  confirmedConceptId?: string | null;
  suggestionSource?: string | null;
  allocations: ImportRowAllocation[];
  /** Planned entry this row will be deducted from when the batch is applied. */
  plannedEntryId?: string | null;
}

/**
 * Open planned entry ("previsto") near the batch dates that rows can be deducted from.
 * forecastAmount is always positive; the sign comes from `direction`.
 */
export interface PlannedCandidate {
  id: string;
  conceptId: string | null;
  conceptName: string | null;
  direction: EntryDirection;
  dueDate: CivilDate;
  forecastAmount: number;
  accountId: string | null;
  accountName: string | null;
  description: string | null;
  /** Sum of this batch's rows already linked to it. */
  linkedAmount: number;
  /** forecastAmount - linkedAmount; negative when the linked rows exceed the forecast. */
  remainingAfterLinks: number;
  linkedRowIds: string[];
}

export interface ImportRowAllocation {
  conceptId: string;
  amount: number;
}

export interface SplitImportRowInput {
  allocations: ImportRowAllocation[];
}

export interface ImportReview {
  id: string;
  accountId: string;
  fileName?: string | null;
  status: string;
  rows: ImportRow[];
  concepts: ImportConceptOption[];
  analysis?: ImportAnalysis | null;
}

export type ImportFindingSeverity = "ok" | "info" | "warning";

export interface ImportFinding {
  severity: ImportFindingSeverity;
  title: string;
  detail: string;
  rowNumbers: number[];
}

/** Revisión automática del extracto: saldo del banco frente a la app y avisos. */
export interface ImportAnalysis {
  bankBalance?: number | null;
  bankBalanceDate?: CivilDate | null;
  appBalance?: number | null;
  difference?: number | null;
  findings: ImportFinding[];
}

export interface ImportBatchResult {
  id: string;
  accountId: string;
  fileName?: string | null;
  totalRows: number;
  acceptedRows: number;
  duplicateRows: number;
  excludedRows: number;
  confirmedPendingRows?: number;
  problems: string[];
}

export interface ImportChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ImportChatActionType =
  | "set_row_concept"
  | "create_concept"
  | "link_planned"
  | "unlink_planned"
  | "skip_planned"
  | "update_planned"
  | "create_reminder";

/** Cambio que propone el asistente; no se aplica hasta que el usuario lo confirma. */
export interface ImportChatProposedAction {
  type: ImportChatActionType;
  summary: string;
  rowIds: string[];
  /** set_row_concept: categoría existente que se asignará. */
  conceptId?: string | null;
  conceptName?: string | null;
  /** create_concept: categoría nueva que se creará dentro de un grupo. */
  name?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  nature?: ConceptNature | null;
  /** Si es true, se recuerda para próximas importaciones de esta cuenta. */
  saveForFuture: boolean;
  /** link_planned, skip_planned and update_planned: the planned entry involved. */
  plannedEntryId?: string | null;
  plannedEntryName?: string | null;
  /** update_planned: new forecast amount. create_reminder: optional amount. */
  amount?: number | null;
  /** update_planned: new due date. create_reminder: reminder date. */
  dueDate?: CivilDate | null;
  /** create_reminder fields. */
  title?: string | null;
  repeat?: ReminderRepeat | null;
  notifyDaysBefore?: number | null;
  notes?: string | null;
}

export interface ImportChatResponse {
  reply: string;
  /** Siempre 0: el asistente ya no aplica cambios sin confirmación. */
  appliedChanges: number;
  unrecognized: string[];
  proposedActions?: ImportChatProposedAction[];
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
