import { AlertTriangle, BarChart3, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MonthlyData } from "../../services/dashboardService";
import { SectionCard, SectionLink } from "./SectionCard";
import { capitalize, joinWithAnd } from "./dashboardUtils";

const wholeEuros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const signedWholeEuros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

// Rounding first avoids showing "-0 €".
const euros = (value: number) => wholeEuros.format(Math.round(value) || 0);
const signedEuros = (value: number) => signedWholeEuros.format(Math.round(value) || 0);

type FutureMonthsBoxesProps = {
  months: MonthlyData[];
  title: string;
  /** Money in the accounts at the end of the selected month: the starting point of "En el banco". */
  startBalance: number;
  startMonthName: string;
  onSelectMonth: (target: { year: number; month: number }) => void;
};

/** One box per month after the selected one: what comes in, what goes out and what is left. */
export function FutureMonthsBoxes({ months, title, startBalance, startMonthName, onSelectMonth }: FutureMonthsBoxesProps) {
  let runningBalance = startBalance;
  const boxes = months.map((month) => {
    runningBalance += month.balance;
    return { month, bankEnd: runningBalance };
  });
  const totalIncome = months.reduce((total, month) => total + month.income, 0);
  const totalExpense = months.reduce((total, month) => total + month.expense, 0);
  const totalBalance = months.reduce((total, month) => total + month.balance, 0);
  const firstOverdrawn = boxes.find((box) => box.bankEnd < -0.5);
  const shortMonths = months.filter((month) => month.balance < -0.5).map((month) => month.month.split(" ")[0]);
  const isEmpty = months.every((month) => Math.abs(month.income) < 0.005 && Math.abs(month.expense) < 0.005);

  return (
    <SectionCard
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      title={title}
      subtitle="Previsión de cada mes según tus gastos fijos, los límites de tus gastos variables y tus recordatorios."
      action={<SectionLink to="/plan">Plan de gastos</SectionLink>}
    >
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay nada planificado para esos meses. Apunta tus ingresos y gastos fijos en{" "}
          <Link to="/settings" className="font-medium text-primary hover:underline">
            Configuración
          </Link>{" "}
          y aquí verás la previsión.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {boxes.map(({ month, bankEnd }) => (
              <button
                key={`${month.year}-${month.monthNumber}`}
                type="button"
                onClick={() => {
                  onSelectMonth({ year: month.year, month: month.monthNumber });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                title={`Ver ${month.month} en detalle`}
                className={cn(
                  "group rounded-lg border p-3 text-left transition hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  bankEnd < -0.5 ? "border-negative/40 bg-negative-soft/40" : "bg-card",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{capitalize(month.month)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <dl className="mt-2 space-y-1 text-sm">
                  <BoxRow label="Entra" value={euros(month.income)} valueClassName="text-positive" />
                  <IncomeNote settlements={month.settlementIncome ?? 0} />
                  <BoxRow label="Sale" value={euros(month.expense)} valueClassName="text-orange-600" />
                  <ExpenseNote
                    reserve={month.variableExpenseReserve}
                    reminders={month.reminders}
                    settlements={month.settlementExpense ?? 0}
                  />
                  <BoxRow
                    label="Te queda"
                    value={signedEuros(month.balance)}
                    valueClassName={month.balance < -0.5 ? "text-negative" : "text-positive"}
                    className="border-t pt-1 font-semibold"
                  />
                  <BoxRow
                    label="En el banco"
                    value={euros(bankEnd)}
                    valueClassName={bankEnd < -0.5 ? "font-semibold text-negative" : undefined}
                    className="text-xs text-muted-foreground"
                  />
                </dl>
              </button>
            ))}
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
            <Total label="Entra en total" value={euros(totalIncome)} className="text-positive" />
            <Total label="Sale en total" value={euros(totalExpense)} className="text-orange-600" />
            <Total
              label="Te queda"
              value={signedEuros(totalBalance)}
              className={totalBalance < -0.5 ? "text-negative" : "text-foreground"}
            />
          </dl>

          {firstOverdrawn ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Ojo: a final de {firstOverdrawn.month.month} tus cuentas quedarían en {euros(firstOverdrawn.bankEnd)}.
                Revisa los gastos de esos meses o guarda dinero antes.
              </span>
            </p>
          ) : (
            shortMonths.length > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  En {joinWithAnd(shortMonths)} sale más de lo que entra, pero lo cubres con lo que tendrás ahorrado.
                </span>
              </p>
            )
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            «En el banco» es lo que tendrías en total en tus cuentas al terminar cada mes, partiendo de los{" "}
            {euros(startBalance)} de final de {startMonthName}. Toca un mes para verlo en detalle.
          </p>
        </>
      )}
    </SectionCard>
  );
}

function BoxRow({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-2", className)}>
      <dt className="truncate">{label}</dt>
      <dd className={cn("shrink-0 tabular-nums", valueClassName)}>{value}</dd>
    </div>
  );
}

/** The estimated parts already inside «Sale»: hidden when all are zero. */
function ExpenseNote({ reserve, reminders, settlements }: { reserve: number; reminders: number; settlements: number }) {
  const parts: string[] = [];
  if (Math.round(reserve) > 0) parts.push(`${euros(reserve)} reservado para variables`);
  if (Math.round(reminders) > 0) parts.push(`${euros(reminders)} de recordatorios`);
  if (Math.round(settlements) > 0) parts.push(`${euros(settlements)} de liquidaciones`);
  if (parts.length === 0) return null;

  return (
    <div className="text-[11px] leading-snug text-muted-foreground">
      <dt className="inline">incluye</dt> <dd className="inline">{parts.join(" · ")}</dd>
    </div>
  );
}

/** What open settlements are expected to pay you, already inside «Entra». */
function IncomeNote({ settlements }: { settlements: number }) {
  if (Math.round(settlements) <= 0) return null;

  return (
    <div className="text-[11px] leading-snug text-muted-foreground">
      <dt className="inline">incluye</dt> <dd className="inline">{euros(settlements)} de liquidaciones</dd>
    </div>
  );
}

function Total({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-base font-semibold tabular-nums sm:text-lg", className)}>{value}</dd>
    </div>
  );
}
