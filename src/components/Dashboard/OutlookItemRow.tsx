import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { OutlookItem } from "../../services/dashboardService";
import { EntryDirection } from "../../types/ledger";
import { money, shortDate } from "../../utils/civilDate";
import { ReminderTag } from "../Reminders/ReminderBadges";

/** A line with no date of its own, such as the estimate of what is left of the variable expenses. */
export type ExtraLine = { label: string; amount: number; direction: EntryDirection };

/** One line still to come in or go out: date, what it is, where it comes from and its amount. */
export function OutlookItemRow({ item }: { item: OutlookItem }) {
  return (
    <Row date={shortDate(item.dueDate)} label={item.description} direction={item.direction} amount={item.amount}>
      <ItemSource item={item} />
    </Row>
  );
}

export function ExtraLineRow({ line }: { line: ExtraLine }) {
  return <Row date="" label={line.label} direction={line.direction} amount={line.amount} />;
}

function Row({
  date,
  label,
  direction,
  amount,
  children,
}: {
  date: string;
  label: string;
  direction: EntryDirection;
  amount: number;
  children?: ReactNode;
}) {
  const isIncome = direction === EntryDirection.In;
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{date}</span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-sm" title={label}>
          {label}
        </p>
        {children}
      </div>
      <span className={cn("shrink-0 whitespace-nowrap text-sm font-medium tabular-nums", isIncome && "text-positive")}>
        {isIncome ? "+" : "−"}
        {money(amount)}
      </span>
    </li>
  );
}

function ItemSource({ item }: { item: OutlookItem }) {
  const overdue = item.isOverdue && <span className="font-medium text-negative"> · vencido sin confirmar</span>;

  // Reminder lines have no entry in «Mes» and no account: they are handled in Recordatorios.
  if (item.reminderId) {
    return (
      <p className="mt-0.5 text-xs text-muted-foreground">
        <Link
          to="/reminders"
          title="Ver tus recordatorios"
          className="inline-flex rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ReminderTag />
        </Link>
        {overdue}
      </p>
    );
  }

  // Settlement lines have no entry either: they are handled in Liquidaciones.
  if (item.settlementId) {
    return (
      <p className="mt-0.5 text-xs text-muted-foreground">
        <Link
          to="/settlements"
          title="Ver tus liquidaciones"
          className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Liquidación
        </Link>
        {overdue}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      {item.accountName ?? "Sin cuenta asignada"}
      {item.isVariableReserve ? " · estimado" : ""}
      {overdue}
    </p>
  );
}
