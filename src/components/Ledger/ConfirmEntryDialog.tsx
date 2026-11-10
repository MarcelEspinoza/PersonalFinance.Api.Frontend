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
import { today } from "../../utils/civilDate";
import type { Account, MonthlyEntry } from "../../types/ledger";
import { LedgerService } from "../../services/ledgerService";

export interface ConfirmFormValues {
  actualAmount: number;
  valueDate: string;
  accountId?: string | null;
}

interface Props {
  open: boolean;
  entry: MonthlyEntry | null;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ConfirmFormValues) => void;
}

export function ConfirmEntryDialog({ open, entry, busy, error, onOpenChange, onSubmit }: Props) {
  const [amount, setAmount] = useState("");
  const [valueDate, setValueDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (!open || !entry) return;

    // El importe previsto es la mejor conjetura: lo normal es confirmarlo tal cual.
    setAmount(String((entry.settlementAllocatedAmount ?? 0) > 0 ? entry.remaining : entry.forecastAmount));
    setValueDate(today());
    setAccountId(entry.accountId ?? "");
  }, [open, entry]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    LedgerService.getAccounts()
      .then((items) => {
        if (active) setAccounts(items);
      })
      .catch(() => {
        if (active) setAccounts([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit = !busy && amount.trim() !== "" && Number.isFinite(parsedAmount);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({ actualAmount: parsedAmount, valueDate, accountId: accountId || null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border bg-card p-6 shadow-xl sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirmar movimiento</DialogTitle>
            <DialogDescription>
              {entry?.description || "Apunte"} — previsto {entry?.forecastAmount}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor="confirm-amount">Importe real</Label>
              <Input
                id="confirm-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-value-date">Fecha valor</Label>
              <Input
                id="confirm-value-date"
                type="date"
                value={valueDate}
                onChange={(e) => setValueDate(e.target.value)}
              />
            </div>

            {accounts.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="confirm-account">Cuenta (por ejemplo, «Efectivo» si lo pagaste en mano)</Label>
                <select
                  id="confirm-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="h-9 rounded-md border border-input bg-card px-3 text-sm"
                >
                  {!entry?.accountId && (
                    <option value="">{entry?.accountName ? `La de ahora (${entry.accountName})` : "Sin cuenta"}</option>
                  )}
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              {busy ? "Confirmando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
