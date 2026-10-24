import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ClipboardList } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { TransactionTransferCenter } from "../../components/TransactionImportExport/TransactionTransferCenter";
import { TransactionPage } from "../../components/TransactionList/TransactionPage";
import { Button } from "../../components/ui/button";
import { ExpensesService } from "../../services/expensesService";
import { IncomesService } from "../../services/incomesService";

type MovementType = "income" | "expense";

/** «Anotaciones antiguas»: the old notebook (legacy expense/income tables), linked only from «Configuración». */
export function MovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadKey, setReloadKey] = useState(0);
  const mode: MovementType = searchParams.get("type") === "income" ? "income" : "expense";

  const selectMode = (nextMode: MovementType) => {
    setSearchParams({ type: nextMode }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Anotaciones antiguas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aquí está el cuaderno viejo: lo que se anotaba a mano antes. No cuenta en «Mes» ni en tus saldos. Para anotar algo
            nuevo, usa «Mes».
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/ledger">
              <ClipboardList /> Ir a Mes
            </Link>
          </Button>
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
      </div>

      <TransactionPage
        key={mode}
        mode={mode}
        service={mode === "income" ? IncomesService : ExpensesService}
        compact
        allowCreate={false}
        reloadKey={reloadKey}
      />

      <details className="group rounded-xl border bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          Importar o exportar plantillas antiguas
        </summary>
        <div className="border-t p-4">
          <TransactionTransferCenter onImportClose={() => setReloadKey((current) => current + 1)} />
        </div>
      </details>
    </div>
  );
}

export default MovementsPage;
