import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { capitalize } from "../../components/Dashboard/dashboardUtils";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { getDashboardProjection } from "../../services/dashboardService";
import {
  expensePlanningService,
  type ExpensePlanFixedRow,
  type ExpensePlanMonth,
  type ExpensePlanMonths,
  type ExpensePlanning,
  type ExpensePlanVariableCell,
  type ExpensePlanVariableRow,
} from "../../services/expensePlanningService";
import { ConceptKind, EntryDirection } from "../../types/ledger";
import { euros, monthName, nextMonth, previousMonth } from "../../utils/civilDate";
import { PlanConceptDialog } from "./PlanConceptDialog";
import {
  amountText,
  conceptsById,
  conceptsWithAmountsAhead,
  parseAmount,
  scheduleText,
  serverMessage,
  type PlanDialogTarget,
} from "./planHelpers";

/** Group names the plan gives to the rows that come from a reminder or a settlement. */
const REMINDER_GROUP = "Recordatorio";
const SETTLEMENT_GROUP = "Liquidaciones";
const TWO_DECIMAL_EUROS = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const breakdownAmount = (value: number, signed: boolean) => {
  const rounded = Math.round(value * 100) / 100 || 0;
  const sign = rounded < 0 ? "−" : signed && rounded > 0 ? "+" : "";
  return `${sign}${TWO_DECIMAL_EUROS.format(Math.abs(rounded))} €`;
};

type MonthStart = { year: number; month: number };
type PlanBreakdown = {
  currentMonthBalance: number;
  openingBalance: number;
  passingAdjustment: number;
  freeMoney: number;
};
type PlanOutlook = { key: string; freeMoney: number; breakdown: PlanBreakdown | null };
/** A limit for one month only, being typed in the table. */
type Editing = { conceptId: string; name: string; month: MonthStart; text: string };
type DialogState = { target: PlanDialogTarget | null; open: boolean; seq: number };
type Notice = { id: number; text: string };

const hasPlan = (row: ExpensePlanVariableRow) =>
  row.defaultBudget != null ||
  row.cells.some((cell) => cell.budget != null || cell.planned > 0.005 || cell.spent > 0.005);

const sameMonth = (a: MonthStart, b: MonthStart) => a.year === b.year && a.month === b.month;
const keyOf = (month: MonthStart) => `${month.year}-${month.month}`;

const stickyCell = "sticky left-0 z-10 bg-card";

