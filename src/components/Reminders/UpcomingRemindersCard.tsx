import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { REMINDERS_CHANGED_EVENT, ReminderService } from "../../services/reminderService";
import type { Reminder } from "../../types/reminder";
import { money, today } from "../../utils/civilDate";
import { UrgencyBadge } from "./ReminderBadges";
import {
  activeSnoozeDate,
  addDaysCivil,
  formatCivilDate,
  hasAmount,
  relativeDayLabel,
  reminderUrgency,
} from "./reminderUtils";

const MAX_ITEMS = 5;
const LOOKAHEAD_DAYS = 7;

/** Dashboard card: what the bell is showing now plus anything due in the next 7 days. */
export function UpcomingRemindersCard() {
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let latest = 0;

    const load = async () => {
      const requestId = ++latest;
      try {
        const [due, active] = await Promise.all([ReminderService.due(), ReminderService.list("active")]);
        if (disposed || requestId !== latest) return;
        const limit = addDaysCivil(today(), LOOKAHEAD_DAYS);
        const byId = new Map<string, Reminder>();
        due.items.forEach((reminder) => byId.set(reminder.id, reminder));
        active
          .filter((reminder) => !reminder.isDone && reminder.dueDate.slice(0, 10) <= limit)
          .forEach((reminder) => {
            if (!byId.has(reminder.id)) byId.set(reminder.id, reminder);
          });
        const merged = Array.from(byId.values()).sort(
          (a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title, "es"),
        );
        setItems(merged);
        setFailed(false);
      } catch {
        // Keep the dashboard clean: the card just hides when reminders can't be loaded.
        if (!disposed && requestId === latest) setFailed(true);
      }
    };

    const onChanged = () => void load();
    void load();
    window.addEventListener(REMINDERS_CHANGED_EVENT, onChanged);
    return () => {
      disposed = true;
      window.removeEventListener(REMINDERS_CHANGED_EVENT, onChanged);
    };
  }, []);

  if (failed) return null;

  const todayValue = today();
  const visible = items?.slice(0, MAX_ITEMS) ?? [];
  const hidden = (items?.length ?? 0) - visible.length;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
            <BellRing className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Recordatorios</span>
            {items && items.length > 0 && (
              <span className="rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold leading-5 text-white tabular-nums">
                {items.length}
              </span>
            )}
          </div>
          <Link
            to="/reminders"
            className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary hover:underline"
          >
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {items === null ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando…
          </p>
        ) : items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No tienes nada pendiente para los próximos 7 días.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visible.map((reminder) => {
              const urgency = reminderUrgency(reminder, todayValue);
              const snoozedUntil = activeSnoozeDate(reminder, todayValue);
              return (
                <li
                  key={reminder.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-muted/45 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium leading-snug">{reminder.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCivilDate(reminder.dueDate)} · {relativeDayLabel(reminder.dueDate, todayValue)}
                      {snoozedUntil && ` · pospuesto hasta el ${formatCivilDate(snoozedUntil)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {hasAmount(reminder) && (
                      <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{money(reminder.amount)}</span>
                    )}
                    {urgency && <UrgencyBadge urgency={urgency} />}
                  </div>
                </li>
              );
            })}
            {hidden > 0 && (
              <li className="px-1 text-xs text-muted-foreground">
                y {hidden} más en{" "}
                <Link to="/reminders" className="font-medium text-primary hover:underline">
                  Recordatorios
                </Link>
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
