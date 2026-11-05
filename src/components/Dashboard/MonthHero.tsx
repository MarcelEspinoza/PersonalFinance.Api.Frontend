import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type {
  DashboardProjection,
  MonthlyData,
  MonthOutlook,
  OutlookItem,
  Summary,
} from "../../services/dashboardService";
import { EntryDirection } from "../../types/ledger";
import { money } from "../../utils/civilDate";
import { Card } from "../ui/card";
import { joinWithAnd, ledgerLink, monthTotals, pendingFlows, type PendingFlows } from "./dashboardUtils";
import { ExtraLineRow, OutlookItemRow, type ExtraLine } from "./OutlookItemRow";

/** What makes up a line of the sum, shown when the line is opened. */
type Detail = { items: OutlookItem[]; extras: ExtraLine[] };

type Line = {
  sign?: "+" | "−" | "=";
  label: string;
  hint?: string;
  value: number;
  valueClassName?: string;
  total?: boolean;
  detail?: Detail;
};

type Props = {
  projection: DashboardProjection;
  /** The selected month, with or without the variable expense reserve as the user chose. */
  outlook: MonthOutlook;
  /** Month name, e.g. "noviembre". */
  monthName: string;
  includeVariableReserve: boolean;
  onChangeReserve: (value: boolean) => void;
};

/**
 * The answer to «how am I doing this month», and the sum that leads to it, read like a bank statement:
 * what you start with, + what comes in, − what goes out, = what is left.
 */
export function MonthHero({ projection, outlook, monthName, includeVariableReserve, onChangeReserve }: Props) {
  const isPast = outlook.isPast;
  const isFuture = !isPast && !outlook.isCurrent;
  const closingBalance = outlook.accounts.reduce((total, account) => total + account.projectedEndBalance, 0);
  const headline = isPast ? closingBalance : outlook.freeMoney;
  const baseline = projection.outlook.withoutVariableReserve;
  // How much the variable expenses move «Libre a fin de mes» (in a future month, also the ones of the months before).
  const reserveImpact = baseline ? baseline.freeMoney - projection.outlook.freeMoney : 0;
  const month = projection.monthlyData.find((item) => item.isCurrent) ?? projection.monthlyData[0];
  const lines = isPast
    ? pastLines(projection.summary, closingBalance, monthName)
    : isFuture && month
      ? futureLines(month, outlook, monthName, includeVariableReserve)
      : currentLines(projection.summary.currentBalance, outlook);
  const unconfirmed = isPast ? unconfirmedText(pendingFlows(outlook)) : null;
  const monthLink = ledgerLink(outlook.year, outlook.month);
  const [openLines, setOpenLines] = useState<string[]>([]);
  const toggleLine = (label: string) =>
    setOpenLines((open) => (open.includes(label) ? open.filter((item) => item !== label) : [...open, label]));

  return (
    <Card data-tour="dashboard-balance" className="p-5 sm:p-6">
      <div
        className={cn(
          "grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
          // With a line open the sum gets long: the big number stays at the top instead of floating in the middle.
          openLines.length > 0 ? "md:items-start" : "md:items-center",
        )}
      >
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {isPast ? `Saldo al cerrar ${monthName}` : `Libre a fin de ${monthName}`}
          </p>
          <p
            className={cn(
              "mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl",
              headline < -0.005 ? "text-negative" : isPast ? "text-foreground" : "text-positive",
            )}
          >
            {money(headline)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isPast
              ? "Lo que había en tus cuentas el último día del mes."
              : isFuture
                ? `Lo que te quedará libre al terminar ${monthName}, si todo va según lo previsto.`
                : "Lo que te quedará cuando se cobre y se pague todo lo que falta este mes."}
          </p>
          {!isPast && reserveImpact > 0.005 && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeVariableReserve}
                onChange={(event) => onChangeReserve(event.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Contar gastos variables
            </label>
          )}
        </div>

        <div>
          <div className="overflow-hidden rounded-xl border">
            {lines.map((line) => (
              <EquationLine
                key={line.label}
                line={line}
                open={openLines.includes(line.label)}
                onToggle={() => toggleLine(line.label)}
                monthLink={monthLink}
              />
            ))}
          </div>
          {isPast && (
            // A closed month has no lines to open: its movements are in «Mes».
            <p className="mt-2 text-xs text-muted-foreground">
              {unconfirmed && `${unconfirmed} `}
              <Link to={monthLink} className="inline-flex items-center font-medium text-primary hover:underline">
                {unconfirmed ? "Revisar en Mes" : `Ver los movimientos de ${monthName} en Mes`}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          )}
        </div>
      </div>

      <AccountTiles projection={projection} outlook={outlook} isPast={isPast} isFuture={isFuture} />
    </Card>
  );
}

