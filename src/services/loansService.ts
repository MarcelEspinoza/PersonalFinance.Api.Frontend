import apiClient from '../lib/apiClient';
import type { BankLoan, LoanPayment, PersonalLoan } from '../pages/LoansPage/LoansPage';

export interface LoanInput {
  userId: string;
  type: "bank" | "given" | "received" | "Given" | "Received";
  name: string;
  principalAmount: number;
  outstandingAmount: number;
  startDate: string | null;
  dueDate?: string | null;
  status: PersonalLoan["status"];
  categoryId: number;
  interestRate?: number | null;
  tae?: number | null;
  installmentsPaid?: number | null;
  installmentsRemaining?: number | null;
  nextPaymentAmount?: number | null;
  nextPaymentDate?: string | null;
}

export interface LoanOverviewItem {
  id: string;
  source: "loan" | "settlement";
  title: string;
  direction: "in" | "out";
  remainingAmount: number;
  nextDate?: string | null;
  nextAmount?: number | null;
  completionDate?: string | null;
  counterpartyName?: string | null;
  accountName?: string | null;
}

export interface LoanOverview {
  payable: number;
  receivable: number;
  dueThisMonth: number;
  expectedThisMonth: number;
  lastPaymentDate?: string | null;
  incompleteSchedules: number;
  archivedLoans: number;
  archivedRecordedBalance: number;
  items: LoanOverviewItem[];
}

export const LoansService = {
  getLoans: (userId: string) => apiClient.get<(PersonalLoan | BankLoan)[]>('/loans', { params: { userId } }),
  getPayments: (loanId: string) => apiClient.get<LoanPayment[]>(`/loans/${loanId}/payments`),
  getOverview: (year: number, month: number) =>
    apiClient.get<LoanOverview>('/loans/overview', { params: { year, month } }),
  setArchived: (loanIds: string[], archived: boolean) =>
    apiClient.post('/loans/archive', { loanIds, archived }),

  createLoan: (payload: LoanInput) => apiClient.post('/loans', payload),
  updateLoan: (id: string, payload: Partial<LoanInput>) => apiClient.put(`/loans/${id}`, payload),
  deleteLoan: (id: string) => apiClient.delete(`/loans/${id}`),

  createPayment: (loanId: string, payload: { amount: number; paymentDate: string; notes?: string | null }) =>
    apiClient.post(`/loans/${loanId}/payments`, payload)
};