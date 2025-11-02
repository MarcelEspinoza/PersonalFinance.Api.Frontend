export interface FixedIncome {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export interface VariableIncome {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
}

export interface TemporaryIncome {
  id: string;
  name: string;
  amount: number;
  start_date: string;
  end_date: string;
  frequency: string;
  is_active: boolean;
}

export type IncomeTab = 'fixed' | 'variable' | 'temporary';
