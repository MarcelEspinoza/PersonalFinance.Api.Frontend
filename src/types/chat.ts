import type { ReminderRepeat } from "./reminder";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Write methods an admin `api_call` proposal may use. */
export type ApiCallMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface ProposedAction {
  type:
    | "create_expense"
    | "create_income"
    | "update_expense"
    | "update_income"
    | "update_ledger_entry"
    | "skip_ledger_entry"
    | "create_category"
    | "create_budget"
    | "record_loan_payment"
    | "complete_pasanaco"
    | "reopen_pasanaco"
    | "classify_import_group"
    | "apply_import"
    | "create_reminder"
    | "update_reminder"
    | "complete_reminder"
    | "delete_reminder"
    | "api_call";
  summary: string;
  amount: number;
  description: string;
  date: string;
  categoryId: number;
  categoryName: string;
  expenseType: "Fixed" | "Temporary";
  targetId?: string | null;
  name?: string | null;
  notes?: string | null;
  year?: number | null;
  month?: number | null;
  conceptId?: string | null;
  accountId?: string | null;
  normalizedDescription?: string | null;
  /** create_reminder: `name` is the title, `date` the due date, `amount` (0 = none) and `notes`. */
  repeat?: ReminderRepeat | null;
  notifyDaysBefore?: number | null;
  /** create_reminder / update_reminder: true = a cobro (money comes in). On update, null keeps it as it is. */
  isIncome?: boolean | null;
  /**
   * api_call (admin only): write request the browser sends itself after the user confirms it.
   * For this type the other fields come with default values and are ignored.
   */
  method?: ApiCallMethod | null;
  /** Relative to the API base, e.g. "/Expense/12" or "/Pasanaco/abc?force=true". */
  path?: string | null;
  body?: Record<string, unknown> | null;
  /** Server-generated title, e.g. "Borrar · Gasto". */
  label?: string | null;
  /** True for destructive or admin operations. */
  danger?: boolean;
  /** Server-resolved name of the affected item. */
  targetName?: string | null;
}

export interface ChatResponse {
  reply: string;
  proposedActions: ProposedAction[];
}
