// IncomePage.tsx

import { TransactionPage } from "../../components/TransactionList/TransactionPage";
import { IncomesService } from "../../services/incomesService";

export default function IncomePage() {
  return <TransactionPage mode="income" service={IncomesService} />;
}
