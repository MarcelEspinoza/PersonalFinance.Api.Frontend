import { ChevronLeft, ChevronRight, Lock, Unlock } from "lucide-react";
import { Button } from "../ui/button";
import { PeriodStatus } from "../../types/ledger";
import { monthLabel } from "../../utils/civilDate";

interface Props {
  year: number;
  month: number;
  status: PeriodStatus | null;
  busy: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onClose: () => void;
  onReopen: () => void;
}

export function MonthNavigator({
  year,
  month,
  status,
  busy,
  onPrevious,
  onNext,
  onToday,
  onClose,
  onReopen,
}: Props) {
  const closed = status === PeriodStatus.Closed;

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" onClick={onPrevious} disabled={busy} aria-label="Mes anterior">
          <ChevronLeft />
        </Button>

        <h1 className="min-w-52 text-center text-2xl font-semibold capitalize tracking-tight">
          {monthLabel(year, month)}
        </h1>

        <Button variant="outline" size="icon" onClick={onNext} disabled={busy} aria-label="Mes siguiente">
          <ChevronRight />
        </Button>

        <Button variant="ghost" size="sm" onClick={onToday} disabled={busy}>
          Hoy
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {closed && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
            <Lock className="h-3 w-3" /> Mes cerrado
          </span>
        )}

        {closed ? (
          <Button variant="outline" size="sm" onClick={onReopen} disabled={busy}>
            <Unlock /> Reabrir
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy || status === null}>
            <Lock /> Cerrar mes
          </Button>
        )}
      </div>
    </div>
  );
}
