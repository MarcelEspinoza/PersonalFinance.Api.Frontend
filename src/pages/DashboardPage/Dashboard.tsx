// pages/Dashboard/Dashboard.tsx
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, PiggyBank, RotateCcw, Sparkles, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ActionCenter } from "../../components/Dashboard/ActionCenter";
import { MonthAdvicePanel } from "../../components/Dashboard/MonthAdvicePanel";
import { MonthHero } from "../../components/Dashboard/MonthHero";
import { NextMonthsPreview } from "../../components/Dashboard/NextMonthsPreview";
import { ServiceSavingsCard } from "../../components/Dashboard/ServiceSavingsCard";
import { UpcomingItemsCard } from "../../components/Dashboard/UpcomingItemsCard";
import { capitalize } from "../../components/Dashboard/dashboardUtils";
import { PeriodStatusBadge } from "../../components/Monthly/PeriodStatusBadge";
import { PageHeader } from "../../components/PageHeader";
import { useUpcomingReminders } from "../../components/Reminders/useUpcomingReminders";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import { getDashboardProjection, type DashboardProjection, type MonthOutlook } from "../../services/dashboardService";
import { monthLabel, monthName, nextMonth, previousMonth } from "../../utils/civilDate";

const RESERVE_STORAGE_KEY = "dashboard-include-variable-reserve";

type Extra = "advice" | "savings";

