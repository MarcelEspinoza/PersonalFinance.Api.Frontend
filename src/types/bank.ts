export interface Bank {
  id: string;
  userId?: string;
  name: string;
  institution?: string;
  accountNumber?: string;
  currency?: string;
  createdAt?: string;
}

export interface Reconciliation {
  id: string;
  userId?: string;
  bankId: string;
  year: number;
  month: number;
  closingBalance: number;
  reconciled: boolean;
  notes?: string;
  createdAt: string;
  reconciledAt?: string | null;
}

export interface ReconciliationSuggestion {
  systemTotal: number;
  closingBalance: number;
  difference: number;
  details?: { incomeTotal?: number; expenseTotal?: number };
}