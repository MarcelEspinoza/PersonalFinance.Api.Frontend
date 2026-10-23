import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { Bell, BellRing, Check, Clock, Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { REMINDERS_CHANGED_EVENT, ReminderService } from "../../services/reminderService";
import type { DueReminders, Reminder } from "../../types/reminder";
import { money, today } from "../../utils/civilDate";
import { UrgencyBadge } from "./ReminderBadges";
import { formatCivilDate, hasAmount, relativeDayLabel, reminderUrgency } from "./reminderUtils";

const REFRESH_MS = 5 * 60 * 1000;

interface DueState {
  data: DueReminders | null;
  failed: boolean;
}

// The desktop and the mobile bell are mounted at the same time (one of them hidden by CSS),
// so they share a single poller and a single request through this tiny store.
const listeners = new Set<() => void>();
let dueState: DueState = { data: null, failed: false };
let latestRequest = 0;
let refreshTimer: number | undefined;

function setDueState(next: DueState) {
  dueState = next;
  listeners.forEach((listener) => listener());
}

async function refreshDue() {
  const requestId = ++latestRequest;
  try {
    const data = await ReminderService.due();
    if (requestId === latestRequest) setDueState({ data, failed: false });
  } catch {
    // Fail silently: keep the last known count.
    if (requestId === latestRequest && !dueState.failed) setDueState({ ...dueState, failed: true });
  }
}

function handleRefreshSignal() {
  void refreshDue();
}

function subscribeDue(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener(REMINDERS_CHANGED_EVENT, handleRefreshSignal);
    window.addEventListener("focus", handleRefreshSignal);
    refreshTimer = window.setInterval(handleRefreshSignal, REFRESH_MS);
    void refreshDue();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    window.removeEventListener(REMINDERS_CHANGED_EVENT, handleRefreshSignal);
    window.removeEventListener("focus", handleRefreshSignal);
    window.clearInterval(refreshTimer);
    refreshTimer = undefined;
    // Ignore answers that arrive after the last bell is gone (for example, after logging out).
    latestRequest += 1;
    dueState = { data: null, failed: false };
  };
}

function getDueState() {
  return dueState;
}

interface ReminderBellProps {
  /** "sidebar": full-width row in the desktop menu. "topbar": icon button in the mobile header. */
  variant: "sidebar" | "topbar";
}

type Note = { tone: "info" | "error"; text: string };

export function ReminderBell({ variant }: ReminderBellProps) {
  const { data, failed } = useSyncExternalStore(subscribeDue, getDueState);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  const count = data?.count ?? 0;
  const items = data?.items ?? [];
  const badge = count > 9 ? "9+" : String(count);
  const todayValue = today();
  const buttonLabel =
    count === 0
      ? "Avisos: no tienes recordatorios pendientes"
      : `Avisos: ${count} ${count === 1 ? "recordatorio pendiente" : "recordatorios pendientes"}`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(null), 6000);
    return () => window.clearTimeout(timer);
  }, [note]);

  const toggle = () => {
    if (!open) {
      setNote(null);
      void refreshDue();
    }
    setOpen(!open);
  };

  const close = () => setOpen(false);

  const runAction = async (reminder: Reminder, action: "complete" | "snooze") => {
    setBusyId(reminder.id);
    setNote(null);
    try {
      if (action === "complete") {
        const updated = await ReminderService.complete(reminder.id);
        if (reminder.repeat !== "none" && updated && !updated.isDone && updated.dueDate) {
          setNote({
            tone: "info",
            text: `«${reminder.title}» pasó a la siguiente fecha: ${formatCivilDate(updated.dueDate)}`,
          });
        }
      } else {
        await ReminderService.snooze(reminder.id, 1);
      }
    } catch {
      // No toasts from the bell: just a short note inside the open panel.
      setNote({ tone: "error", text: "No se pudo actualizar. Inténtalo de nuevo." });
    } finally {
      setBusyId(null);
    }
  };

  const summary =
    data === null
      ? failed
        ? "Ahora no se pueden ver los avisos."
        : "Cargando…"
      : count === 0
        ? "No tienes nada pendiente"
        : count === 1
          ? "1 aviso pendiente"
          : `${count} avisos pendientes`;

  return (
    <div ref={rootRef} className={cn("relative", variant === "sidebar" && "w-full")}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={buttonLabel}
        title={buttonLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={
          variant === "sidebar"
            ? cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                open ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            : cn("relative rounded-md p-2 transition-colors hover:bg-accent", open && "bg-accent")
        }
      >
        {count > 0 ? (
          <BellRing className={cn("shrink-0 text-rose-600", variant === "sidebar" ? "h-4 w-4" : "h-5 w-5")} />
        ) : (
          <Bell className={cn("shrink-0", variant === "sidebar" ? "h-4 w-4" : "h-5 w-5")} />
        )}
        {variant === "sidebar" && <span className={cn(count > 0 && "font-medium text-foreground")}>Avisos</span>}
        {count > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              "flex items-center justify-center rounded-full bg-rose-600 font-semibold leading-none text-white tabular-nums",
              variant === "sidebar"
                ? "ml-auto h-5 min-w-[1.25rem] px-1.5 text-[11px]"
                : "absolute right-0.5 top-0.5 h-4 min-w-[1rem] px-1 text-[10px]",
            )}
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Recordatorios pendientes"
          className={cn(
            "z-50 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-lg",
            variant === "sidebar"
              ? "absolute left-0 top-full mt-1 w-[22rem]"
              : "fixed inset-x-3 top-14 sm:left-auto sm:right-4 sm:w-96",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Recordatorios</p>
              <p className="text-xs text-muted-foreground">{summary}</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {data === null ? (
            !failed && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            )
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Cuando se acerque la fecha de un recordatorio, aparecerá aquí.
            </p>
          ) : (
            <ul className="max-h-[min(60vh,24rem)] divide-y overflow-y-auto">
              {items.map((reminder) => {
                const urgency = reminderUrgency(reminder, todayValue);
                const busy = busyId === reminder.id;
                return (
                  <li key={reminder.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium leading-snug">{reminder.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatCivilDate(reminder.dueDate)} · {relativeDayLabel(reminder.dueDate, todayValue)}
                          {hasAmount(reminder) && ` · ${money(reminder.amount)}`}
                        </p>
                      </div>
                      {urgency && <UrgencyBadge urgency={urgency} className="shrink-0" />}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => void runAction(reminder, "complete")}
                        title={reminder.repeat === "none" ? "Marcar como hecho" : "Marcar como hecho y pasar a la siguiente fecha"}
                      >
                        {busy ? <Loader2 className="animate-spin" /> : <Check />}
                        Hecho
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => void runAction(reminder, "snooze")}
                        title="Recordármelo mañana"
                      >
                        <Clock />
                        Mañana
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {note && (
            <p
              role="status"
              className={cn("border-t px-4 py-2 text-xs", note.tone === "error" ? "text-negative" : "text-positive")}
            >
              {note.text}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
            <Link to="/reminders" onClick={close} className="text-sm font-medium text-primary hover:underline">
              Ver todos
            </Link>
            {count > items.length && items.length > 0 && (
              <span className="text-xs text-muted-foreground">y {count - items.length} más</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
