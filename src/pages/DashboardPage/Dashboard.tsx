// pages/Dashboard/Dashboard.tsx
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  PiggyBank,
  RotateCcw,
  Upload,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AccountsOverview } from "../../components/Dashboard/AccountsOverview";
import { ActionCenter } from "../../components/Dashboard/ActionCenter";
import { FutureMonthsBoxes } from "../../components/Dashboard/FutureMonthsBoxes";
import { MonthAdvicePanel } from "../../components/Dashboard/MonthAdvicePanel";
import { MonthProgressCard } from "../../components/Dashboard/MonthProgressCard";
import { ServiceSavingsCard } from "../../components/Dashboard/ServiceSavingsCard";
import { UpcomingItemsCard } from "../../components/Dashboard/UpcomingItemsCard";
import { capitalize, ledgerLink, pendingFlows, type PendingFlows } from "../../components/Dashboard/dashboardUtils";
import { PeriodStatusBadge } from "../../components/Monthly/PeriodStatusBadge";
import { PageHeader } from "../../components/PageHeader";
import { useUpcomingReminders } from "../../components/Reminders/useUpcomingReminders";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import { getDashboardProjection, type DashboardProjection, type MonthOutlook } from "../../services/dashboardService";
import { money, monthLabel, monthName, nextMonth, previousMonth } from "../../utils/civilDate";

