export interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  categoryId: number;
  categoryName: string;
  type: "income" | "expense";
  source: "fixed" | "variable" | "temporary";
  frequency?: string;
  start_Date?: string;
  end_Date?: string;
  isIndefinite?: boolean;
  notes?: string;
  loanId?: string | null;
  userId: string;
  bankId?: string;     
  bankName?: string;   

  isTransfer?: boolean;
  transferId?: string | null;
  transferCounterpartyBankId?: string | null;
  transferReference?: string | null;
}