const PASSING_HINT = "Dinero de otros que solo pasa por tus cuentas (pasanaco, encargos…).";

function currentLines(today: number, outlook: MonthOutlook): Line[] {
  const flows = pendingFlows(outlook);
  const passing = passingMoney(outlook);
  // Whatever else the forecast adds, so the sum always matches «Libre a fin de mes».
  const rest = outlook.freeMoney - (today + flows.toCollect - flows.toPay + passing);

  return [
    { label: "Hoy tienes", hint: "Lo que hay ahora en tus cuentas.", value: today },
    {
      sign: "+",
      label: "Falta cobrar",
      hint: collectHint(flows),
      value: flows.toCollect,
      valueClassName: "text-positive",
      detail: flowDetail(outlook, EntryDirection.In, flows.toCollect),
    },
    {
      sign: "−",
      label: "Falta pagar",
      hint: payHint(flows),
      value: flows.toPay,
      detail: flowDetail(outlook, EntryDirection.Out, flows.toPay),
    },
    ...signedLine("Dinero de paso", passing, PASSING_HINT, passingDetail(outlook)),
    ...signedLine("Otros ajustes", rest),
    {
      sign: "=",
      label: "Libre a fin de mes",
      value: outlook.freeMoney,
      valueClassName: toneOf(outlook.freeMoney),
      total: true,
    },
  ];
}

function futureLines(
  month: MonthlyData,
  outlook: MonthOutlook,
  monthName: string,
  includeVariableReserve: boolean,
): Line[] {
  const totals = monthTotals(month, includeVariableReserve);
  const passing = passingMoney(outlook);
  const before = outlook.freeMoney - totals.result - passing;
  const reserve = includeVariableReserve ? month.variableExpenseReserve : 0;

  return [
    {
      label: `Al empezar ${monthName}`,
      hint: "Lo libre que te dejan los meses anteriores.",
      value: before,
      valueClassName: before < -0.005 ? "text-negative" : undefined,
    },
    {
      sign: "+",
      label: `Entra en ${monthName}`,
      value: totals.income,
      valueClassName: "text-positive",
      detail: flowDetail(outlook, EntryDirection.In, totals.income),
    },
    {
      sign: "−",
      label: `Sale en ${monthName}`,
      hint: reserve > 0.005 ? `Incluye ${money(reserve)} reservados para gastos variables.` : undefined,
      value: totals.expense,
      detail: flowDetail(outlook, EntryDirection.Out, totals.expense),
    },
    ...signedLine("Dinero de paso", passing, PASSING_HINT, passingDetail(outlook)),
    {
      sign: "=",
      label: `Libre a fin de ${monthName}`,
      hint:
        totals.result < -0.005
          ? `En ${monthName} sale ${money(-totals.result)} más de lo que entra.`
          : `En ${monthName} entra ${money(totals.result)} más de lo que sale.`,
      value: outlook.freeMoney,
      valueClassName: toneOf(outlook.freeMoney),
      total: true,
    },
  ];
}

