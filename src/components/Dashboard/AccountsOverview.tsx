import { AlertTriangle, CheckCircle2, Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { AccountOutlook, DashboardAccount, MonthOutlook, OutlookItem } from "../../services/dashboardService";
import { EntryDirection } from "../../types/ledger";
import { money, shortDate } from "../../utils/civilDate";
import { SectionCard, SectionLink } from "./SectionCard";
import { reconcileLink } from "./dashboardUtils";

type Props = {
  outlook: MonthOutlook;
  /** Today's balance of each account. */
  todayBalances: DashboardAccount[];
  /** Month name, e.g. "octubre". */
  monthName: string;
  year: number;
  month: number;
};

// Fixed widths so the header, the rows and the total line up.
const GRID =
  "grid grid-cols-[minmax(0,1fr)_6rem_6.5rem] items-start gap-x-3 sm:grid-cols-[minmax(0,1fr)_8rem_8.5rem]";

/** Every account: what it has today and how it will end the month. */
export function AccountsOverview({ outlook, todayBalances, monthName, year, month }: Props) {
  const isFuture = !outlook.isPast && !outlook.isCurrent;
  const todayById = new Map(todayBalances.map((account) => [account.accountId, account.balance]));
  const todayOf = (account: AccountOutlook) => todayById.get(account.accountId) ?? account.actualBalance;
  const totalToday = outlook.accounts.reduce((total, account) => total + todayOf(account), 0);
  const totalEnd = outlook.accounts.reduce((total, account) => total + account.projectedEndBalance, 0);
  const unassignedNote = outlook.isPast ? null : describeUnassigned(outlook.unassigned);

  return (
    <SectionCard
      icon={<Landmark className="h-5 w-5 text-primary" />}
      title="Tus cuentas"
      action={!isFuture && <SectionLink to={reconcileLink(year, month)}>Cuadrar con el banco</SectionLink>}
      bodyClassName="p-0"
    >
      {outlook.accounts.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          No tienes cuentas activas. Créalas en{" "}
          <Link to="/settings" className="font-medium text-primary hover:underline">
            Configuración
          </Link>
          .
        </p>
      ) : (
        <>
          <div className={cn(GRID, "border-b bg-muted/40 px-5 py-2 text-xs font-medium text-muted-foreground")}>
            <span>Cuenta</span>
            <span className="text-right">Hoy</span>
            <span className="text-right">{outlook.isPast ? `Cierre de ${monthName}` : `Fin de ${monthName}`}</span>
          </div>
          <ul className="divide-y">
            {outlook.accounts.map((account) => (
              <AccountRow
                key={account.accountId}
                account={account}
                todayBalance={todayOf(account)}
                outlook={outlook}
                isFuture={isFuture}
              />
            ))}
          </ul>
          {outlook.accounts.length > 1 && (
            <div className={cn(GRID, "border-t bg-muted/40 px-5 py-2.5 text-sm font-semibold")}>
              <span>Total</span>
              <Amount value={totalToday} className="text-right" />
              <Amount value={totalEnd} className="text-right" />
            </div>
          )}
          {unassignedNote && (
            <p className="border-t px-5 py-3 text-xs leading-relaxed text-muted-foreground">{unassignedNote}</p>
          )}
        </>
      )}
    </SectionCard>
  );
}

