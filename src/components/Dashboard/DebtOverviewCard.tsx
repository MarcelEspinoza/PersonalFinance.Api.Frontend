import { CalendarClock, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ledgerErrorMessage } from "../../services/ledgerService";
import { LoansService, type LoanOverview } from "../../services/loansService";
import { money } from "../../utils/civilDate";
import { Button } from "../ui/button";

export function DebtOverviewCard({ year, month }: { year: number; month: number }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [overview, setOverview] = useState<LoanOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setOverview(null);
    setError(null);
    if (!userId) return;
    void LoansService.getOverview(year, month).then(({ data }) => {
      if (active) setOverview(data);
    }).catch(err => {
      if (active) setError(ledgerErrorMessage(err, "No se han podido cargar tus deudas y cobros."));
    });
    return () => { active = false; };
  }, [year, month, userId, reload]);

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5" aria-label="Deudas y cobros">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4" /> Deudas y cobros</h2>
        <Button asChild size="sm" variant="ghost"><Link to="/loans">Ver detalle <ChevronRight className="h-4 w-4" /></Link></Button>
      </div>
      {error ? (
        <div role="alert" className="space-y-2 text-sm text-negative">
          <p>{error}</p>
          <Button size="sm" variant="outline" onClick={() => setReload(value => value + 1)}>Reintentar deudas</Button>
        </div>
      ) : !overview ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando deudas y cobros…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Pendiente por pagar</p><p className="mt-1 text-xl font-semibold text-negative">{money(overview.payable)}</p></div>
            <div><p className="text-xs text-muted-foreground">Pagos con fecha este mes</p><p className="mt-1 text-xl font-semibold">{money(overview.dueThisMonth)}</p></div>
            <div><p className="text-xs text-muted-foreground">Pendiente por cobrar</p><p className="mt-1 text-xl font-semibold text-positive">{money(overview.receivable)}</p></div>
          </div>
          <p className="text-sm">
            Último pago activo previsto: <strong>{overview.lastPaymentDate
              ? new Date(`${overview.lastPaymentDate}T12:00:00`).toLocaleDateString("es-ES")
              : overview.payable > 0 ? "Fecha por definir" : "Sin pagos activos vinculados"}</strong>
          </p>
          {overview.incompleteSchedules > 0 && (
            <p className="text-xs text-muted-foreground">Hay {overview.incompleteSchedules} pagos sin calendario completo o con fechas vencidas. La fecha final no se puede asegurar.</p>
          )}
          <p className="text-xs text-muted-foreground">
            {overview.archivedLoans > 0 && `${overview.archivedLoans} préstamos archivados quedan fuera de este seguimiento; no se han marcado como pagados. `}
            Basado en préstamos activos y liquidaciones. No añade movimientos ni cambia las previsiones de Mes.
          </p>
        </>
      )}
    </section>
  );
}
