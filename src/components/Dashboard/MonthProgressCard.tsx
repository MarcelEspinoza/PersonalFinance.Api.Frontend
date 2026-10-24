import { CalendarDays, CheckCircle2, Scale } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ConceptDeviation } from "../../services/dashboardService";
import { ConceptKind } from "../../types/ledger";
import { money } from "../../utils/civilDate";
import { SectionCard } from "./SectionCard";

const VISIBLE_DEVIATIONS = 4;

type Props = {
  /** e.g. "Octubre 2026". */
  title: string;
  collected: number;
  toCollect: number;
  paid: number;
  toPay: number;
  result: number;
  deviations: ConceptDeviation[];
  isPast: boolean;
  className?: string;
};

/** How far along the month is: collected and paid so far against what is expected. */
export function MonthProgressCard({
  title,
  collected,
  toCollect,
  paid,
  toPay,
  result,
  deviations,
  isPast,
  className,
}: Props) {
  // Only the ones that hurt: spending more than planned or collecting less.
  const worse = deviations
    .filter((item) => (item.kind === ConceptKind.Expense ? item.deviation >= 1 : item.deviation <= -1))
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  const shown = worse.slice(0, VISIBLE_DEVIATIONS);

  return (
    <SectionCard icon={<CalendarDays className="h-5 w-5 text-primary" />} title={title} className={className}>
      <div className="space-y-5">
        <ProgressRow
          label="Cobrado"
          done={collected}
          remaining={toCollect}
          barClassName="bg-positive"
          remainingLabel={isPast ? "Quedó sin cobrar" : "Falta cobrar"}
        />
        <ProgressRow
          label="Pagado"
          done={paid}
          remaining={toPay}
          barClassName="bg-orange-500"
          remainingLabel={isPast ? "Quedó sin pagar" : "Falta pagar"}
        />

        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Resultado del mes</span>
            <span className={cn("text-lg font-semibold tabular-nums", result < 0 ? "text-negative" : "text-positive")}>
              {money(result)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Lo cobrado menos lo pagado. No es tu saldo.</p>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Scale className="h-4 w-4 text-muted-foreground" />
            Desvíos frente al plan
          </p>
          {shown.length === 0 ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-positive">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Vas según lo planeado.
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">Donde gastas más o cobras menos de lo previsto.</p>
              <ul className="mt-2 space-y-2">
                {shown.map((item) => (
                  <li key={item.conceptId} className="flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-muted-foreground">
                        Plan {money(item.planned)} · real {money(item.actual)}
                        {item.pending > 0 ? ` · pendiente ${money(item.pending)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-negative">
                      {item.deviation > 0 ? "+" : ""}
                      {money(item.deviation)}
                    </span>
                  </li>
                ))}
                {worse.length > shown.length && (
                  <li className="text-xs text-muted-foreground">y {worse.length - shown.length} más</li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function ProgressRow({
  label,
  done,
  remaining,
  barClassName,
  remainingLabel,
}: {
  label: string;
  done: number;
  remaining: number;
  barClassName: string;
  remainingLabel: string;
}) {
  const total = done + remaining;
  const percent = total > 0.005 ? Math.min(100, Math.max(0, (done / total) * 100)) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="whitespace-nowrap tabular-nums">
          <span className="font-semibold">{money(done)}</span>
          <span className="text-muted-foreground"> de {money(total)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", barClassName)} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {total <= 0.005
          ? "Nada previsto"
          : remaining > 0.005
            ? `${remainingLabel}: ${money(remaining)}`
            : "Completado"}
      </p>
    </div>
  );
}
