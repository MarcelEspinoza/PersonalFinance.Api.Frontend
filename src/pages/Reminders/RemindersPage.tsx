import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { AiBadge, DoneBadge, EmailIndicator, UrgencyBadge } from "../../components/Reminders/ReminderBadges";
import { ReminderFormDialog } from "../../components/Reminders/ReminderFormDialog";
import {
  SNOOZE_OPTIONS,
  activeSnoozeDate,
  addDaysCivil,
  formatCivilDate,
  formatTimestamp,
  hasAmount,
  noticeLabel,
  reminderAmountLabel,
  reminderDirectionLabel,
  reminderUrgency,
  repeatLabel,
  sortReminders,
} from "../../components/Reminders/reminderUtils";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { chatErrorMessage } from "../../services/chatService";
import { REMINDERS_CHANGED_EVENT, ReminderService } from "../../services/reminderService";
import type { Reminder, ReminderStatusFilter } from "../../types/reminder";
import { today } from "../../utils/civilDate";

const FILTERS: { value: ReminderStatusFilter; label: string }[] = [
  { value: "active", label: "Activos" },
  { value: "done", label: "Hechos" },
  { value: "all", label: "Todos" },
];

type BusyAction = "complete" | "snooze" | "delete";

interface Toast {
  id: number;
  tone: "success" | "error";
  text: string;
  title?: string;
}

