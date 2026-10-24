import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MonthForecastSummary } from "../../types/ledger";
import { money, shortDate } from "../../utils/civilDate";
import { UrgencyBadge } from "../Reminders/ReminderBadges";

const hasValue = (value: number) => Math.abs(value) > 0.005;

/** The month as the forecast sees it: the same numbers as the dashboard boxes and the «Plan de gastos». */
export function MonthForecastPanel({ forecast }: { forecast: MonthForecastSummary }) {
  const [open, setOpen] = useState(false);
  const expenseParts = [
    { label: "Apuntado", value: forecast.entryExpense },
    { label: "Pagos que se repiten (aún sin apuntar)", value: forecast.ruleExpense },
    { label: "Reservado para gastos variables", value: forecast.variableExpenseReserve },
    { label: "Recordatorios", value: forecast.reminders },
    { label: "Liquidaciones que pagas tú", value: forecast.settlementExpense ?? 0 },
  ].filter((part) => hasValue(part.value));
  const expenseReserves = forecast.reserveItems.filter((item) => !item.isIncome);
  const incomeReserves = forecast.reserveItems.filter((item) => item.isIncome);
  const settlementItems = forecast.settlementItems ?? [];
  const settlementIncome = forecast.settlementIncome ?? 0;
  const hasDetail =
    forecast.reserveItems.length > 0 || forecast.reminderItems.length > 0 || settlementItems.length > 0;

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Previsión del mes</h2>

      <dl className="mt-1.5 grid max-w-xl grid-cols-3 gap-3">
        <Figure label="Entra" value={money(forecast.income)} valueClassName="text-positive" />
        <Figure label="Sale" value={money(forecast.expense)} valueClassName="text-orange-600" />
        <Figure
          label="Te queda"
          value={money(forecast.balance)}
          valueClassName={forecast.balance < -0.005 ? "text-negative" : "text-positive"}
          hint="Sin contar el arrastre"
        />
      </dl>

      {expenseParts.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          «Sale» incluye: {expenseParts.map((part) => `${part.label} ${money(part.value)}`).join(" · ")}
        </p>
      )}
      {hasValue(settlementIncome) && (
        <p className="mt-1 text-xs text-muted-foreground">
          «Entra» incluye {money(settlementIncome)} de liquidaciones que te deben pagar.
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p>Son los mismos números que las cajitas del inicio y el Plan de gastos.</p>
        {hasDetail && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
          >
            {open ? "Ocultar detalle" : "Ver detalle"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>

      {open && hasDetail && (
        <div className="mt-3 grid gap-4 border-t pt-3 text-xs sm:grid-cols-2">
          {expenseReserves.length > 0 && (
            <DetailBlock
              title="Reservado para gastos variables"
              hint="Lo que te queda de cada límite se cuenta como gasto, por si lo usas."
            >
              {expenseReserves.map((item) => (
                <li key={item.conceptId}>
                  <span className="font-medium text-foreground">{item.conceptName}:</span> límite{" "}
                  {money(item.limit)}, ya usado {money(item.used)} → reservado{" "}
                  <span className="font-semibold text-foreground">{money(item.amount)}</span>
                </li>
              ))}
            </DetailBlock>
          )}

          {incomeReserves.length > 0 && (
            <DetailBlock title="Ingresos variables por cobrar" hint="Lo que falta cobrar se cuenta como ingreso.">
              {incomeReserves.map((item) => (
                <li key={item.conceptId}>
                  <span className="font-medium text-foreground">{item.conceptName}:</span> estimado{" "}
                  {money(item.limit)}, ya cobrado {money(item.used)} → falta cobrar{" "}
                  <span className="font-semibold text-foreground">{money(item.amount)}</span>
                </li>
              ))}
            </DetailBlock>
          )}

          {forecast.reminderItems.length > 0 && (
            <DetailBlock
              title="Recordatorios"
              action={
                <Link to="/reminders" className="font-medium text-primary hover:underline">
                  Ver recordatorios
                </Link>
              }
            >
              {forecast.reminderItems.map((item, index) => (
                <li key={`${item.reminderId}-${item.date}-${index}`} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 tabular-nums">{shortDate(item.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground" title={item.title}>
                    {item.title}
                  </span>
                  {item.isOverdue && (
                    <span
                      className="shrink-0"
                      title="Su fecha ya pasó y todavía no está hecho, así que se cuenta en este mes."
                    >
                      <UrgencyBadge urgency="overdue" />
                    </span>
                  )}
                  <span className="shrink-0 font-medium tabular-nums text-foreground">{money(item.amount)}</span>
                </li>
              ))}
            </DetailBlock>
          )}

          {settlementItems.length > 0 && (
            <DetailBlock
              title="Liquidaciones"
              hint="Lo que falta cobrar o pagar de cada liquidación abierta. Se cambia en «Liquidaciones»."
              action={
                <Link to="/settlements" className="font-medium text-primary hover:underline">
                  Ver liquidaciones
                </Link>
              }
            >
              {settlementItems.map((item) => (
                <li key={item.settlementId} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 tabular-nums">{shortDate(item.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground" title={item.title}>
                    {item.title}
                  </span>
                  {item.isOverdue && (
                    <span
                      className="shrink-0"
                      title="El día que esperabas ya pasó y sigue sin pagarse, así que se cuenta en este mes."
                    >
                      <UrgencyBadge urgency="overdue" />
                    </span>
                  )}
                  <span
                    className={cn(
                      "shrink-0 font-medium tabular-nums",
                      item.isIncome ? "text-positive" : "text-foreground",
                    )}
                  >
                    {item.isIncome ? "+" : "−"}
                    {money(item.amount)}
                  </span>
                </li>
              ))}
            </DetailBlock>
          )}
        </div>
      )}
    </section>
  );
}

function Figure({
  label,
  value,
  valueClassName,
  hint,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-base font-semibold tabular-nums sm:text-lg", valueClassName)}>{value}</dd>
      {hint && <dd className="text-[11px] text-muted-foreground">{hint}</dd>}
    </div>
  );
}

function DetailBlock({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {hint && <p className="text-muted-foreground">{hint}</p>}
      <ul className="mt-1.5 space-y-1 text-muted-foreground">{children}</ul>
    </div>
  );
}
