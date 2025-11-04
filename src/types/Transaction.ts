export interface Transaction {
  id: string; // o number, pero debe coincidir con el backend
  name?: string;
  description?: string;
  amount: number;
  date?: string;
  category?: string;
  categoryId?: number;
  categoryName?: string;
  type: "income" | "expense";
  source: "fixed" | "variable" | "temporary";
  frequency?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  notes?: string;
}