/** The next 6 months: what comes in, what always goes out, what depends on you, and where each amount comes from. */
export function PlanPage() {
  const [start, setStart] = useState<MonthStart | null>(null);
  const [data, setData] = useState<ExpensePlanMonths | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [planning, setPlanning] = useState<ExpensePlanning | null>(null);
  const [planningFailed, setPlanningFailed] = useState(false);
  /** Free money at the end of the first month shown, the same as on the «Dashboard». */
  const [outlook, setOutlook] = useState<PlanOutlook | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showUnbudgeted, setShowUnbudgeted] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ target: null, open: false, seq: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    const request = ++requestRef.current;
    setLoading(true);
    setLoadFailed(false);
    void (async () => {
      try {
        const result = await expensePlanningService.getMonths(start ?? undefined);
        if (request === requestRef.current) setData(result);
      } catch {
        if (request === requestRef.current) setLoadFailed(true);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    })();
  }, [start, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    expensePlanningService
      .get()
      .then((result) => {
        if (cancelled) return;
        setPlanning(result);
        setPlanningFailed(false);
      })
      .catch(() => {
        if (!cancelled) setPlanningFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const months = data?.months ?? [];
  const first = months[0];
  const firstYear = first?.year;
  const firstMonth = first?.month;

  useEffect(() => {
    if (firstYear === undefined || firstMonth === undefined) return;
    let cancelled = false;
    getDashboardProjection(firstYear, firstMonth)
      .then(({ data: projection }) => {
        if (cancelled) return;
        // From a month that is over, adding up the months after it would not match what really happened.
        const currentMonth = projection.monthlyData.find((month) => month.isCurrent);
        const transfers = [...projection.outlook.pendingItems, ...projection.outlook.overdueItems].filter(
          (item) => item.isTransfer,
        );
        const pendingTransfers = transfers.reduce(
          (total, item) =>
            total + (item.direction === EntryDirection.Out ? item.amount : -item.amount),
          0,
        );
        const { currentBalance, monthOpeningBalance, currentMonthIncome, currentMonthExpense } = projection.summary;
        setOutlook(
          projection.outlook.isPast
            ? null
            : {
                key: keyOf({ year: firstYear, month: firstMonth }),
                freeMoney: projection.outlook.freeMoney,
                breakdown:
                  projection.outlook.isCurrent && currentMonth
                    ? {
                        currentMonthBalance: currentMonth.balance,
                        openingBalance: monthOpeningBalance,
                        passingAdjustment:
                          currentBalance - (monthOpeningBalance + currentMonthIncome - currentMonthExpense) -
                          pendingTransfers,
                        freeMoney: projection.outlook.freeMoney,
                      }
                    : null,
              },
        );
      })
      .catch(() => {
        if (!cancelled) setOutlook(null);
      });
    return () => {
      cancelled = true;
    };
  }, [firstYear, firstMonth, reloadKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(
      () => setNotice((current) => (current?.id === notice.id ? null : current)),
      5000,
    );
    return () => window.clearTimeout(timer);
  }, [notice]);

  const concepts = useMemo(() => conceptsById(planning), [planning]);
  const amountsAhead = useMemo(() => conceptsWithAmountsAhead(data), [data]);

  /** Loads everything again (after a save or on retry). */
  const reload = () => setReloadKey((key) => key + 1);
  const showsCurrentMonth = start === null || first?.isCurrent === true;
  const say = (text: string) => setNotice((current) => ({ id: (current?.id ?? 0) + 1, text }));

  const moveTo = (target: MonthStart | null) => {
    setEditing(null);
    setError(null);
    setStart(target);
  };

  const openDialog = (target: PlanDialogTarget) => {
    setEditing(null);
    setError(null);
    setDialog((current) => ({ target, open: true, seq: current.seq + 1 }));
  };
  const closeDialog = () => setDialog((current) => ({ ...current, open: false }));
  const saved = (name: string) => {
    closeDialog();
    say(`Guardado: «${name}».`);
    reload();
  };

  const startEdit = (row: ExpensePlanVariableRow, month: MonthStart, value?: number | null) => {
    setError(null);
    setEditing({
      conceptId: row.conceptId,
      name: row.name,
      month: { year: month.year, month: month.month },
      text: amountText(value),
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setError(null);
  };

  /** null = the month goes back to the usual limit. */
  const saveLimit = async (limit: number | null) => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await expensePlanningService.setMonthBudget(editing.conceptId, editing.month.year, editing.month.month, limit);
      say(`Guardado: «${editing.name}» en ${monthName(editing.month.month)}.`);
      setEditing(null);
      reload();
    } catch (saveError) {
      setError(serverMessage(saveError) ?? "No se ha podido guardar el límite. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const submitLimit = () => {
    if (!editing) return;
    const limit = parseAmount(editing.text);
    if (limit === undefined) {
      setError("Escribe solo el número, por ejemplo 300 o 300,50.");
      return;
    }
    void saveLimit(limit);
  };

  const header = (
    <PageHeader
      title="Plan de gastos"
      description="Los próximos 6 meses. Cambia presupuestos o recibos desde su fila; «Añadir pago fijo» crea un pago independiente."
      actions={
        <div className="flex items-center gap-2">
          {!showsCurrentMonth && (
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => moveTo(null)}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Este mes
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Un mes antes"
            disabled={!first || loading || saving}
            onClick={() => first && moveTo(previousMonth(first.year, first.month))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Un mes después"
            disabled={!first || loading || saving}
            onClick={() => first && moveTo(nextMonth(first.year, first.month))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
    />
  );

  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="p-6 text-sm text-muted-foreground">
          {loadFailed ? (
            <div className="flex flex-wrap items-center gap-3">
              <span>No se ha podido cargar el plan.</span>
              <Button variant="outline" size="sm" onClick={reload}>
                Reintentar
              </Button>
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando tu plan…
            </span>
          )}
        </Card>
      </div>
    );
  }

  const income = mergeInstallments(data.income ?? []);
  const fixedRows = mergeInstallments(data.fixed);
  const budgeted = data.variable.filter(hasPlan);
  const unbudgeted = data.variable.filter((row) => !hasPlan(row));
  const variableRows = showUnbudgeted ? [...budgeted, ...unbudgeted] : budgeted;
  const columnCount = months.length + 1;
  const isEmpty = income.length === 0 && data.fixed.length === 0 && data.variable.length === 0;
  const canChange = planning !== null;

  const left = months.map((month) => month.income - month.fixedExpense - month.variableExpense);
  const startFree = outlook && first && outlook.key === keyOf(first) ? outlook.freeMoney : null;
  const free = startFree === null ? null : runningFree(startFree, left);
  const currentBreakdown =
    first?.isCurrent && outlook?.key === keyOf(first) ? outlook.breakdown : null;

  // Where the guided tour points.
  const fixedTourId = data.fixed.find((row) => concepts.has(row.conceptId))?.conceptId;
  const limitTourId = budgeted[0]?.conceptId;
  const limitTourIndex = months.findIndex((month) => !month.isClosed);

  const newButton = (kind: ConceptKind, tour?: string) =>
    canChange && (
      <NewButton tour={tour} onClick={() => openDialog({ mode: "new", kind })}>
        {kind === ConceptKind.Income ? "Nuevo ingreso fijo" : "Añadir pago fijo"}
      </NewButton>
    );

  const change = (conceptId: string, label: string, tour?: string) => (
    <InlineButton tour={tour} disabled={loading} onClick={() => openDialog({ mode: "edit", conceptId })}>
      {label}
    </InlineButton>
  );

  /** How the row gets its amounts, with the way to change it. */
  const sourceOf = (row: ExpensePlanFixedRow, tour?: string): ReactNode => {
    if (!planning) return null;
    const concept = concepts.get(row.conceptId);
    if (concept) {
      const label = concept.kind === ConceptKind.Expense
        ? concept.item.frequency ? "Cambiar recibo" : "Cambiar previsión"
        : "Cambiar";
      return (
        <>
          {scheduleText(concept, planning.accounts)} · {change(row.conceptId, label, tour)}
        </>
      );
    }
    if (row.groupName === REMINDER_GROUP) {
      return (
        <>
          De un recordatorio · <InlineLink to="/reminders">Ver</InlineLink>
        </>
      );
    }
    if (row.groupName === SETTLEMENT_GROUP) {
      return (
        <>
          De una liquidación · <InlineLink to="/settlements">Ver</InlineLink>
        </>
      );
    }
    return null;
  };

  const limitOf = (row: ExpensePlanVariableRow): ReactNode => {
    const text = row.defaultBudget != null ? `Límite: ${euros(row.defaultBudget)} al mes` : "Sin límite";
    if (!concepts.has(row.conceptId)) return text;
    return (
      <>
        {text} · {change(row.conceptId, row.defaultBudget != null ? "Cambiar presupuesto" : "Poner presupuesto")}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {header}

      <PlanSources open={showSources} onToggle={() => setShowSources((value) => !value)} />

      {loadFailed && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning" role="alert">
          No se han podido cargar esos meses; sigues viendo los anteriores.
        </p>
      )}
      {planningFailed && (
        <p
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning"
          role="alert"
        >
          No se ha podido cargar lo necesario para cambiar el plan.
          <button type="button" onClick={reload} className="font-medium underline">
            Reintentar
          </button>
        </p>
      )}

      {isEmpty ? (
        <Card className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>
            Aún no tienes nada en el plan. Empieza por lo que cobras y pagas siempre igual, como la nómina o el
            alquiler.
          </p>
          {canChange && (
            <div className="flex flex-wrap gap-2">
              {newButton(ConceptKind.Income)}
              {newButton(ConceptKind.Expense)}
            </div>
          )}
        </Card>
      ) : (
        <Card data-tour="plan-table" className={cn("overflow-hidden transition-opacity", loading && "opacity-60")}>
          <div className="max-h-[calc(100vh-7rem)] overflow-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className={cn(stickyCell, "z-30 w-44 border-b px-3 py-2.5 text-left font-medium text-muted-foreground sm:w-64")}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange className="h-4 w-4" /> Mes
                    </span>
                  </th>
                  {months.map((month) => (
                    <MonthHeader key={keyOf(month)} month={month} />
                  ))}
                </tr>
              </thead>

              <tbody>
                <SummaryRow
                  label="Entra"
                  months={months}
                  values={months.map((month) => month.income)}
                  className="text-positive"
                />
                <SummaryRow label="Gastos fijos" months={months} values={months.map((month) => month.fixedExpense)} />
                <SummaryRow
                  label="Gastos variables"
                  months={months}
                  values={months.map((month) => month.variableExpense)}
                />
                <SummaryRow label="Te queda" hint="lo que entra menos los gastos" months={months} values={left} signed />
                {free && (
                  <SummaryRow
                    label="Libre a fin de mes"
                    hint="saldo real de tus cuentas, más lo que falta cobrar y menos lo que falta pagar"
                    months={months}
                    values={free}
                    total
                  />
                )}
                {currentBreakdown && first && (
                  <PlanBreakdownRows months={months} month={first} breakdown={currentBreakdown} />
                )}
              </tbody>

              <tbody data-tour="plan-income">
                <SectionRow
                  columnCount={columnCount}
                  title="Lo que entra"
                  hint="✓ = ya cobrado"
                  action={newButton(ConceptKind.Income)}
                />
                {income.length === 0 ? (
                  <EmptyRow columnCount={columnCount}>No hay ingresos en estos meses.</EmptyRow>
                ) : (
                  income.map((row) => (
                    <AmountRow key={row.conceptId} row={row} months={months} source={sourceOf(row)} doneLabel="Cobrado" />
                  ))
                )}
              </tbody>

              <tbody>
                <SectionRow
                  columnCount={columnCount}
                  title="Gastos fijos"
                  hint="✓ = ya pagado"
                  action={newButton(ConceptKind.Expense, "plan-new-fixed")}
                />
                {data.fixed.length === 0 ? (
                  <EmptyRow columnCount={columnCount}>No hay gastos fijos en estos meses.</EmptyRow>
                ) : (
                  fixedRows.map((row) => (
                    <AmountRow
                      key={row.conceptId}
                      row={row}
                      months={months}
                      source={sourceOf(row, row.conceptId === fixedTourId ? "plan-fixed-change" : undefined)}
                      doneLabel="Pagado"
                    />
                  ))
                )}
              </tbody>

              <tbody>
                <SectionRow
                  columnCount={columnCount}
                  title="Gastos variables"
                  hint="toca un importe para cambiar el límite solo ese mes"
                />
                {data.variable.length === 0 && (
                  <EmptyRow columnCount={columnCount}>
                    No tienes gastos variables. Si un gasto cambia cada mes (como el súper), abre su recibo o previsión
                    y elige «Presupuesto mensual».
                  </EmptyRow>
                )}
                {data.variable.length > 0 && variableRows.length === 0 && (
                  <EmptyRow columnCount={columnCount}>
                    Ningún gasto variable tiene límite ni gastos en estos meses.
                  </EmptyRow>
                )}
                {variableRows.map((row) => (
                  <tr key={row.conceptId}>
                    <ConceptCell name={row.name} groupName={row.groupName} source={limitOf(row)} />
                    {row.cells.map((cell, index) => {
                      const month = months[index];
                      if (!month) return null;
                      const editor =
                        editing && editing.conceptId === row.conceptId && sameMonth(editing.month, month) ? (
                          <LimitEditor
                            caption={`Límite solo de ${monthName(month.month)}`}
                            text={editing.text}
                            saving={saving}
                            error={error}
                            onChange={(text) => setEditing({ ...editing, text })}
                            onSubmit={submitLimit}
                            onCancel={cancelEdit}
                            onReset={cell.isOverride ? () => void saveLimit(null) : undefined}
                          />
                        ) : null;
                      return (
                        <VariableCell
                          key={index}
                          cell={cell}
                          month={month}
                          disabled={saving || loading}
                          tour={
                            row.conceptId === limitTourId && index === limitTourIndex ? "plan-variable-limit" : undefined
                          }
                          editor={editor}
                          onEdit={() => startEdit(row, month, cell.budget)}
                        />
                      );
                    })}
                  </tr>
                ))}
                {unbudgeted.length > 0 && (
                  <tr>
                    <td colSpan={columnCount} className="border-t px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setShowUnbudgeted((value) => !value)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {showUnbudgeted
                          ? "Ocultar los que no tienen límite"
                          : `Mostrar ${unbudgeted.length} sin límite`}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PlanConceptDialog
        target={dialog.target}
        open={dialog.open}
        formKey={dialog.seq}
        planning={planning}
        amountsAhead={amountsAhead}
        onClose={closeDialog}
        onSaved={saved}
      />

      {notice && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-20 z-40 flex items-start gap-3 rounded-xl border border-positive/30 bg-card p-3 text-sm shadow-lg sm:left-1/2 sm:right-auto sm:w-[26rem] sm:-translate-x-1/2"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden="true" />
          <p className="min-w-0 flex-1 break-words">{notice.text}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Cerrar aviso"
            className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Free money at the end of each month: the first one as on the «Dashboard», then adding what is left each month. */
function runningFree(startFree: number, left: number[]): number[] {
  const free: number[] = [];
  left.forEach((value, index) => free.push(index === 0 ? startFree : free[index - 1] + value));
  return free;
}

/** «¿De dónde salen estos números?»: what each row counts and how to change it. */
function PlanSources({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const strong = "font-medium text-foreground";
  return (
    <Card data-tour="plan-sources" className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Info className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1">¿De dónde salen estos números y cómo los cambio?</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="grid gap-5 border-t px-4 py-4 text-sm sm:grid-cols-2">
          <div>
            <h2 className="mb-2 font-semibold">Qué cuenta cada mes</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>
                <span className={strong}>Lo que entra</span>: lo que cobras siempre (como la nómina), lo que ya cobraste
                y lo que esperas de recordatorios o liquidaciones.
              </li>
              <li>
                <span className={strong}>Gastos fijos</span>: los recibos que se repiten solos (cada mes o cada 2), lo
                que ya está apuntado en «Mes» y lo que viene de recordatorios o liquidaciones.
              </li>
              <li>
                <span className={strong}>Gastos variables</span>: cuenta el límite entero, aunque aún no lo hayas
                gastado. Si ya apuntaste más, cuenta lo apuntado y sale en{" "}
                <span className="font-medium text-orange-600">naranja</span>.
              </li>
              <li>
                <span className={strong}>Te queda</span>: lo que entra menos los gastos de ese mes.
              </li>
              <li>
                <span className={strong}>Libre a fin de mes</span>: el mismo número que en el «Dashboard» con «Contar
                gastos variables» marcado; los meses siguientes le suman lo que te queda.
              </li>
              <li>
                <span className={strong}>✓</span>: ya está cobrado o pagado. Cuenta el importe real, no el previsto.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-semibold">Cómo cambiarlo</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>
                Usa <span className={strong}>«Cambiar presupuesto»</span> para sustituir el límite: las compras ya
                registradas cuentan dentro. <span className={strong}>«Cambiar recibo»</span> modifica un recibo existente.
              </li>
              <li>
                En un gasto variable, toca el importe de un mes para ponerle un límite solo a ese mes. Sale en{" "}
                <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-1 text-amber-900 dark:text-amber-200">amarillo</span>.
              </li>
              <li>
                ¿Algo nuevo que pagas o cobras siempre igual? Usa{" "}
                <span className={strong}>«Añadir pago fijo»</span> o <span className={strong}>«Nuevo ingreso fijo»</span>.
              </li>
              <li>
                ¿Falta una cuenta en la lista? Créala en{" "}
                <Link to="/settings" className="font-medium text-primary hover:underline">
                  «Configuración»
                </Link>
                .
              </li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

function MonthHeader({ month }: { month: ExpensePlanMonth }) {
  return (
    <th
      className={cn(
        "border-b bg-card px-3 py-2.5 text-right font-medium",
        month.isCurrent
          ? "bg-[linear-gradient(hsl(var(--primary)/0.05),hsl(var(--primary)/0.05))] text-primary"
          : "text-foreground",
      )}
    >
      <div>{capitalize(monthName(month.month))}</div>
      <div className="text-[11px] font-normal text-muted-foreground">
        {month.year}
        {month.isCurrent && " · este mes"}
        {month.isClosed && " · cerrado"}
      </div>
    </th>
  );
}

function SummaryRow({
  label,
  hint,
  months,
  values,
  className,
  signed = false,
  total = false,
}: {
  label: string;
  hint?: string;
  months: ExpensePlanMonth[];
  values: number[];
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
      {months.map((month, index) => {
        const amount = values[index] ?? 0;
        return (
          <td
            key={keyOf(month)}
            className={cn(
              "border-t px-3 py-2 text-right tabular-nums",
              total && "border-t-2",
              month.isCurrent && "bg-primary/5",
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

function PlanBreakdownRows({
  months,
  month,
  breakdown,
}: {
  months: ExpensePlanMonth[];
  month: MonthStart;
  breakdown: PlanBreakdown;
}) {
  const previous = previousMonth(month.year, month.month);
  const rows: { label: string; value: number; total?: boolean }[] = [
    { label: "Resultado del mes (ingresos − gastos)", value: breakdown.currentMonthBalance },
    { label: `Saldo con el que terminó ${monthName(previous.month)}`, value: breakdown.openingBalance },
    ...(Math.abs(breakdown.passingAdjustment) > 0.005
      ? [{
          label: "Traspasos, préstamos y reembolsos (no son ingresos ni gastos)",
          value: breakdown.passingAdjustment,
        }]
      : []),
    { label: "Libre a fin de mes", value: breakdown.freeMoney, total: true },
  ];

  return (
    <>
      <tr>
        <th scope="row" className={cn(stickyCell, "border-t px-3 py-1.5 text-left text-xs font-medium text-muted-foreground")}>
          ¿De dónde sale el libre?
        </th>
        <td colSpan={months.length} className="border-t bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground" />
      </tr>
      {rows.map((row) => (
        <tr key={row.label} className={row.total ? "font-semibold" : "text-muted-foreground"}>
          <th
            scope="row"
            className={cn(
              stickyCell,
              "border-t border-dashed px-3 py-1.5 text-left text-xs font-normal",
              row.total && "font-semibold text-foreground",
            )}
          >
            {row.label}
          </th>
          {months.map((item) => (
            <td
              key={keyOf(item)}
              className={cn(
                "border-t border-dashed px-3 py-1.5 text-right text-xs tabular-nums",
                item.isCurrent && "bg-primary/5",
                row.total && "font-semibold text-foreground",
                row.total && row.value < -0.005 && "text-negative",
              )}
            >
              {item.isCurrent && (
                breakdownAmount(row.value, !row.total)
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SectionRow({
  columnCount,
  title,
  hint,
  action,
}: {
  columnCount: number;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <tr>
      <th colSpan={columnCount} className="border-t bg-muted/60 px-3 py-2 text-left text-sm font-semibold">
        {/* Stays in view when the table scrolls sideways on a phone. */}
        <div className="sticky left-3 flex w-[min(36rem,calc(100vw-5rem))] flex-wrap items-center gap-x-3 gap-y-1.5">
          <span>
            {title} <span className="text-xs font-normal text-muted-foreground">· {hint}</span>
          </span>
          {action}
        </div>
      </th>
    </tr>
  );
}

function EmptyRow({ columnCount, children }: { columnCount: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columnCount} className="border-t px-3 py-3 text-sm text-muted-foreground">
        <div className="sticky left-3 w-[min(36rem,calc(100vw-5rem))]">{children}</div>
      </td>
    </tr>
  );
}

function ConceptCell({ name, groupName, source }: { name: string; groupName?: string | null; source?: ReactNode }) {
  return (
    <th
      scope="row"
      title={groupName ? `Grupo: ${groupName}` : undefined}
      className={cn(stickyCell, "border-t px-3 py-2 text-left align-top font-normal")}
    >
      <div className="font-medium">{name}</div>
      {source && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{source}</div>}
    </th>
  );
}

type PlanAmountCell = ExpensePlanFixedRow["cells"][number] & { installment?: string };
type PlanAmountRow = Omit<ExpensePlanFixedRow, "cells"> & { cells: PlanAmountCell[] };

const INSTALLMENT_NAME = /^(.*?)\s*(\d+)\s*\/\s*(\d+)\s*(.*)$/;

function mergeInstallments(rows: ExpensePlanFixedRow[]): PlanAmountRow[] {
  const result: PlanAmountRow[] = [];
  const merged = new Map<string, PlanAmountRow>();
  for (const row of rows) {
    const match = row.groupName === REMINDER_GROUP ? INSTALLMENT_NAME.exec(row.name) : null;
    if (!match) {
      result.push(row);
      continue;
    }
    const [, before, part, total, after] = match;
    const base = [before, after].filter(Boolean).join(" ");
    const key = `${base.toLowerCase()}|${total}`;
    const cells: PlanAmountCell[] = row.cells.map((cell) =>
      Math.abs(cell.amount) < 0.005 ? { ...cell } : { ...cell, installment: `${part}/${total}` },
    );
    const existing = merged.get(key);
    if (!existing) {
      const created: PlanAmountRow = { ...row, name: `${base} (en ${total} cuotas)`, cells };
      merged.set(key, created);
      result.push(created);
      continue;
    }
    existing.cells = existing.cells.map((cell, index) => {
      const next = cells[index];
      if (!next || Math.abs(next.amount) < 0.005) return cell;
      if (Math.abs(cell.amount) < 0.005) return next;
      return {
        amount: cell.amount + next.amount,
        paid: cell.paid && next.paid,
        installment: `${cell.installment} + ${next.installment}`,
      };
    });
  }
  return result;
}

function AmountRow({
  row,
  months,
  source,
  doneLabel,
}: {
  row: PlanAmountRow;
  months: ExpensePlanMonth[];
  source: ReactNode;
  doneLabel: string;
}) {
  return (
    <tr>
      <ConceptCell name={row.name} groupName={row.groupName} source={source} />
      {row.cells.map((cell, index) => {
        const month = months[index];
        const blank = Math.abs(cell.amount) < 0.005;
        const overdue = !blank && !cell.paid && (month?.isCurrent || month?.isClosed);
        const paid = !blank && cell.paid;
        return (
          <td
            key={index}
            className={cn(
              "border-t px-3 py-2 text-right align-top tabular-nums",
              paid ? "bg-positive-soft/80 text-positive" : overdue ? "bg-warning-soft/80 text-warning" : month?.isCurrent && "bg-primary/5",
            )}
            title={paid ? doneLabel : overdue ? "Pendiente" : undefined}
          >
            {blank ? (
              <span className="text-muted-foreground/50">—</span>
            ) : (
              <>
                <span className={cn("inline-flex items-center gap-1", (paid || overdue) && "font-medium")}>
                  {cell.paid && <Check className="h-3.5 w-3.5" aria-label={doneLabel} />}
                  {euros(cell.amount)}
                </span>
                {cell.installment && (
                  <div className="text-[11px] text-muted-foreground">cuota {cell.installment}</div>
                )}
              </>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function variableTitle(cell: ExpensePlanVariableCell, month: ExpensePlanMonth): string {
  const parts = [`La previsión cuenta ${euros(cell.counted)}.`];
  if (cell.budget != null) {
    parts.push(cell.isOverride ? `Límite solo de este mes: ${euros(cell.budget)}.` : `Límite: ${euros(cell.budget)}.`);
  }
  if (cell.spent > 0.005) parts.push(`Gastado: ${euros(cell.spent)}.`);
  if (cell.budget != null && cell.counted > cell.budget + 0.005) {
    parts.push("Ya pasa del límite, así que cuenta lo apuntado.");
  }
  parts.push(month.isClosed ? "Mes cerrado." : "Toca para cambiar el límite solo de este mes.");
  return parts.join(" ");
}

function VariableCell({
  cell,
  month,
  disabled,
  tour,
  editor,
  onEdit,
}: {
  cell: ExpensePlanVariableCell;
  month: ExpensePlanMonth;
  disabled: boolean;
  tour?: string;
  editor: ReactNode;
  onEdit: () => void;
}) {
  const budget = cell.budget ?? null;
  const over = budget !== null && cell.counted > budget + 0.005;
  const overSpent = budget !== null && cell.spent > budget + 0.005;
  const spent = cell.spent > 0.005;
  const allSpent = spent && Math.abs(cell.spent - cell.counted) < 0.005;
  const empty = cell.counted < 0.005 && budget === null;

  return (
    <td className={cn("border-t px-2 py-2 text-right align-top", month.isCurrent && "bg-primary/5")}>
      {editor ?? (
        <>
          <button
            type="button"
            data-tour={tour}
            disabled={disabled || month.isClosed}
            onClick={onEdit}
            title={variableTitle(cell, month)}
            className={cn(
              "rounded px-1.5 py-0.5 tabular-nums transition enabled:hover:bg-accent disabled:cursor-default",
              cell.isOverride && "bg-amber-100 dark:bg-amber-950/60 font-medium",
              over ? "font-medium text-orange-600" : cell.isOverride && "text-amber-900 dark:text-amber-200",
            )}
          >
            {empty ? <span className="text-muted-foreground/50">—</span> : euros(cell.counted)}
          </button>
          {spent && (
            <div
              className={cn(
                "mt-0.5 text-[11px] tabular-nums",
                overSpent ? "font-semibold text-negative" : "text-muted-foreground",
              )}
            >
              {allSpent ? "ya gastado" : `gastado ${euros(cell.spent)}`}
            </div>
          )}
          {over && <div className="mt-0.5 text-[11px] tabular-nums text-orange-600">límite {euros(budget)}</div>}
        </>
      )}
    </td>
  );
}

function LimitEditor({
  caption,
  text,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
  onReset,
}: {
  caption: string;
  text: string;
  saving: boolean;
  error: string | null;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[11px] text-muted-foreground">{caption}</span>
      <div className="flex items-center gap-1">
        <input
          autoFocus
          inputMode="decimal"
          value={text}
          disabled={saving}
          placeholder="0"
          aria-label={caption}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
            if (event.key === "Escape") onCancel();
          }}
          className="h-7 w-20 rounded-md border bg-background px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          aria-label="Guardar"
          className="rounded p-1 text-positive hover:bg-positive-soft"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Cancelar"
          className="rounded p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="text-[11px] text-primary hover:underline disabled:opacity-50"
        >
          Usar el habitual
        </button>
      )}
      {error && (
        <span role="alert" className="max-w-[11rem] text-right text-[11px] text-negative">
          {error}
        </span>
      )}
    </div>
  );
}

function NewButton({ tour, onClick, children }: { tour?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      data-tour={tour}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium text-primary shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function InlineButton({
  tour,
  disabled,
  onClick,
  children,
}: {
  tour?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-tour={tour}
      disabled={disabled}
      onClick={onClick}
      className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}