export function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedYear = Number(searchParams.get("year")) || undefined;
  const requestedMonthParam = Number(searchParams.get("month"));
  const requestedMonth = requestedMonthParam >= 1 && requestedMonthParam <= 12 ? requestedMonthParam : undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projection, setProjection] = useState<DashboardProjection | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [includeVariableReserve, setIncludeVariableReserve] = useState(
    () => window.localStorage.getItem(RESERVE_STORAGE_KEY) !== "false",
  );
  const [extra, setExtra] = useState<Extra | null>(null);
  const latestRequest = useRef(0);
  const reminders = useUpcomingReminders();

  useEffect(() => {
    if (!user) return;
    // Only the latest request may update the screen (months can be changed faster than they load).
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
    getDashboardProjection(requestedYear, requestedMonth)
      .then(({ data }) => {
        if (requestId === latestRequest.current) setProjection(data);
      })
      .catch((err) => {
        if (requestId !== latestRequest.current) return;
        console.error("Error loading dashboard", err);
        setError("No se ha podido cargar tu situación financiera.");
      })
      .finally(() => {
        if (requestId === latestRequest.current) setLoading(false);
      });
  }, [user, requestedYear, requestedMonth, reloadKey]);

  const retry = () => setReloadKey((value) => value + 1);
  const header = (
    <PageHeader
      title="Tu situación financiera"
      description="Cómo vas a terminar el mes y qué te toca hacer."
      actions={
        <Button asChild>
          <Link to="/imports">
            <Upload className="h-4 w-4" />
            Importar extracto
          </Link>
        </Button>
      }
    />
  );

  if (!projection) {
    return (
      <div className="space-y-6">
        {header}
        {loading || !error ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
          </div>
        ) : (
          <ErrorBox message={error} onRetry={retry} />
        )}
      </div>
    );
  }

  const { summary } = projection;
  const selectedYear = projection.outlook.year;
  const selectedMonth = projection.outlook.month;
  const monthOnly = monthName(selectedMonth);
  const monthTitle = capitalize(monthLabel(selectedYear, selectedMonth));
  const outlook = selectOutlookVersion(projection.outlook, includeVariableReserve);
  const isPast = outlook.isPast;
  const isFuture = !outlook.isPast && !outlook.isCurrent;
  const isDefaultMonth = projection.defaultYear === selectedYear && projection.defaultMonth === selectedMonth;
  const atMinMonth = selectedYear * 12 + selectedMonth <= projection.minYear * 12 + projection.minMonth;
  const closingBalance = outlook.accounts.reduce((total, account) => total + account.projectedEndBalance, 0);

  const goTo = (target: { year: number; month: number }) =>
    setSearchParams({ year: String(target.year), month: String(target.month) });
  const changeReserve = (value: boolean) => {
    window.localStorage.setItem(RESERVE_STORAGE_KEY, String(value));
    setIncludeVariableReserve(value);
  };
  const toggleExtra = (value: Extra) => setExtra((current) => (current === value ? null : value));

  return (
    <div className="space-y-6">
      {header}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-2 py-1.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goTo(previousMonth(selectedYear, selectedMonth))}
            disabled={loading || atMinMonth}
            title={atMinMonth ? "Antes de este mes no hay contabilidad válida" : "Mes anterior"}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center text-base font-semibold">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : monthTitle}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goTo(nextMonth(selectedYear, selectedMonth))}
            disabled={loading}
            title="Mes siguiente"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isDefaultMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goTo({ year: projection.defaultYear, month: projection.defaultMonth })}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4" />
              Volver al mes actual
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-2 text-xs text-muted-foreground">
          <span>{isPast ? "Mes terminado: saldos reales" : isFuture ? "Mes futuro: todo es previsión" : "Mes en curso"}</span>
          <PeriodStatusBadge status={projection.period.status} closedAt={projection.period.closedAt} />
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={retry} />}

      <div className={cn("space-y-6 transition-opacity", loading && "pointer-events-none opacity-60")} aria-busy={loading}>
        <MonthHero
          projection={projection}
          outlook={outlook}
          monthName={monthOnly}
          includeVariableReserve={includeVariableReserve}
          onChangeReserve={changeReserve}
        />

        <div className={cn("grid items-start gap-6", !isPast && "lg:grid-cols-2")}>
          <ActionCenter
            outlook={outlook}
            alerts={projection.alerts?.items ?? []}
            reminders={reminders.items}
            remindersFailed={reminders.failed}
            monthName={monthOnly}
          />
          {!isPast && (
            <UpcomingItemsCard
              key={`${selectedYear}-${selectedMonth}`}
              outlook={outlook}
              monthName={monthOnly}
              year={selectedYear}
              month={selectedMonth}
            />
          )}
        </div>

        <NextMonthsPreview
          months={projection.monthlyData}
          startFree={isPast ? closingBalance : outlook.freeMoney}
          includeVariableReserve={isPast || includeVariableReserve}
          pastTotals={isPast ? { income: summary.currentMonthIncome, expense: summary.currentMonthExpense } : null}
          onSelectMonth={goTo}
        />

        <section aria-label="Más cosas" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium text-muted-foreground">Más cosas:</span>
            <ExtraButton icon={Sparkles} active={extra === "advice"} onClick={() => toggleExtra("advice")}>
              Consejos de la IA
            </ExtraButton>
            <ExtraButton icon={PiggyBank} active={extra === "savings"} onClick={() => toggleExtra("savings")}>
              Ahorra en tus servicios
            </ExtraButton>
          </div>
          {extra === "advice" && (
            <MonthAdvicePanel
              year={selectedYear}
              month={selectedMonth}
              monthName={monthLabel(selectedYear, selectedMonth)}
            />
          )}
          {extra === "savings" && <ServiceSavingsCard />}
        </section>
      </div>
    </div>
  );
}

function selectOutlookVersion(outlook: MonthOutlook, includeVariableReserve: boolean): MonthOutlook {
  const baseline = outlook.withoutVariableReserve;
  return !includeVariableReserve && baseline
    ? { ...outlook, ...baseline }
    : outlook;
}

/** A pill that opens (or closes) an extra block at the end of the page. */
function ExtraButton({
  icon: Icon,
  active,
  onClick,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary/10 text-primary" : "bg-card text-foreground hover:border-primary/60",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
      <ChevronDown className={cn("h-4 w-4 transition-transform", active && "rotate-180")} />
    </button>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-negative/25 bg-negative-soft p-4 text-sm text-negative">
      <span>{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