export function RemindersPage() {
  const [filter, setFilter] = useState<ReminderStatusFilter>("active");
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: BusyAction } | null>(null);
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const requestRef = useRef(0);
  const toastIdRef = useRef(0);

  const load = useCallback(async (status: ReminderStatusFilter) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const data = await ReminderService.list(status);
      if (requestId !== requestRef.current) return;
      setItems(sortReminders(data));
      setLoadError(null);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setLoadError(chatErrorMessage(err, "No se pudieron cargar los recordatorios."));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  // Reload on filter change and whenever reminders change anywhere (bell, chat, this page).
  useEffect(() => {
    void load(filter);
    const onChanged = () => void load(filter);
    window.addEventListener(REMINDERS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(REMINDERS_CHANGED_EVENT, onChanged);
  }, [filter, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      toast.tone === "error" ? 8000 : 6000,
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (tone: Toast["tone"], text: string, title?: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, tone, text, title });
  };

  const changeFilter = (value: ReminderStatusFilter) => {
    setSnoozeFor(null);
    setFilter(value);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setSnoozeFor(null);
    setEditing(reminder);
    setDialogOpen(true);
  };

  const handleSaved = (saved: Reminder, mode: "create" | "edit") => {
    setDialogOpen(false);
    showToast("success", mode === "create" ? "Recordatorio creado." : "Cambios guardados.", saved.title);
    if (mode === "create" && filter === "done") setFilter("active");
  };

  const complete = async (reminder: Reminder) => {
    setBusy({ id: reminder.id, action: "complete" });
    try {
      const updated = await ReminderService.complete(reminder.id);
      if (reminder.repeat !== "none" && updated && !updated.isDone && updated.dueDate) {
        showToast("success", `Pasó a la siguiente fecha: ${formatCivilDate(updated.dueDate)}`, reminder.title);
      } else {
        showToast("success", "Marcado como hecho.", reminder.title);
      }
    } catch (err) {
      showToast("error", chatErrorMessage(err, "No se pudo marcar como hecho. Inténtalo de nuevo."));
    } finally {
      setBusy(null);
    }
  };

  const snooze = async (reminder: Reminder, days: number) => {
    setBusy({ id: reminder.id, action: "snooze" });
    try {
      const updated = await ReminderService.snooze(reminder.id, days);
      setSnoozeFor(null);
      const until = updated?.snoozedUntil?.slice(0, 10) || addDaysCivil(today(), days);
      showToast("success", `Pospuesto. Te volverá a avisar el ${formatCivilDate(until)}.`, reminder.title);
    } catch (err) {
      showToast("error", chatErrorMessage(err, "No se pudo posponer. Inténtalo de nuevo."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (reminder: Reminder) => {
    if (!window.confirm(`¿Borrar el recordatorio «${reminder.title}»? No se puede deshacer.`)) return;
    setBusy({ id: reminder.id, action: "delete" });
    try {
      await ReminderService.remove(reminder.id);
      setItems((current) => current?.filter((item) => item.id !== reminder.id) ?? current);
      showToast("success", "Recordatorio borrado.", reminder.title);
    } catch (err) {
      showToast("error", chatErrorMessage(err, "No se pudo borrar el recordatorio. Inténtalo de nuevo."));
    } finally {
      setBusy(null);
    }
  };

  const todayValue = today();

  const renderActions = (reminder: Reminder, align: "start" | "end") => (
    <ReminderActions
      reminder={reminder}
      align={align}
      busyAction={busy?.id === reminder.id ? busy.action : null}
      snoozeOpen={snoozeFor === reminder.id}
      onComplete={() => void complete(reminder)}
      onToggleSnooze={() => setSnoozeFor((current) => (current === reminder.id ? null : reminder.id))}
      onSnooze={(days) => void snooze(reminder, days)}
      onEdit={() => openEdit(reminder)}
      onDelete={() => void remove(reminder)}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recordatorios"
        description="Avisos para que no se te pase ningún pago ni fecha importante. Los verás en la campanita y, si quieres, también por correo."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Nuevo recordatorio
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Qué recordatorios ver" className="inline-flex rounded-lg border bg-card p-1">
          {FILTERS.map((option) => {
            const selected = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => changeFilter(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {items && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {items.length === 1 ? "1 recordatorio" : `${items.length} recordatorios`}
          </p>
        )}
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-negative/25 bg-negative-soft p-4 text-sm text-negative"
        >
          <span>{loadError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void load(filter)}>
            Reintentar
          </Button>
        </div>
      )}

      {items === null ? (
        loading && (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )
      ) : items.length === 0 ? (
        <EmptyState filter={filter} onCreate={openCreate} />
      ) : (
        <div className={cn("transition-opacity", loading && "opacity-60")}>
          <div className="grid gap-3 md:grid-cols-2 xl:hidden">
            {items.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                todayValue={todayValue}
                actions={renderActions(reminder, "start")}
              />
            ))}
          </div>

          <Card className="hidden overflow-hidden xl:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Recordatorio</th>
                    <th className="px-4 py-3 text-left font-medium">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium">Importe</th>
                    <th className="px-4 py-3 text-left font-medium">Repetición y aviso</th>
                    <th className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((reminder) => (
                    <ReminderRow
                      key={reminder.id}
                      reminder={reminder}
                      todayValue={todayValue}
                      actions={renderActions(reminder, "end")}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <ReminderFormDialog open={dialogOpen} reminder={editing} onOpenChange={setDialogOpen} onSaved={handleSaved} />

      {toast && <ToastMessage toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function StatusBadges({ reminder, todayValue }: { reminder: Reminder; todayValue: string }) {
  const urgency = reminderUrgency(reminder, todayValue);
  if (!reminder.isDone && !urgency && reminder.source !== "ai") return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {reminder.isDone && <DoneBadge />}
      {urgency && <UrgencyBadge urgency={urgency} />}
      {reminder.source === "ai" && <AiBadge />}
    </span>
  );
}

/** Extra line under the date: when it was done, or until when it is snoozed. */
function DateNote({ reminder, todayValue }: { reminder: Reminder; todayValue: string }) {
  if (reminder.isDone) {
    const doneOn = formatTimestamp(reminder.completedAt);
    return <span>{doneOn ? `Hecho el ${doneOn}` : "Hecho"}</span>;
  }
  const snoozeDate = activeSnoozeDate(reminder, todayValue);
  if (!snoozeDate) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      Vuelve a avisar el {formatCivilDate(snoozeDate)}
    </span>
  );
}

interface ReminderItemProps {
  reminder: Reminder;
  todayValue: string;
  actions: ReactNode;
}

function ReminderCard({ reminder, todayValue, actions }: ReminderItemProps) {
  const showDateNote = reminder.isDone || activeSnoozeDate(reminder, todayValue) !== null;

  return (
    <Card className={cn("flex min-w-0 flex-col p-4", reminder.isDone && "bg-muted/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <StatusBadges reminder={reminder} todayValue={todayValue} />
          <h3 className="break-words font-semibold leading-snug">{reminder.title}</h3>
        </div>
        {hasAmount(reminder) && (
          <span className={cn("shrink-0 text-right font-semibold tabular-nums", reminder.isIncome && "text-positive")}>
            {reminderAmountLabel(reminder)}
            <span className="block text-[11px] font-medium text-muted-foreground">{reminderDirectionLabel(reminder)}</span>
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {formatCivilDate(reminder.dueDate)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Repeat className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {repeatLabel(reminder.repeat)}
        </span>
        <span>{noticeLabel(reminder.notifyDaysBefore)}</span>
        {reminder.emailEnabled && <EmailIndicator withLabel />}
      </div>

      {showDateNote && (
        <p className="mt-1 text-xs text-muted-foreground">
          <DateNote reminder={reminder} todayValue={todayValue} />
        </p>
      )}

      {reminder.notes && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{reminder.notes}</p>
      )}

      <div className="mt-auto pt-3">
        <div className="border-t pt-3">{actions}</div>
      </div>
    </Card>
  );
}

function ReminderRow({ reminder, todayValue, actions }: ReminderItemProps) {
  return (
    <tr className={cn("border-t align-top transition-colors hover:bg-muted/40", reminder.isDone && "bg-muted/20")}>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-foreground [overflow-wrap:anywhere]">{reminder.title}</span>
          <StatusBadges reminder={reminder} todayValue={todayValue} />
        </div>
        {reminder.notes && (
          <p
            className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground [overflow-wrap:anywhere]"
            title={reminder.notes}
          >
            {reminder.notes}
          </p>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="tabular-nums">{formatCivilDate(reminder.dueDate)}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          <DateNote reminder={reminder} todayValue={todayValue} />
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
        {hasAmount(reminder) ? (
          <>
            <div className={cn(reminder.isIncome && "text-positive")}>{reminderAmountLabel(reminder)}</div>
            <div className="mt-0.5 text-xs font-normal text-muted-foreground">{reminderDirectionLabel(reminder)}</div>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div>{repeatLabel(reminder.repeat)}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{noticeLabel(reminder.notifyDaysBefore)}</span>
          {reminder.emailEnabled && <EmailIndicator />}
        </div>
      </td>
      <td className="px-4 py-3">{actions}</td>
    </tr>
  );
}

interface ReminderActionsProps {
  reminder: Reminder;
  align: "start" | "end";
  busyAction: BusyAction | null;
  snoozeOpen: boolean;
  onComplete: () => void;
  onToggleSnooze: () => void;
  onSnooze: (days: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ReminderActions({
  reminder,
  align,
  busyAction,
  snoozeOpen,
  onComplete,
  onToggleSnooze,
  onSnooze,
  onEdit,
  onDelete,
}: ReminderActionsProps) {
  const disabled = busyAction !== null;
  const rowClass = cn("flex flex-wrap items-center gap-1.5", align === "end" && "justify-end");

  if (snoozeOpen && !reminder.isDone) {
    return (
      <div className={rowClass}>
        <span className="mr-1 text-xs font-medium text-muted-foreground">Posponer:</span>
        {SNOOZE_OPTIONS.map((option) => (
          <Button
            key={option.days}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSnooze(option.days)}
          >
            {option.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-8 px-0"
          disabled={disabled}
          onClick={onToggleSnooze}
          aria-label="No posponer"
          title="No posponer"
        >
          {busyAction === "snooze" ? <Loader2 className="animate-spin" /> : <X />}
        </Button>
      </div>
    );
  }

  return (
    <div className={rowClass}>
      {!reminder.isDone && (
        <>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={onComplete}
            title={reminder.repeat === "none" ? "Marcar como hecho" : "Marcar como hecho y pasar a la siguiente fecha"}
          >
            {busyAction === "complete" ? <Loader2 className="animate-spin" /> : <Check />}
            Hecho
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onToggleSnooze}>
            <Clock />
            Posponer
          </Button>
        </>
      )}
      <div className={cn("flex items-center gap-1", align === "start" && "ml-auto")}>
        {!reminder.isDone && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-8 px-0"
            disabled={disabled}
            onClick={onEdit}
            aria-label={`Editar «${reminder.title}»`}
            title="Editar"
          >
            <Pencil />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-8 px-0 text-muted-foreground hover:text-negative"
          disabled={disabled}
          onClick={onDelete}
          aria-label={`Borrar «${reminder.title}»`}
          title="Borrar"
        >
          {busyAction === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ filter, onCreate }: { filter: ReminderStatusFilter; onCreate: () => void }) {
  if (filter === "done") {
    return (
      <Card className="border-dashed">
        <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          Aquí verás los recordatorios que marques como hechos.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
          <BellRing className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold">
          {filter === "active" ? "No tienes recordatorios pendientes" : "Todavía no tienes recordatorios"}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground">
          Un recordatorio es un aviso para que no se te pase nada: pagar el seguro de la casa, renovar una suscripción o devolverle
          dinero a alguien. Eliges la fecha, si se repite y cuántos días antes quieres enterarte. Cuando toque, aparece en la campanita
          y, si quieres, también te llega un correo.
        </p>
        <Button type="button" onClick={onCreate}>
          <Plus />
          Nuevo recordatorio
        </Button>
      </CardContent>
    </Card>
  );
}

function ToastMessage({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const isError = toast.tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "fixed bottom-4 left-4 right-20 z-40 flex items-start gap-3 rounded-xl border bg-card p-3 text-sm shadow-lg sm:left-1/2 sm:right-auto sm:w-[26rem] sm:-translate-x-1/2",
        isError ? "border-negative/30" : "border-positive/30",
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isError ? "text-negative" : "text-positive")} aria-hidden="true" />
      <div className="min-w-0 flex-1 break-words">
        {toast.title && <p className="font-medium">{toast.title}</p>}
        <p className={toast.title ? "text-muted-foreground" : undefined}>{toast.text}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
