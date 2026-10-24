import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ListChecks,
  Loader2,
} from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MonthOutlook, OutlookItem } from "../../services/dashboardService";
import type { DashboardAlerts } from "../../types/DashboardAlerts";
import { EntryDirection } from "../../types/ledger";
import type { Reminder } from "../../types/reminder";
import { money, shortDate, today } from "../../utils/civilDate";
import {
  activeSnoozeDate,
  formatCivilDate,
  hasAmount,
  relativeDayLabel,
  reminderUrgency,
} from "../Reminders/reminderUtils";
import { CountBadge, SectionCard } from "./SectionCard";
import { appRoute, joinWithAnd, ledgerLink, monthOf } from "./dashboardUtils";

type Tone = "danger" | "warning" | "action" | "reminder" | "muted";

type Task = {
  key: string;
  tone: Tone;
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  detail?: ReactNode;
  amount?: string;
  link?: { to: string; label: string };
  /** How many things this row stands for (defaults to 1). */
  count?: number;
};

const toneIcon: Record<Tone, string> = {
  danger: "bg-negative-soft text-negative",
  warning: "bg-warning-soft text-warning",
  action: "bg-primary/10 text-primary",
  reminder: "bg-rose-500/10 text-rose-600",
  muted: "bg-muted text-muted-foreground",
};

const VISIBLE_TASKS = 6;
const VISIBLE_REMINDERS = 3;

type Props = {
  outlook: MonthOutlook;
  alerts: DashboardAlerts["items"];
  reminders: Reminder[] | null;
  remindersFailed: boolean;
  /** Month name for messages, e.g. "octubre". */
  monthName: string;
};

