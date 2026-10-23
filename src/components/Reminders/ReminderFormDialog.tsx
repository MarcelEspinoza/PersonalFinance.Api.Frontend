import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { chatErrorMessage } from "../../services/chatService";
import { ReminderService } from "../../services/reminderService";
import type { Reminder, ReminderInput, ReminderRepeat } from "../../types/reminder";
import {
  MAX_NOTIFY_DAYS,
  REPEAT_OPTIONS,
  clampNoticeDays,
  formatAmountInput,
  noticeOptionLabel,
  parseAmount,
} from "./reminderUtils";

interface ReminderFormDialogProps {
  open: boolean;
  /** Reminder to edit; null to create a new one. */
  reminder: Reminder | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (reminder: Reminder, mode: "create" | "edit") => void;
}

const NOTICE_DAYS = Array.from({ length: MAX_NOTIFY_DAYS + 1 }, (_, days) => days);

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function amountError(value: number | null): string | null {
  if (value === null) return null;
  if (Number.isNaN(value)) return "Escribe un importe válido, por ejemplo 49,99.";
  return value < 0 ? "El importe no puede ser negativo." : null;
}

export function ReminderFormDialog({ open, reminder, onOpenChange, onSaved }: ReminderFormDialogProps) {
  const mode = reminder ? "edit" : "create";
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [repeat, setRepeat] = useState<ReminderRepeat>("none");
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(1);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(reminder?.title ?? "");
    setDueDate(reminder?.dueDate.slice(0, 10) ?? "");
    setAmount(formatAmountInput(reminder?.amount));
    setRepeat(reminder?.repeat ?? "none");
    setNotifyDaysBefore(reminder ? clampNoticeDays(reminder.notifyDaysBefore) : 1);
    setEmailEnabled(reminder?.emailEnabled ?? true);
    setNotes(reminder?.notes ?? "");
    setSubmitted(false);
    setBusy(false);
    setError(null);
  }, [open, reminder]);

  const parsedAmount = parseAmount(amount);
  const errors = {
    title: title.trim() ? null : "Escribe un título.",
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? null : "Elige una fecha.",
    amount: amountError(parsedAmount),
  };
  const visibleErrors = submitted ? errors : { title: null, dueDate: null, amount: null };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (busy || errors.title || errors.dueDate || errors.amount) return;

    const input: ReminderInput = {
      title: title.trim(),
      notes: notes.trim() || null,
      dueDate,
      amount: parsedAmount !== null && parsedAmount > 0 ? Math.round(parsedAmount * 100) / 100 : null,
      repeat,
      notifyDaysBefore,
      emailEnabled,
      source: reminder ? reminder.source : "manual",
    };

    setBusy(true);
    setError(null);
    try {
      const saved = reminder ? await ReminderService.update(reminder.id, input) : await ReminderService.create(input);
      onSaved(saved, mode);
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo guardar el recordatorio. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border bg-card p-5 shadow-xl sm:max-w-md sm:p-6">
        <form noValidate onSubmit={(event: FormEvent<HTMLFormElement>) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Nuevo recordatorio" : "Editar recordatorio"}</DialogTitle>
            <DialogDescription>Te avisaremos en la campanita cuando se acerque la fecha.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <Field id="reminder-title" label="Título" required error={visibleErrors.title}>
              <Input
                id="reminder-title"
                value={title}
                maxLength={200}
                placeholder="Ej.: Pagar el seguro de la casa"
                aria-invalid={Boolean(visibleErrors.title)}
                aria-describedby={visibleErrors.title ? "reminder-title-error" : undefined}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="reminder-date" label="Fecha" required error={visibleErrors.dueDate}>
                <Input
                  id="reminder-date"
                  type="date"
                  value={dueDate}
                  aria-invalid={Boolean(visibleErrors.dueDate)}
                  aria-describedby={visibleErrors.dueDate ? "reminder-date-error" : undefined}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setDueDate(event.target.value)}
                />
              </Field>

              <Field id="reminder-amount" label="Importe (opcional)" error={visibleErrors.amount}>
                <div className="relative">
                  <Input
                    id="reminder-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0,00"
                    className="pr-8"
                    value={amount}
                    aria-invalid={Boolean(visibleErrors.amount)}
                    aria-describedby={visibleErrors.amount ? "reminder-amount-error" : undefined}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setAmount(event.target.value)}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    €
                  </span>
                </div>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="reminder-repeat" label="Repetir">
                <select
                  id="reminder-repeat"
                  className={`${FIELD_CLASS} h-9`}
                  value={repeat}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setRepeat(event.target.value as ReminderRepeat)}
                >
                  {REPEAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="reminder-notice" label="Avisarme">
                <select
                  id="reminder-notice"
                  className={`${FIELD_CLASS} h-9`}
                  value={notifyDaysBefore}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setNotifyDaysBefore(Number(event.target.value))}
                >
                  {NOTICE_DAYS.map((days) => (
                    <option key={days} value={days}>
                      {noticeOptionLabel(days)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {repeat !== "none" && (
              <p className="-mt-1 text-xs text-muted-foreground">
                Cuando lo marques como hecho, pasará solo a la siguiente fecha.
              </p>
            )}

            <label htmlFor="reminder-email" className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
              <input
                id="reminder-email"
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                checked={emailEnabled}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setEmailEnabled(event.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Enviar también por correo</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Además del aviso en la app, te llegará un correo cuando empiece a avisarte.
                </span>
              </span>
            </label>

            <Field id="reminder-notes" label="Notas">
              <textarea
                id="reminder-notes"
                rows={3}
                maxLength={1000}
                className={`${FIELD_CLASS} min-h-20 py-2`}
                placeholder="Opcional. Ej.: número de póliza o a quién hay que pagar."
                value={notes}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
              />
            </Field>

            {error && (
              <p role="alert" className="rounded-lg border border-negative/25 bg-negative-soft p-3 text-sm text-negative">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  required = false,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-negative" aria-hidden="true">
            {" "}*
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
