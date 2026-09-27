export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProposedAction {
  type:
    | "create_expense"
    | "create_income"
    | "update_expense"
    | "update_income"
    | "update_ledger_entry"
    | "create_category"
    | "create_budget"
    | "record_loan_payment"
    | "complete_pasanaco"
    | "reopen_pasanaco"
    | "classify_import_group"
    | "apply_import";
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
}

export interface ChatResponse {
  reply: string;
  proposedActions: ProposedAction[];
}
