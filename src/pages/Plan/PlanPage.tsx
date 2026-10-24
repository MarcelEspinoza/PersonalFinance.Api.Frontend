import { CalendarRange, Check, ChevronLeft, ChevronRight, Loader2, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { capitalize } from "../../components/Dashboard/dashboardUtils";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import {
  expensePlanningService,
  type ExpensePlanMonth,
  type ExpensePlanMonths,
  type ExpensePlanVariableRow,
} from "../../services/expensePlanningService";
import { monthName, nextMonth, previousMonth } from "../../utils/civilDate";

const wholeEuros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const centEuros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** "300 €", or "12,50 €" when the amount has cents. */
function euros(value: number): string {
  const rounded = Math.round(value * 100) / 100 || 0;
  return Number.isInteger(rounded) ? wholeEuros.format(rounded) : centEuros.format(rounded);
}

/** null = empty (removes the limit), undefined = not a valid amount. */
function parseAmount(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function serverMessage(error: unknown): string | null {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  return typeof data === "string" && data.trim() ? data : null;
}

const hasPlan = (row: ExpensePlanVariableRow) =>
  row.defaultBudget != null ||
  row.cells.some((cell) => cell.budget != null || cell.planned > 0.005 || cell.spent > 0.005);

type MonthStart = { year: number; month: number };
/** month null = the usual limit. */
type Editing = { conceptId: string; month: MonthStart | null; text: string };

const sameMonth = (a: MonthStart | null, b: MonthStart | null) =>
  a === null || b === null ? a === b : a.year === b.year && a.month === b.month;

const stickyCell = "sticky left-0 z-10 bg-card";

/** Fixed and variable expenses month by month, with a limit for each variable expense. */
export function PlanPage() {
  const [start, setStart] = useState<MonthStart | null>(null);
  const [data, setData] = useState<ExpensePlanMonths | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnbudgeted, setShowUnbudgeted] = useState(false);
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

  /** Loads the window being shown again (after a save or on retry). */
  const reload = () => setReloadKey((key) => key + 1);

  const months = data?.months ?? [];
  const first = months[0];
  const showsCurrentMonth = start === null || first?.isCurrent === true;

  const moveTo = (target: MonthStart | null) => {
    setEditing(null);
    setError(null);
    setStart(target);
  };

  const startEdit = (conceptId: string, month: MonthStart | null, value?: number | null) => {
    setError(null);
    setEditing({
      conceptId,
      month: month && { year: month.year, month: month.month },
      text: value == null ? "" : String(value).replace(".", ","),
    });
  };

  const save = async (limit: number | null) => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      if (editing.month === null) {
        await expensePlanningService.setDefaultBudget(editing.conceptId, limit);
      } else {
        await expensePlanningService.setMonthBudget(editing.conceptId, editing.month.year, editing.month.month, limit);
      }
      setEditing(null);
      reload();
    } catch (saveError) {
      setError(serverMessage(saveError) ?? "No se ha podido guardar el límite. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const submit = () => {
    if (!editing) return;
    const limit = parseAmount(editing.text);
    if (limit === undefined) {
      setError("Escribe solo el número, por ejemplo 300 o 300,50.");
      return;
    }
    void save(limit);
  };

  const editorFor = (conceptId: string, month: MonthStart | null, resetLabel?: string) =>
    editing && editing.conceptId === conceptId && sameMonth(editing.month, month) ? (
      <LimitEditor
        text={editing.text}
        saving={saving}
        align={month === null ? "start" : "end"}
        onChange={(text) => setEditing({ ...editing, text })}
        onSubmit={submit}
        onCancel={() => {
          setEditing(null);
          setError(null);
        }}
        resetLabel={resetLabel}
        onReset={resetLabel ? () => void save(null) : undefined}
      />
    ) : null;

  const header = (
    <PageHeader
      title="Plan de gastos"
      description="Mes a mes: lo que pagas siempre (gastos fijos) y lo que depende de ti (gastos variables). Ponle un límite a cada gasto variable y verás cuánto te queda."
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

  const budgeted = data.variable.filter(hasPlan);
  const unbudgeted = data.variable.filter((row) => !hasPlan(row));
  const variableRows = showUnbudgeted ? [...budgeted, ...unbudgeted] : budgeted;
  const columnCount = months.length + 1;
  const isEmpty = data.fixed.length === 0 && data.variable.length === 0;

  return (
    <div className="space-y-6">
      {header}

      {error && (
        <p className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative" role="alert">
          {error}
        </p>
      )}
      {loadFailed && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning" role="alert">
          No se han podido cargar esos meses; sigues viendo los anteriores.
        </p>
      )}

      {isEmpty ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Aún no tienes nada planificado. Apunta tus gastos fijos y variables en{" "}
          <Link to="/settings" className="font-medium text-primary hover:underline">
            Configuración → Planificación
          </Link>{" "}
          y aquí los verás mes a mes.
        </Card>
      ) : (
        <Card className={cn("overflow-hidden transition-opacity", loading && "opacity-60")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={cn(stickyCell, "w-56 px-3 py-2.5 text-left font-medium text-muted-foreground")}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange className="h-4 w-4" /> Mes
                    </span>
                  </th>
                  {months.map((month) => (
                    <MonthHeader key={`${month.year}-${month.month}`} month={month} />
                  ))}
                </tr>
              </thead>

              <tbody>
                <SummaryRow label="Entra" months={months} value={(month) => month.income} className="text-positive" />
                <SummaryRow label="Gastos fijos" months={months} value={(month) => month.fixedExpense} />
                <SummaryRow label="Gastos variables" months={months} value={(month) => month.variableExpense} />
                <SummaryRow
                  label="Te queda"
                  months={months}
                  value={(month) => month.income - month.fixedExpense - month.variableExpense}
                  signed
                />
              </tbody>

              <tbody>
                <SectionRow
                  columnCount={columnCount}
                  title="Gastos fijos"
                  hint="lo que pagas todos los meses (o cada 2). ✓ = ya pagado"
                />
                {data.fixed.length === 0 ? (
                  <EmptyRow columnCount={columnCount}>No hay gastos fijos en estos meses.</EmptyRow>
                ) : (
                  data.fixed.map((row) => (
                    <tr key={row.conceptId}>
                      <ConceptCell name={row.name} groupName={row.groupName} />
                      {row.cells.map((cell, index) => (
                        <td
                          key={index}
                          className={cn(
                            "border-t px-3 py-2 text-right tabular-nums",
                            months[index]?.isCurrent && "bg-primary/5",
                          )}
                        >
                          {Math.abs(cell.amount) < 0.005 ? (
                            <span className="text-muted-foreground/50">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {cell.paid && <Check className="h-3.5 w-3.5 text-positive" aria-label="Pagado" />}
                              {euros(cell.amount)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
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
                    No tienes gastos variables. Puedes marcarlos en{" "}
                    <Link to="/settings" className="font-medium text-primary hover:underline">
                      Configuración → Planificación
                    </Link>
                    .
                  </EmptyRow>
                )}
                {variableRows.map((row) => (
                  <tr key={row.conceptId}>
                    <ConceptCell name={row.name} groupName={row.groupName}>
                      {editorFor(row.conceptId, null, row.defaultBudget != null ? "Quitar el límite" : undefined) ?? (
                        <button
                          type="button"
                          disabled={saving || loading}
                          onClick={() => startEdit(row.conceptId, null, row.defaultBudget)}
                          className="mt-0.5 text-left text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {row.defaultBudget != null
                            ? `Límite habitual: ${euros(row.defaultBudget)}`
                            : "Ponerle un límite"}
                        </button>
                      )}
                    </ConceptCell>
                    {row.cells.map((cell, index) => {
                      const month = months[index];
                      const over = cell.budget != null && cell.spent > cell.budget + 0.005;
                      const showSpent = cell.spent > 0.005 || (!!month?.isCurrent && cell.budget != null);
                      const plannedAbove = !showSpent && cell.planned > (cell.budget ?? 0) + 0.005;
                      return (
                        <td
                          key={index}
                          className={cn("border-t px-2 py-2 text-right align-top", month?.isCurrent && "bg-primary/5")}
                        >
                          {(month ? editorFor(row.conceptId, month, cell.isOverride ? "Usar el habitual" : undefined) : null) ?? (
                            <button
                              type="button"
                              disabled={saving || loading || !month || month.isClosed}
                              onClick={() => month && startEdit(row.conceptId, month, cell.budget)}
                              title={
                                month?.isClosed
                                  ? "Mes cerrado"
                                  : cell.isOverride
                                    ? "Límite solo para este mes. Toca para cambiarlo."
                                    : "Cambiar el límite solo para este mes"
                              }
                              className={cn(
                                "rounded px-1.5 py-0.5 tabular-nums transition enabled:hover:bg-accent disabled:cursor-default",
                                cell.isOverride && "bg-amber-100 font-medium text-amber-900",
                              )}
                            >
                              {cell.budget != null ? (
                                euros(cell.budget)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </button>
                          )}
                          {showSpent && (
                            <div
                              className={cn(
                                "mt-0.5 text-[11px] tabular-nums",
                                over ? "font-semibold text-negative" : "text-muted-foreground",
                              )}
                            >
                              gastado {euros(cell.spent)}
                            </div>
                          )}
                          {plannedAbove && (
                            <div className="mt-0.5 text-[11px] tabular-nums text-orange-600">
                              apuntado {euros(cell.planned)}
                            </div>
                          )}
                        </td>
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

      {!isEmpty && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Límite</strong>: lo máximo que quieres gastar en eso cada
            mes. La previsión cuenta el límite, o lo que ya tengas apuntado si es más.
          </p>
          <p>
            Un importe en <span className="rounded bg-amber-100 px-1 text-amber-900">amarillo</span> es un límite solo
            para ese mes; los demás meses usan el habitual. En rojo, lo gastado que ya pasa del límite.
          </p>
        </div>
      )}
    </div>
  );
}

function MonthHeader({ month }: { month: ExpensePlanMonth }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-right font-medium",
        month.isCurrent ? "bg-primary/5 text-primary" : "text-foreground",
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
  months,
  value,
  className,
  signed = false,
}: {
  label: string;
  months: ExpensePlanMonth[];
  value: (month: ExpensePlanMonth) => number;
  className?: string;
  signed?: boolean;
}) {
  return (
    <tr className={cn(signed && "font-semibold")}>
      <th scope="row" className={cn(stickyCell, "border-t px-3 py-2 text-left font-medium")}>
        {label}
      </th>
      {months.map((month) => {
        const amount = value(month);
        return (
          <td
            key={`${month.year}-${month.month}`}
            className={cn(
              "border-t px-3 py-2 text-right tabular-nums",
              month.isCurrent && "bg-primary/5",
              signed ? (amount < -0.005 ? "text-negative" : "text-positive") : className,
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

function SectionRow({ columnCount, title, hint }: { columnCount: number; title: string; hint: string }) {
  return (
    <tr>
      <th colSpan={columnCount} className="border-t bg-muted/60 px-3 py-2 text-left text-sm font-semibold">
        {title} <span className="text-xs font-normal text-muted-foreground">· {hint}</span>
      </th>
    </tr>
  );
}

function EmptyRow({ columnCount, children }: { columnCount: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columnCount} className="border-t px-3 py-3 text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

function ConceptCell({ name, groupName, children }: { name: string; groupName?: string | null; children?: ReactNode }) {
  return (
    <th scope="row" className={cn(stickyCell, "border-t px-3 py-2 text-left align-top font-normal")}>
      <div className="font-medium">{name}</div>
      {groupName && <div className="text-[11px] text-muted-foreground">{groupName}</div>}
      {children}
    </th>
  );
}

function LimitEditor({
  text,
  saving,
  align,
  onChange,
  onSubmit,
  onCancel,
  resetLabel,
  onReset,
}: {
  text: string;
  saving: boolean;
  align: "start" | "end";
  onChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  resetLabel?: string;
  onReset?: () => void;
}) {
  return (
    <div className={cn("mt-1 flex flex-col gap-1", align === "end" ? "items-end" : "items-start")}>
      <div className="flex items-center gap-1">
        <input
          autoFocus
          inputMode="decimal"
          value={text}
          disabled={saving}
          placeholder="0"
          aria-label="Límite en euros"
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
      {onReset && resetLabel && (
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="text-[11px] text-primary hover:underline disabled:opacity-50"
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
}
