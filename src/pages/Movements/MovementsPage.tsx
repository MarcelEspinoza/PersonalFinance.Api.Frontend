import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { TransactionPage } from "../../components/TransactionList/TransactionPage";
import { ExpensesService } from "../../services/expensesService";
import { IncomesService } from "../../services/incomesService";

type MovementType = "income" | "expense";

export function MovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: MovementType = searchParams.get("type") === "income" ? "income" : "expense";

  const selectMode = (nextMode: MovementType) => {
    setSearchParams({ type: nextMode }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta y gestiona ingresos y gastos desde un mismo lugar.
        </p>
      </div>

      <div className="inline-flex rounded-xl border bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => selectMode("expense")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "expense"
              ? "bg-card text-negative shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowDownRight className="h-4 w-4" />
          Gastos
        </button>
        <button
          type="button"
          onClick={() => selectMode("income")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "income"
              ? "bg-card text-positive shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          Ingresos
        </button>
      </div>

      <TransactionPage
        mode={mode}
        service={mode === "income" ? IncomesService : ExpensesService}
        compact
      />
    </div>
  );
}

export default MovementsPage;
