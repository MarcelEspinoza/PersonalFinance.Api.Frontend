import { AlertTriangle, CalendarRange } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MonthlyData } from "../../services/dashboardService";
import { euros, monthName } from "../../utils/civilDate";
import { SectionCard, SectionLink } from "./SectionCard";
import { capitalize, joinWithAnd, monthTotals } from "./dashboardUtils";

const COLUMNS = 6;
const stickyCell = "sticky left-0 z-10 bg-card";

type Column = {
  year: number;
  month: number;
  income: number;
  expense: number;
  result: number;
  /** Free money at the end of the month, adding up what is left from the months before. */
  free: number;
  incomeNote?: string;
  expenseNote?: string;
};

type Props = {
  /** The selected month first, then the ones after it. */
  months: MonthlyData[];
  /** Free money at the end of the selected month: where «Libre a fin de mes» starts. */
  startFree: number;
  includeVariableReserve: boolean;
  /** What really came in and went out in the selected month, when it is already over. */
  pastTotals?: { income: number; expense: number } | null;
  onSelectMonth: (target: { year: number; month: number }) => void;
};

/** The same summary as «Plan de gastos», month by month: what comes in, what goes out and what is left. */
export function NextMonthsPreview({ months, startFree, includeVariableReserve, pastTotals, onSelectMonth }: Props) {
  const columns = buildColumns(months.slice(0, COLUMNS), startFree, includeVariableReserve, pastTotals ?? null);
  // From a month that is over, adding up the months after it would not match what really happened since.
  const showFree = !pastTotals;
  const isEmpty = columns.every((column) => Math.abs(column.income) < 0.005 && Math.abs(column.expense) < 0.005);
  const firstShort = showFree ? columns.find((column) => column.free < -0.5) : undefined;
  const losingMonths = columns.filter((column) => column.result < -0.5).map((column) => monthName(column.month));

  const select = (column: Column) => {
    onSelectMonth({ year: column.year, month: column.month });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <SectionCard
      icon={<CalendarRange className="h-5 w-5 text-primary" />}
      title="Próximos meses"
      subtitle="Lo previsto según tus gastos fijos, los límites de tus gastos variables y tus recordatorios."
      action={<SectionLink to="/plan">Ver el plan completo</SectionLink>}
      bodyClassName="p-0"
    >
      {isEmpty ? (
        <p className="p-5 text-sm text-muted-foreground">
          Aún no hay nada planificado para estos meses. Apunta tus ingresos y gastos fijos en{" "}
          <Link to="/settings" className="font-medium text-primary hover:underline">
            Configuración → Planificación
          </Link>{" "}
          y aquí verás la previsión.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={cn(stickyCell, "w-44 px-3 py-2.5 text-left")}>
                    <span className="sr-only">Concepto</span>
                  </th>
                  {columns.map((column, index) => (
                    <th
                      key={`${column.year}-${column.month}`}
                      scope="col"
                      className={cn(
                        "px-3 py-2.5 text-right font-medium",
                        index === 0 ? "bg-primary/5 text-primary" : "text-foreground",
                      )}
                    >
                      {index === 0 ? (
                        <MonthLabel column={column} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => select(column)}
                          title={`Ver ${monthName(column.month)} arriba`}
                          className="rounded text-right hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MonthLabel column={column} />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SummaryRow
                  label="Entra"
                  columns={columns}
                  value={(column) => column.income}
                  note={(column) => column.incomeNote}
                  className="text-positive"
                />
                <SummaryRow
                  label="Sale"
                  columns={columns}
                  value={(column) => column.expense}
                  note={(column) => column.expenseNote}
                />
                <SummaryRow
                  label="Te queda"
                  hint="lo que entra menos lo que sale"
                  columns={columns}
                  value={(column) => column.result}
                  signed
                />
                {showFree && (
                  <SummaryRow
                    label="Libre a fin de mes"
                    hint="sumando lo que te sobra de antes"
                    columns={columns}
                    value={(column) => column.free}
                    total
                  />
                )}
              </tbody>
            </table>
          </div>

          {firstShort ? (
            <p className="m-4 flex items-start gap-2 rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Ojo: a fin de {monthName(firstShort.month)} te faltarían {euros(-firstShort.free)}. Mira en el plan qué
                gasto puedes mover o reducir.
              </span>
            </p>
          ) : (
            showFree &&
            losingMonths.length > 0 && (
              <p className="m-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  En {joinWithAnd(losingMonths)} sale más de lo que entra, pero lo cubres con lo que te sobra de antes.
                </span>
              </p>
            )
          )}
        </>
      )}
    </SectionCard>
  );
}

function buildColumns(
  months: MonthlyData[],
  startFree: number,
  includeVariableReserve: boolean,
  pastTotals: { income: number; expense: number } | null,
): Column[] {
  const columns: Column[] = [];
  months.forEach((month, index) => {
    const past = index === 0 ? pastTotals : null;
    const totals = past
      ? { income: past.income, expense: past.expense, result: past.income - past.expense }
      : monthTotals(month, includeVariableReserve);
    columns.push({
      year: month.year,
      month: month.monthNumber,
      ...totals,
      free: index === 0 ? startFree : columns[index - 1].free + totals.result,
      incomeNote: past ? undefined : incomeNote(month),
      expenseNote: past ? undefined : expenseNote(month, includeVariableReserve),
    });
  });
  return columns;
}

/** The estimated parts already inside «Entra» (shown when hovering the amount). */
function incomeNote(month: MonthlyData): string | undefined {
  return includes([
    [month.reminderIncome ?? 0, "de recordatorios"],
    [month.settlementIncome ?? 0, "de liquidaciones"],
  ]);
}

/** The estimated parts already inside «Sale» (shown when hovering the amount). */
function expenseNote(month: MonthlyData, includeVariableReserve: boolean): string | undefined {
  return includes([
    [includeVariableReserve ? month.variableExpenseReserve : 0, "reservados para gastos variables"],
    [month.reminders, "de recordatorios"],
    [month.settlementExpense ?? 0, "de liquidaciones"],
  ]);
}

function includes(parts: [number, string][]): string | undefined {
  const text = parts.filter(([amount]) => amount > 0.005).map(([amount, label]) => `${euros(amount)} ${label}`);
  return text.length === 0 ? undefined : `Incluye ${joinWithAnd(text)}.`;
}

function MonthLabel({ column }: { column: Column }) {
  return (
    <>
      <span className="block">{capitalize(monthName(column.month))}</span>
      <span className="block text-[11px] font-normal text-muted-foreground">{column.year}</span>
    </>
  );
}

function SummaryRow({
  label,
  hint,
  columns,
  value,
  note,
  className,
  signed = false,
  total = false,
}: {
  label: string;
  hint?: string;
  columns: Column[];
  value: (column: Column) => number;
  note?: (column: Column) => string | undefined;
  className?: string;
  signed?: boolean;
  total?: boolean;
}) {
  return (
    <tr className={cn((signed || total) && "font-semibold")}>
      <th scope="row" className={cn(stickyCell, "border-t px-3 py-2 text-left font-medium", total && "border-t-2")}>
        {label}
        {hint && <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </th>
      {columns.map((column, index) => {
        const amount = value(column);
        return (
          <td
            key={`${column.year}-${column.month}`}
            title={note?.(column)}
            className={cn(
              "border-t px-3 py-2 text-right tabular-nums",
              total && "border-t-2",
              index === 0 && "bg-primary/5",
              signed || total ? (amount < -0.005 ? "text-negative" : signed ? "text-positive" : undefined) : className,
            )}
          >
            {signed && amount > 0.005 ? "+" : ""}
            {euros(amount)}
          </td>
        );
      })}
    </tr>
  );
}