/** One list with everything that needs your attention, most urgent first. */
export function ActionCenter({ outlook, alerts, reminders, remindersFailed, monthName }: Props) {
  const [expanded, setExpanded] = useState(false);
  const tasks = buildTasks(outlook, alerts, remindersFailed ? [] : reminders ?? [], remindersFailed);
  const checkingReminders = reminders === null && !remindersFailed;
  const total = tasks.reduce((sum, task) => sum + (task.count ?? 1), 0);
  const visible = expanded ? tasks : tasks.slice(0, VISIBLE_TASKS);
  const hidden = tasks.length - visible.length;

  return (
    <SectionCard
      icon={<ListChecks className="h-5 w-5 text-primary" />}
      title={
        <>
          Qué tienes que hacer
          {total > 0 && <CountBadge value={total} />}
        </>
      }
      bodyClassName="p-0"
    >
      {tasks.length === 0 && !checkingReminders ? (
        <AllClear isPast={outlook.isPast} monthName={monthName} remindersFailed={remindersFailed} />
      ) : (
        <ul className="divide-y">
          {visible.map((task) => (
            <TaskRow key={task.key} task={task} />
          ))}
          {checkingReminders && (
            <li className="flex items-center gap-2 px-5 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Comprobando recordatorios…
            </li>
          )}
        </ul>
      )}
      {tasks.length > VISIBLE_TASKS && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-center gap-1 border-t px-5 py-2.5 text-sm font-medium text-primary hover:bg-muted/50"
        >
          {expanded ? "Ver menos" : `Ver ${hidden} más`}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </SectionCard>
  );
}

function buildTasks(
  outlook: MonthOutlook,
  alerts: Props["alerts"],
  reminders: Reminder[],
  remindersFailed: boolean,
): Task[] {
  const tasks: Task[] = [];

  if (!outlook.isPast) {
    outlook.accounts
      .filter((account) => account.shortfall > 0.01)
      .forEach((account) =>
        tasks.push({
          key: `risk-${account.accountId}`,
          tone: "danger",
          icon: AlertTriangle,
          title: <>«{account.name}» se quedará en negativo</>,
          detail: (
            <>
              Llegará a <strong>{money(account.lowestBalance)}</strong>
              {account.lowestBalanceDate ? ` el ${shortDate(account.lowestBalanceDate)}` : ""}: le faltan{" "}
              <strong>{money(account.shortfall)}</strong>.
            </>
          ),
        }),
      );

    outlook.suggestedTransfers.forEach((transfer, index) =>
      tasks.push({
        key: `transfer-${index}`,
        tone: "action",
        icon: ArrowRightLeft,
        title: (
          <>
            Mueve {money(transfer.amount)} de «{transfer.fromAccountName}» a «{transfer.toAccountName}»
          </>
        ),
        detail: transfer.before
          ? `Hazlo antes del ${shortDate(transfer.before)} para que «${transfer.toAccountName}» no se quede en negativo.`
          : `Así «${transfer.toAccountName}» no se quedará en negativo.`,
      }),
    );

    if (outlook.uncoveredShortfall > 0.01) {
      tasks.push({
        key: "uncovered",
        tone: "danger",
        icon: AlertCircle,
        title: <>Te faltan {money(outlook.uncoveredShortfall)} en algún momento del mes</>,
        detail:
          "Ni moviendo dinero entre tus cuentas alcanza. Tendrás que meter dinero, retrasar algún pago o esperar al próximo cobro.",
      });
    }
  }

  alerts
    .filter((alert) => alert.type === "Balance")
    .forEach((alert, index) => tasks.push(alertTask(alert, `balance-${index}`, "danger")));

  // Reminder lines are not entries of «Mes»: overdue reminders are listed with the other reminders below.
  const overdueEntries = outlook.overdueItems.filter((item) => !item.reminderId);
  if (overdueEntries.length > 0) tasks.push(overdueTask(overdueEntries));
  const overdueReminders = new Set(outlook.overdueItems.flatMap((item) => (item.reminderId ? [item.reminderId] : [])));
  if (remindersFailed && overdueReminders.size > 0) tasks.push(overdueRemindersTask(overdueReminders.size));

  const todayValue = today();
  reminders.slice(0, VISIBLE_REMINDERS).forEach((reminder) => {
    const urgency = reminderUrgency(reminder, todayValue);
    const snoozedUntil = activeSnoozeDate(reminder, todayValue);
    tasks.push({
      key: `reminder-${reminder.id}`,
      tone: urgency === "overdue" ? "danger" : urgency === "today" ? "warning" : "reminder",
      icon: BellRing,
      title: reminder.title,
      detail:
        `${formatCivilDate(reminder.dueDate)} · ${relativeDayLabel(reminder.dueDate, todayValue)}` +
        (snoozedUntil ? ` · pospuesto hasta el ${formatCivilDate(snoozedUntil)}` : ""),
      amount: hasAmount(reminder) ? money(reminder.amount) : undefined,
      link: { to: "/reminders", label: "Ver" },
    });
  });
  const moreReminders = reminders.length - VISIBLE_REMINDERS;
  if (moreReminders > 0) {
    tasks.push({
      key: "reminders-more",
      tone: "muted",
      icon: BellRing,
      title: moreReminders === 1 ? "Y 1 recordatorio más" : `Y ${moreReminders} recordatorios más`,
      link: { to: "/reminders", label: "Ver todos" },
      count: moreReminders,
    });
  }

  alerts
    .filter((alert) => alert.type !== "Balance")
    .forEach((alert, index) => tasks.push(alertTask(alert, `alert-${index}`, "warning")));

  return tasks;
}

function alertTask(alert: Props["alerts"][number], key: string, tone: Tone): Task {
  const route = appRoute(alert.action);
  return {
    key,
    tone,
    icon: AlertTriangle,
    title: alert.message,
    link: route ? { to: route, label: "Ver" } : undefined,
  };
}

const countLabel = (count: number, singular: string, plural: string) =>
  count === 0 ? null : `${count} ${count === 1 ? singular : plural}`;

function overdueTask(overdueItems: OutlookItem[]): Task {
  const items = [...overdueItems].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const payments = items.filter((item) => !item.isTransfer && item.direction === EntryDirection.Out).length;
  const incomes = items.filter((item) => !item.isTransfer && item.direction === EntryDirection.In).length;
  const transfers = items.filter((item) => item.isTransfer).length;
  const parts = [
    countLabel(payments, "pago", "pagos"),
    countLabel(incomes, "cobro", "cobros"),
    countLabel(transfers, "traspaso", "traspasos"),
  ].filter((part): part is string => part !== null);
  const examples = items
    .slice(0, 3)
    .map((item) => `${item.description} (${item.direction === EntryDirection.In ? "+" : "−"}${money(item.amount)})`)
    .join(", ");
  const oldest = monthOf(items[0].dueDate);

  return {
    key: "overdue",
    tone: "warning",
    icon: Clock,
    title: `${joinWithAnd(parts)} ${items.length === 1 ? "vencido" : "vencidos"} sin confirmar`,
    detail: (
      <>
        {examples}
        {items.length > 3 ? ` y ${items.length - 3} más` : ""}. Su fecha ya pasó: revisa si ya pasaron por el banco y
        márcalos.
      </>
    ),
    link: { to: ledgerLink(oldest.year, oldest.month), label: "Revisar" },
  };
}

/** Fallback when the reminders could not be loaded, so overdue ones are not silently hidden. */
function overdueRemindersTask(count: number): Task {
  return {
    key: "overdue-reminders",
    tone: "danger",
    icon: BellRing,
    title: count === 1 ? "1 recordatorio vencido" : `${count} recordatorios vencidos`,
    detail:
      count === 1
        ? "Su fecha ya pasó y todavía no está hecho."
        : "Sus fechas ya pasaron y todavía no están hechos.",
    link: { to: "/reminders", label: "Ver" },
  };
}

function TaskRow({ task }: { task: Task }) {
  const Icon = task.icon;
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <span
        className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toneIcon[task.tone])}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium leading-snug">{task.title}</p>
        {task.detail && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{task.detail}</p>}
      </div>
      {(task.amount || task.link) && (
        <div className="flex shrink-0 flex-col items-end gap-1 pl-1">
          {task.amount && <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{task.amount}</span>}
          {task.link && (
            <Link
              to={task.link.to}
              className="inline-flex items-center gap-0.5 whitespace-nowrap text-sm font-medium text-primary hover:underline"
            >
              {task.link.label}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

function AllClear({
  isPast,
  monthName,
  remindersFailed,
}: {
  isPast: boolean;
  monthName: string;
  remindersFailed: boolean;
}) {
  const message = isPast
    ? remindersFailed
      ? `En ${monthName} no quedó nada sin confirmar.`
      : `En ${monthName} no quedó nada sin confirmar y no tienes recordatorios para los próximos 7 días.`
    : remindersFailed
      ? "Nada vencido y ninguna cuenta se queda en negativo."
      : "Nada vencido, ninguna cuenta se queda en negativo y ningún recordatorio para los próximos 7 días.";

  return (
    <div className="flex items-start gap-3 p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive">
        <CheckCircle2 className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-positive">Todo en orden</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
