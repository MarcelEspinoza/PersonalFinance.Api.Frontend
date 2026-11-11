import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { firstDayOf } from "../../utils/civilDate";
import { EntryStatus, type Account, type MonthlyEntry } from "../../types/ledger";
import { LedgerService, ledgerErrorMessage } from "../../services/ledgerService";

export interface EntryFormValues {
  dueDate: string;
  forecastAmount: number;
  description: string;
  accountId?: string | null;
  /** Sólo viene si el usuario cambió la nota (así no se borra una nota por error). */
  notes?: string;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  conceptName: string;
  entry: MonthlyEntry | null;
  year: number;
  month: number;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EntryFormValues) => void;
}

export function EntryDialog({
  open,
  mode,
  conceptName,
  entry,
  year,
  month,
  busy,
  error,
  onOpenChange,
  onSubmit,
}: Props) {
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountsReload, setAccountsReload] = useState(0);
  const initialNotes = mode === "edit" ? entry?.notes ?? "" : "";
  const initialAccountId = mode === "edit" ? entry?.accountId ?? "" : "";

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && entry) {
      setDueDate(entry.dueDate);
      setAmount(String(entry.forecastAmount));
      setDescription(entry.description ?? "");
      setNotes(entry.notes ?? "");
      setAccountId(entry.accountId ?? "");
      return;
    }

    setDueDate(firstDayOf(year, month));
    setAmount("");
    setDescription("");
    setNotes("");
    setAccountId("");
  }, [open, mode, entry, year, month]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setAccountsLoading(true);
    setAccountsError(null);
    LedgerService.getAccounts()
      .then((items) => {
        if (active) setAccounts(items);
      })
      .catch((loadError) => {
        if (active) setAccountsError(ledgerErrorMessage(loadError, "No se han podido cargar las cuentas."));
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, accountsReload]);

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit =
    !busy && !accountsLoading && !accountsError &&
    dueDate.length === 10 && amount.trim() !== "" && Number.isFinite(parsedAmount);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      dueDate,
      forecastAmount: parsedAmount,
      description: description.trim(),
      accountId: mode === "create" || accountId !== initialAccountId ? accountId || null : undefined,
      notes: notes.trim() !== initialNotes.trim() ? notes.trim() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Nuevo apunte" : "Editar apunte"}</DialogTitle>
            <DialogDescription>{conceptName}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor="entry-due-date">Fecha prevista</Label>
              <Input
                id="entry-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="entry-amount">Importe previsto</Label>
              <Input
                id="entry-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="entry-account">Cuenta</Label>
              <select
                id="entry-account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                disabled={busy || accountsLoading || accountsError !== null}
                className="h-9 min-w-0 rounded-md border border-input bg-card px-3 text-sm"
              >
                {!initialAccountId && <option value="">Sin cuenta asignada</option>}
                {initialAccountId && !accounts.some(account => account.id === initialAccountId) && (
                  <option value={initialAccountId}>{entry?.accountName ?? "Cuenta actual"} (actual)</option>
                )}
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
              {accountsLoading && <p role="status" className="text-xs text-muted-foreground">Cargando cuentas…</p>}
              {accountsError && (
                <div className="space-y-2">
                  <p role="alert" className="text-sm text-negative">{accountsError}</p>
                  <Button type="button" variant="outline" size="sm" disabled={busy}
                    onClick={() => setAccountsReload(current => current + 1)}>
                    Reintentar cuentas
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {mode === "edit" && entry?.status === EntryStatus.Paid
                  ? "Este apunte ya está confirmado. Cambiar su cuenta reasigna el cobro o pago y afecta a sus saldos."
                  : "Elegir una cuenta no marca este apunte como cobrado o pagado."}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="entry-description">Descripción</Label>
              <Input
                id="entry-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="entry-notes">Nota</Label>
              <textarea
                id="entry-notes"
                className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional. Ej.: adelanto de la paga extra, se lo debo a Katherine…"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-negative/25 bg-negative-soft p-3 text-sm text-negative">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
