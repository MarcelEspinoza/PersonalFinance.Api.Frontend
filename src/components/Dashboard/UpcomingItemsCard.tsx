import { CalendarClock, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MonthOutlook, OutlookItem } from "../../services/dashboardService";
import { EntryDirection } from "../../types/ledger";
import { money, shortDate } from "../../utils/civilDate";
import { ReminderTag } from "../Reminders/ReminderBadges";
import { SectionCard, SectionLink } from "./SectionCard";
import { ledgerLink } from "./dashboardUtils";

const VISIBLE_ITEMS = 6;

type Props = {
  outlook: MonthOutlook;
  /** Month name, e.g. "octubre". */
  monthName: string;
  year: number;
  month: number;
};

/** What is still to come in or go out this month, by date. Overdue items live in «Qué tienes que hacer». */
export function UpcomingItemsCard({ outlook, monthName, year, month }: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = outlook.pendingItems
    .filter((item) => !item.isTransfer && !item.isOverdue)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const visible = expanded ? items : items.slice(0, VISIBLE_ITEMS);

  return (
    <SectionCard
      icon={<CalendarClock className="h-5 w-5 text-primary" />}
      title="Próximos cobros y pagos"
      subtitle={`Lo que falta por entrar y salir en ${monthName}, por fecha.`}
      action={<SectionLink to={ledgerLink(year, month)}>Ver en Mes</SectionLink>}
      bodyClassName="p-0"
    >
      {items.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">No queda nada por cobrar ni pagar en {monthName}.</p>
      ) : (
        <>
          <ul className={cn("divide-y", expanded && "max-h-[28rem] overflow-y-auto")}>
            {visible.map((item, index) => (
              <ItemRow key={`${item.dueDate}-${item.description}-${index}`} item={item} />
            ))}
          </ul>
          {items.length > VISIBLE_ITEMS && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex w-full items-center justify-center gap-1 border-t px-5 py-2.5 text-sm font-medium text-primary hover:bg-muted/50"
            >
              {expanded ? "Ver menos" : `Ver los ${items.length} movimientos`}
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </>
      )}
    </SectionCard>
  );
}

function ItemRow({ item }: { item: OutlookItem }) {
  const isIncome = item.direction === EntryDirection.In;
  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
        {shortDate(item.dueDate)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.description}>
          {item.description}
        </p>
        {item.reminderId ? (
          // Reminder lines have no entry in «Mes» and no account: they are handled in Recordatorios.
          <Link
            to="/reminders"
            title="Ver tus recordatorios"
            className="mt-0.5 inline-flex rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ReminderTag />
          </Link>
        ) : item.settlementId ? (
          // Settlement lines have no entry either: they are handled in Liquidaciones.
          <Link
            to="/settlements"
            title="Ver tus liquidaciones"
            className="mt-0.5 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Liquidación
          </Link>
        ) : (
          <p className="truncate text-xs text-muted-foreground">
            {item.accountName ?? "Sin cuenta asignada"}
            {item.isVariableReserve ? " · estimado" : ""}
          </p>
        )}
      </div>
      <span
        className={cn("shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums", isIncome && "text-positive")}
      >
        {isIncome ? "+" : "−"}
        {money(item.amount)}
      </span>
    </li>
  );
}
