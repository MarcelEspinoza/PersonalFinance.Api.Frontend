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
import { money, monthLabel } from "../../utils/civilDate";

interface Props {
  open: boolean;
  year: number;
  month: number;
  computedBalance: number;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (actualClosingBalance: number | null) => void;
}

export function CloseMonthDialog({
  open,
  year,
  month,
  computedBalance,
  busy,
  error,
  onOpenChange,
  onSubmit,
}: Props) {
  const [useDeclared, setUseDeclared] = useState(false);
  const [declared, setDeclared] = useState("");

  useEffect(() => {
    if (!open) return;
    setUseDeclared(false);
    setDeclared(String(computedBalance));
  }, [open, computedBalance]);

  const parsed = Number(declared.replace(",", "."));
  const declaredValid = !useDeclared || (declared.trim() !== "" && Number.isFinite(parsed));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || !declaredValid) return;

    onSubmit(useDeclared ? parsed : null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="capitalize">Cerrar {monthLabel(year, month)}</DialogTitle>
            <DialogDescription>
              Al cerrar, el saldo pasa como arrastre al mes siguiente y el mes deja de aceptar
              cambios.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="rounded-md border border-border bg-secondary p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Saldo calculado
              </p>
              <p className="text-lg font-semibold tabular-nums">{money(computedBalance)}</p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 accent-primary"
                checked={useDeclared}
                onChange={(e) => setUseDeclared(e.target.checked)}
              />
              <span>
                Tengo el saldo real del banco y no coincide
                <span className="block text-xs text-muted-foreground">
                  El saldo que escribas manda sobre el calculado; la diferencia queda registrada.
                </span>
              </span>
            </label>

            {useDeclared && (
              <div className="grid gap-2">
                <Label htmlFor="close-declared">Saldo real a fin de mes</Label>
                <Input
                  id="close-declared"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={declared}
                  onChange={(e) => setDeclared(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {error && <p className="text-sm text-negative">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || !declaredValid}>
              {busy ? "Cerrando…" : "Cerrar mes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