const RESERVE_STORAGE_KEY = "dashboard-include-variable-reserve";

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
      description="Cómo estás hoy y cómo vas a terminar el mes."
      actions={
        <>
          <Button asChild variant="outline">
            <Link to={projection ? ledgerLink(projection.outlook.year, projection.outlook.month) : "/ledger"}>
              <ClipboardList className="h-4 w-4" />
              Ir a Mes
            </Link>
          </Button>
          <Button asChild>
            <Link to="/imports">
              <Upload className="h-4 w-4" />
              Importar extracto
            </Link>
          </Button>
        </>
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
  const flows = pendingFlows(outlook);
  const variableReserve = projection.outlook.variableExpenseReserve;
  const closingBalance = outlook.accounts.reduce((total, account) => total + account.projectedEndBalance, 0);
  const futureMonths = projection.monthlyData.filter((month) => !month.isCurrent);

  const goTo = (target: { year: number; month: number }) =>
    setSearchParams({ year: String(target.year), month: String(target.month) });
  const changeReserve = (value: boolean) => {
    window.localStorage.setItem(RESERVE_STORAGE_KEY, String(value));
    setIncludeVariableReserve(value);
  };

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            dataTour="dashboard-balance"
            label="Dinero hoy"
            icon={<Wallet className="h-4 w-4" />}
            iconClassName="bg-primary/10 text-primary"
            value={summary.currentBalance}
            hint={todayHint(isFuture, projection.accounts.length, monthOnly, summary.monthOpeningBalance)}
          />
          {isPast ? (
            <KpiTile
              label={`Saldo al cerrar ${monthOnly}`}
              icon={<PiggyBank className="h-4 w-4" />}
              iconClassName="bg-primary/10 text-primary"
              value={closingBalance}
              hint="Lo que había en tus cuentas el último día del mes."
            />
          ) : (
            <KpiTile
              label="Libre a fin de mes"
              icon={<PiggyBank className="h-4 w-4" />}
              iconClassName={outlook.freeMoney < 0 ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive"}
              value={outlook.freeMoney}
              valueClassName={outlook.freeMoney < 0 ? "text-negative" : "text-positive"}
              hint={
                isFuture
                  ? `Lo que te quedará al terminar ${monthOnly}, contando todo lo previsto hasta entonces.`
                  : "Lo que te quedará cuando se cobre y se pague todo lo previsto."
              }
            >
              {variableReserve > 0.005 && (
                <label className="mt-3 flex cursor-pointer items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={includeVariableReserve}
                    onChange={(event) => changeReserve(event.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  Contar gastos variables ({money(variableReserve)})
                </label>
              )}
            </KpiTile>
          )}
          <KpiTile
            label={isPast ? "Quedó sin cobrar" : "Por cobrar"}
            icon={<ArrowDownLeft className="h-4 w-4" />}
            iconClassName="bg-positive-soft text-positive"
            value={flows.toCollect}
            valueClassName="text-positive"
            hint={collectHint(flows, isPast)}
          />
          <KpiTile
            label={isPast ? "Quedó sin pagar" : "Por pagar"}
            icon={<ArrowUpRight className="h-4 w-4" />}
            iconClassName="bg-orange-500/10 text-orange-600"
            value={flows.toPay}
            hint={payHint(flows, isPast)}
          />
        </div>

        <ActionCenter
          outlook={outlook}
          alerts={projection.alerts?.items ?? []}
          reminders={reminders.items}
          remindersFailed={reminders.failed}
          monthName={monthOnly}
        />

        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <AccountsOverview
              outlook={outlook}
              todayBalances={projection.accounts}
              monthName={monthOnly}
              year={selectedYear}
              month={selectedMonth}
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
          <div className="space-y-6">
            <MonthProgressCard
              title={monthTitle}
              collected={summary.currentMonthIncome}
              toCollect={flows.toCollect}
              paid={summary.currentMonthExpense}
              toPay={flows.toPay}
              result={summary.currentMonthResult}
              deviations={outlook.deviations}
              isPast={isPast}
            />
            <ServiceSavingsCard />
          </div>
        </div>

        <FutureMonthsBoxes
          months={futureMonths}
          title={isDefaultMonth ? "Próximos 6 meses" : `Los 6 meses después de ${monthOnly}`}
          startBalance={isPast ? closingBalance : outlook.freeMoney}
          startMonthName={monthOnly}
          onSelectMonth={goTo}
        />

        <MonthAdvicePanel year={selectedYear} month={selectedMonth} monthName={monthLabel(selectedYear, selectedMonth)} />
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

function todayHint(isFuture: boolean, accountCount: number, monthOnly: string, openingBalance: number): string {
  if (!isFuture) return `Al empezar ${monthOnly} tenías ${money(openingBalance)}.`;
  if (accountCount === 0) return "No tienes cuentas activas.";
  return accountCount === 1 ? "Lo que hay en tu cuenta." : `Suma de tus ${accountCount} cuentas.`;
}

function collectHint(flows: PendingFlows, isPast: boolean): string {
  const count = flows.collectCount;
  if (isPast) return count === 0 ? "Se cobró todo lo previsto." : `${count} ${count === 1 ? "cobro" : "cobros"} sin confirmar.`;
  const parts = [
    count > 0 ? `${count} ${count === 1 ? "cobro pendiente" : "cobros pendientes"}` : null,
    flows.variableIncome > 0.005 ? `${money(flows.variableIncome)} de ingresos variables` : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? "Nada pendiente este mes." : `${parts.join(" + ")}.`;
}

function payHint(flows: PendingFlows, isPast: boolean): string {
  const count = flows.payCount;
  if (isPast) return count === 0 ? "Se pagó todo lo previsto." : `${count} ${count === 1 ? "pago" : "pagos"} sin confirmar.`;
  const parts = [
    count > 0 ? `${count} ${count === 1 ? "pago pendiente" : "pagos pendientes"}` : null,
    flows.variableExpense > 0.005 ? `${money(flows.variableExpense)} de gastos variables` : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? "Nada pendiente este mes." : `${parts.join(" + ")}.`;
}

function KpiTile({
  label,
  value,
  icon,
  iconClassName,
  valueClassName,
  hint,
  dataTour,
  children,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconClassName?: string;
  valueClassName?: string;
  hint?: string;
  dataTour?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="p-5" data-tour={dataTour}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconClassName)}>{icon}</span>
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
          value < -0.005 && "text-negative",
          valueClassName,
        )}
      >
        {money(value)}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </Card>
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
