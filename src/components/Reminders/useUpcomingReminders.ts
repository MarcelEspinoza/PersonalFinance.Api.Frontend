import { useEffect, useState } from "react";
import { REMINDERS_CHANGED_EVENT, ReminderService } from "../../services/reminderService";
import type { Reminder } from "../../types/reminder";
import { today } from "../../utils/civilDate";
import { addDaysCivil } from "./reminderUtils";

/**
 * What the bell is showing now plus anything due in the next `lookaheadDays` days, sorted by date.
 * `items` is null until the first load finishes; `failed` is true when reminders can't be loaded.
 */
export function useUpcomingReminders(lookaheadDays = 7) {
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
        const limit = addDaysCivil(today(), lookaheadDays);
        const byId = new Map<string, Reminder>();
        due.items.forEach((reminder) => byId.set(reminder.id, reminder));
        active
          .filter((reminder) => !reminder.isDone && reminder.dueDate.slice(0, 10) <= limit)
          .forEach((reminder) => {
            if (!byId.has(reminder.id)) byId.set(reminder.id, reminder);
          });
        setItems(
          Array.from(byId.values()).sort(
            (a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title, "es"),
          ),
        );
        setFailed(false);
      } catch {
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
  }, [lookaheadDays]);

  return { items, failed };
}