function pastLines(summary: Summary, closingBalance: number, monthName: string): Line[] {
  const opening = summary.monthOpeningBalance;
  const result = summary.currentMonthResult;
  // Money of others and transfers move the balance without being income or expense.
  const rest = closingBalance - (opening + result);

  return [
    { label: `Al empezar ${monthName}`, hint: "Lo que había en tus cuentas.", value: opening },
    { sign: "+", label: "Entró", value: summary.currentMonthIncome, valueClassName: "text-positive" },
    { sign: "−", label: "Salió", value: summary.currentMonthExpense },
    ...signedLine(
      "Dinero de paso y otros ajustes",
      rest,
      "Dinero de otros que pasó por tus cuentas y cobros que llegaron antes pero son del mes siguiente.",
    ),
    {
      sign: "=",
      label: `Saldo al cerrar ${monthName}`,
      hint:
        result < -0.005
          ? `En ${monthName} gastaste ${money(-result)} más de lo que entró.`
          : `En ${monthName} ahorraste ${money(result)}.`,
      value: closingBalance,
      total: true,
    },
  ];
}

/** Net money that only passes through your accounts this month: + comes in, − goes out. */
function passingMoney(outlook: MonthOutlook): number {
  return outlook.pendingItems
    .filter((item) => item.isTransfer)
    .reduce((total, item) => total + (item.direction === EntryDirection.In ? item.amount : -item.amount), 0);
}

/** A «+» or «−» line, left out when it is zero. */
function signedLine(label: string, value: number, hint?: string, detail?: Detail): Line[] {
  if (Math.abs(value) < 0.005) return [];
  return [{ sign: value < 0 ? "−" : "+", label, hint, value: Math.abs(value), detail }];
}

