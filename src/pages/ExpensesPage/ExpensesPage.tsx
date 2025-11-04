// ExpensesPage.tsx

import { TransactionPage } from "../../components/TransactionList/TransactionPage";
import { ExpensesService } from "../../services/expensesService";


export default function ExpensesPage() {
  return <TransactionPage mode="expense" service={ExpensesService} />;
}
