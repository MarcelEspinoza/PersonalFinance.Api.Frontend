export interface BudgetStatus {
  budgetId: string;
  categoryId: number;
  categoryName: string;
  monthlyLimit: number;
  spentAmount: number;
  remainingAmount: number;
  isExceeded: boolean;
  isNearLimit: boolean;
}