const byDate = (items: OutlookItem[]) => [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

/**
 * The lines behind a «comes in» or «goes out» total: what is still pending, by date, plus the estimate of the
 * variable concepts with no account and, in a future month, what is already confirmed in «Mes».
 */
function flowDetail(outlook: MonthOutlook, direction: EntryDirection, total: number): Detail {
  const isIncome = direction === EntryDirection.In;
  const items = byDate(outlook.pendingItems.filter((item) => !item.isTransfer && item.direction === direction));
  const estimate = isIncome ? outlook.unassigned.variableIncomeExpected : outlook.unassigned.variableExpenseReserve;
  const confirmed = total - items.reduce((sum, item) => sum + item.amount, 0) - estimate;
  const extras: ExtraLine[] = [];
  if (estimate > 0.005) {
    extras.push({
      label: isIncome ? "Ingresos variables que aún esperas (estimado)" : "Gastos variables sin cuenta (estimado)",
      amount: estimate,
      direction,
    });
  }
  if (confirmed > 0.005) {
    extras.push({
      label: isIncome ? "Ya cobrado (lo ves en Mes)" : "Ya pagado (lo ves en Mes)",
      amount: confirmed,
      direction,
    });
  }
  return { items, extras };
}

function passingDetail(outlook: MonthOutlook): Detail {
  return { items: byDate(outlook.pendingItems.filter((item) => item.isTransfer)), extras: [] };
}

const toneOf = (value: number) => (value < -0.005 ? "text-negative" : "text-positive");

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

function collectHint(flows: PendingFlows): string {
  const parts = [
    flows.collectCount > 0 ? plural(flows.collectCount, "cobro", "cobros") : null,
    flows.variableIncome > 0.005 ? `${money(flows.variableIncome)} de ingresos variables` : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? "Nada pendiente." : `${joinWithAnd(parts)}.`;
}

function payHint(flows: PendingFlows): string {
  const parts = [
    flows.payCount > 0 ? plural(flows.payCount, "pago", "pagos") : null,
    flows.variableExpense > 0.005 ? `${money(flows.variableExpense)} reservados para gastos variables` : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? "Nada pendiente." : `${joinWithAnd(parts)}.`;
}

function unconfirmedText(flows: PendingFlows): string | null {
  const parts = [
    flows.collectCount > 0 ? plural(flows.collectCount, "cobro", "cobros") : null,
    flows.payCount > 0 ? plural(flows.payCount, "pago", "pagos") : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : `Quedaron sin confirmar ${joinWithAnd(parts)}.`;
}

/** A line of the sum. Lines with a detail open on click to show what makes them up. */
function EquationLine({
  line,
  open,
  onToggle,
  monthLink,
}: {
  line: Line;
  open: boolean;
  onToggle: () => void;
  monthLink: string;
}) {
  const panelId = useId();
  const detail = line.detail && line.detail.items.length + line.detail.extras.length > 0 ? line.detail : null;
  const rowClassName = cn(
    "flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left",
    line.total && "bg-muted/50",
  );
  const content = (
    <>
      <span className="flex min-w-0 gap-2">
        <span aria-hidden="true" className="w-3 shrink-0 text-center font-semibold text-muted-foreground">
          {line.sign ?? ""}
        </span>
        <span className="min-w-0">
          <span className={cn("block text-sm", line.total ? "font-semibold" : "font-medium")}>{line.label}</span>
          {line.hint && <span className="block text-xs text-muted-foreground">{line.hint}</span>}
        </span>
      </span>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums",
          line.total ? "text-base font-bold" : "text-sm font-semibold",
          line.valueClassName,
        )}
      >
        {money(line.value)}
        {detail && (
          <ChevronDown
            aria-hidden="true"
            className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        )}
      </span>
    </>
  );

  return (
    <div className="border-t first:border-t-0">
      {detail ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          title={open ? "Ocultar el detalle" : "Ver el detalle"}
          onClick={onToggle}
          className={cn(
            rowClassName,
            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          )}
        >
          {content}
        </button>
      ) : (
        <div className={rowClassName}>{content}</div>
      )}
      {detail && open && (
        <div id={panelId} className="border-t bg-muted/30">
          <ul className="divide-y">
            {detail.items.map((item, index) => (
              <OutlookItemRow key={`${item.dueDate}-${item.description}-${index}`} item={item} />
            ))}
            {detail.extras.map((extra) => (
              <ExtraLineRow key={extra.label} line={extra} />
            ))}
          </ul>
          <Link
            to={monthLink}
            className="flex items-center justify-end gap-1 border-t px-4 py-2 text-xs font-medium text-primary hover:underline"
          >
            Ver en Mes
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

/** What each account has today and how it ends the month. Accounts without money are left out. */
function AccountTiles({
  projection,
  outlook,
  isPast,
  isFuture,
}: {
  projection: DashboardProjection;
  outlook: MonthOutlook;
  isPast: boolean;
  isFuture: boolean;
}) {
  const todayById = new Map(projection.accounts.map((account) => [account.accountId, account.balance]));
  const accounts = outlook.accounts
    .map((account) => ({
      id: account.accountId,
      name: account.name,
      today: todayById.get(account.accountId) ?? account.actualBalance,
      end: account.projectedEndBalance,
    }))
    .filter((account) => Math.abs(account.today) >= 0.005 || Math.abs(account.end) >= 0.005);
  if (accounts.length === 0) return null;
  const showToday = !isPast && !isFuture;
  const withoutAccount = isPast ? null : withoutAccountText(outlook.unassigned);

  return (
    <div className="mt-5 border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">
        {showToday ? "Tus cuentas: hoy → a fin de mes" : isPast ? "Tus cuentas al cerrar el mes" : "Tus cuentas a fin de mes"}
      </p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {accounts.map((account) => (
          <li key={account.id} className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="truncate text-xs text-muted-foreground" title={account.name}>
              {account.name}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-sm tabular-nums">
              {showToday && (
                <>
                  <span className={cn(account.today < -0.005 && "text-negative")}>{money(account.today)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="a fin de mes" />
                </>
              )}
              <span className={cn("font-semibold", account.end < -0.005 && "text-negative")}>
                {money(account.end)}
              </span>
            </p>
          </li>
        ))}
      </ul>
      {withoutAccount && <p className="mt-2 text-xs text-muted-foreground">{withoutAccount}</p>}
    </div>
  );
}

/** Lines with no account (e.g. reminders) count in «Libre a fin de mes» but move no account balance. */
function withoutAccountText(unassigned: MonthOutlook["unassigned"]): string | null {
  const pay = unassigned.pendingExpense + unassigned.variableExpenseReserve;
  const collect = unassigned.pendingIncome + unassigned.variableIncomeExpected;
  const parts = [
    pay > 0.005 ? `${money(pay)} en pagos` : null,
    collect > 0.005 ? `${money(collect)} en cobros` : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0
    ? null
    : `Además hay ${joinWithAnd(parts)} sin cuenta asignada: no cambian estas cuentas, pero sí cuentan en «Libre a fin de mes».`;
}