function AccountRow({
  account,
  todayBalance,
  outlook,
  isFuture,
}: {
  account: AccountOutlook;
  todayBalance: number;
  outlook: MonthOutlook;
  isFuture: boolean;
}) {
  const atRisk = !outlook.isPast && account.shortfall > 0.01;
  const hasFlows = account.pendingIncome > 0.005 || account.pendingExpense > 0.005;
  const incomeWord = outlook.isPast ? "sin cobrar" : "por cobrar";
  const expenseWord = outlook.isPast ? "sin pagar" : "por pagar";

  return (
    <li className="px-5 py-3">
      <div className={GRID}>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={account.name}>
            {account.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {hasFlows ? (
              <>
                {account.pendingIncome > 0.005 && (
                  <span className="text-positive">
                    +{money(account.pendingIncome)} {incomeWord}
                  </span>
                )}
                {account.pendingExpense > 0.005 && (
                  <span>
                    −{money(account.pendingExpense)} {expenseWord}
                  </span>
                )}
              </>
            ) : (
              !outlook.isPast && (
                <span title="Si pagas o cobras algo desde esta cuenta, asígnala a ese concepto en Configuración.">
                  Sin cobros ni pagos previstos
                </span>
              )
            )}
            {!isFuture && <ReconcileStatus account={account} isPast={outlook.isPast} />}
          </p>
        </div>
        <Amount value={todayBalance} className="text-right text-sm" />
        <Amount value={account.projectedEndBalance} className="text-right text-sm font-semibold" />
      </div>
      {atRisk && (
        <RiskNote
          account={account}
          items={outlook.pendingItems.filter((item) => item.accountId === account.accountId)}
        />
      )}
    </li>
  );
}

function ReconcileStatus({ account, isPast }: { account: AccountOutlook; isPast: boolean }) {
  if (account.reconciledBalance == null) {
    // Mid-month nobody has reconciled yet; only worth saying for months that are over.
    return isPast ? <span>Sin cuadrar</span> : null;
  }
  if (account.isReconciled) {
    return (
      <span className="inline-flex items-center gap-1 text-positive">
        <CheckCircle2 className="h-3 w-3" />
        Cuadrada
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-warning"
      title={`En el cuadre guardaste ${money(account.reconciledBalance)}, pero según la app hay ${money(account.actualBalance)}.`}
    >
      <AlertTriangle className="h-3 w-3" />
      No cuadra
    </span>
  );
}

function RiskNote({ account, items }: { account: AccountOutlook; items: OutlookItem[] }) {
  const explanation = timingExplanation(account, items);
  return (
    <div className="mt-2 rounded-lg bg-negative-soft px-3 py-2 text-xs text-negative">
      <p className="flex items-start gap-1.5">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Llegará a <strong>{money(account.lowestBalance)}</strong>
          {account.lowestBalanceDate ? ` el ${shortDate(account.lowestBalanceDate)}` : ""}: le faltan{" "}
          <strong>{money(account.shortfall)}</strong>.
        </span>
      </p>
      {explanation && (
        <details className="mt-1 pl-5">
          <summary className="cursor-pointer font-medium">¿Por qué, si termina el mes en positivo?</summary>
          <p className="mt-1 leading-relaxed text-foreground/80">{explanation}</p>
        </details>
      )}
    </div>
  );
}

/** When the account ends the month fine but dips below zero before money arrives, explain it in plain words. */
function timingExplanation(account: AccountOutlook, items: OutlookItem[]): string | null {
  const lowestDate = account.lowestBalanceDate;
  if (!lowestDate || account.projectedEndBalance < 0) return null;

  const paidBefore = items
    .filter((item) => item.direction === EntryDirection.Out && item.dueDate <= lowestDate)
    .reduce((total, item) => total + item.amount, 0);
  const incomeBefore = items
    .filter((item) => item.direction === EntryDirection.In && item.dueDate <= lowestDate)
    .reduce((total, item) => total + item.amount, 0);
  const rescue = items
    .filter((item) => item.direction === EntryDirection.In && item.dueDate > lowestDate)
    .sort((a, b) => b.amount - a.amount)[0];

  return (
    `Es un problema de fechas. Hasta el ${shortDate(lowestDate)} salen ${money(paidBefore)} y solo entran ` +
    `${money(incomeBefore)}.` +
    (rescue
      ? ` El dinero que lo arregla llega después: ${rescue.description} (${money(rescue.amount)}) el ${shortDate(rescue.dueDate)}.`
      : "") +
    ` Terminarás el mes con ${money(account.projectedEndBalance)}, pero mientras tanto necesitas ` +
    `${money(account.shortfall)} o retrasar algún pago hasta ese cobro.`
  );
}

function describeUnassigned(unassigned: MonthOutlook["unassigned"]): string | null {
  const parts = [
    unassigned.pendingIncome > 0.005 ? `+${money(unassigned.pendingIncome)} por cobrar` : null,
    unassigned.variableIncomeExpected > 0.005
      ? `+${money(unassigned.variableIncomeExpected)} de ingresos variables`
      : null,
    unassigned.pendingExpense > 0.005 ? `−${money(unassigned.pendingExpense)} por pagar` : null,
    unassigned.variableExpenseReserve > 0.005
      ? `−${money(unassigned.variableExpenseReserve)} reservados para gastos variables`
      : null,
  ].filter((part): part is string => part !== null);

  return parts.length === 0
    ? null
    : `Sin cuenta asignada: ${parts.join(" · ")}. Cuentan en «Libre a fin de mes», pero no en ninguna cuenta.`;
}

function Amount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", value < -0.005 && "text-negative", className)}>
      {money(value)}
    </span>
  );
}
