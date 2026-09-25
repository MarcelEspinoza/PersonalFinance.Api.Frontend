export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProposedAction {
  type: "create_expense" | "create_income";
  summary: string;
  amount: number;
  description: string;
  date: string;
  categoryId: number;
  categoryName: string;
  expenseType: "Fixed" | "Temporary";
}

export interface ChatResponse {
  reply: string;
  proposedActions: ProposedAction[];
}
