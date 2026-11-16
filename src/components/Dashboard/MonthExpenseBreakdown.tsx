import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MonthOutlook, OutlookItem } from "../../services/dashboardService";
import { EntryDirection } from "../../types/ledger";
import { money, monthLabel } from "../../utils/civilDate";
import { ledgerLink } from "./dashboardUtils";
import { ExtraLineRow, OutlookItemRow } from "./OutlookItemRow";

type Props = {
  outlook: MonthOutlook;
  paidExpense: number;
  totalExpense: number;
  includeVariableReserve: boolean;
};

const cents = (amount: number) => Math.round(amount * 100);
const sumCents = (items: OutlookItem[]) => items.reduce((total, item) => total + cents(item.amount), 0);

export function MonthExpenseBreakdown({ outlook, paidExpense, totalExpense, includeVariableReserve }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();
  const expenses = outlook.pendingItems.filter((item) => item.direction === EntryDirection.Out && !item.isTransfer);
  const payments = expenses
    .filter((item) => !item.isVariableReserve)
    .sort((a, b) => b.amount - a.amount || a.dueDate.localeCompare(b.dueDate) || a.description.localeCompare(b.description));
  const reserves = includeVariableReserve
    ? expenses.filter((item) => item.isVariableReserve).sort((a, b) => b.amount - a.amount)
    : [];
  const unassignedReserve = includeVariableReserve ? outlook.unassigned.variableExpenseReserve : 0;
  const largestPayments = payments.slice(0, 5);
  const otherPayments = payments.slice(5);
  const detailedCents = cents(paidExpense) + sumCents(payments) + sumCents(reserves) + cents(unassignedReserve);
  const reconciled = detailedCents === cents(totalExpense);

  return (
    <div className="border-t">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-medium hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="min-w-0">¿En qué se va el dinero de {monthLabel(outlook.year, outlook.month)}?</span>
        <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="border-t bg-muted/20">
          {!reconciled ? (
            <p role="alert" className="px-5 py-4 text-sm text-negative">
              El desglose no coincide con «Sale».{" "}
              <Link to={ledgerLink(outlook.year, outlook.month)} className="font-medium underline">
                Revisa los movimientos del mes
              </Link>{" "}
              antes de usar este detalle.
            </p>
          ) : (
            <>
              {cents(paidExpense) !== 0 && (
                <ul aria-label="Gastos ya pagados" className="border-b py-1">
                  <ExtraLineRow line={{ label: "Ya pagado", amount: paidExpense, direction: EntryDirection.Out }} />
                </ul>
              )}

              <div className="px-5 pb-1 pt-3">
                <h3 className="text-sm font-semibold">Pagos pendientes</h3>
                <p className="text-xs text-muted-foreground">Los cinco más grandes, de mayor a menor.</p>
              </div>
              {payments.length === 0 ? (
                <p className="px-5 py-3 text-sm text-muted-foreground">No hay pagos pendientes registrados.</p>
              ) : (
                <ul aria-label="Principales pagos pendientes" className="pb-2">
                  {largestPayments.map((item, index) => (
                    <OutlookItemRow key={`${item.dueDate}-${index}`} item={item} />
                  ))}
                  {otherPayments.length > 0 && (
                    <ExtraLineRow
                      line={{
                        label: otherPayments.length === 1 ? "Otro pago pendiente" : `Otros ${otherPayments.length} pagos pendientes`,
                        amount: sumCents(otherPayments) / 100,
                        direction: EntryDirection.Out,
                      }}
                    />
                  )}
                </ul>
              )}

              {(reserves.length > 0 || unassignedReserve > 0) && (
                <div className="border-t">
                  <div className="px-5 pb-1 pt-3">
                    <h3 className="text-sm font-semibold">Reservas del presupuesto</h3>
                    <p className="text-xs text-muted-foreground">
                      Dinero apartado para lo que aún puedes gastar. Ya está incluido en «Sale».
                    </p>
                  </div>
                  <ul aria-label="Reservas del presupuesto" className="pb-2">
                    {reserves.map((item, index) => (
                      <ExtraLineRow
                        key={`${item.dueDate}-${index}`}
                        line={{ label: item.conceptName, amount: item.amount, direction: EntryDirection.Out }}
                      />
                    ))}
                    {unassignedReserve > 0 && (
                      <ExtraLineRow
                        line={{ label: "Reservas sin cuenta asignada", amount: unassignedReserve, direction: EntryDirection.Out }}
                      />
                    )}
                  </ul>
                </div>
              )}

              <div className="flex items-start justify-between gap-3 border-t bg-muted/50 px-4 py-3 text-sm font-semibold">
                <span className="min-w-0">Total incluido en «Sale»</span>
                <span className="shrink-0 whitespace-nowrap tabular-nums">{money(totalExpense)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
