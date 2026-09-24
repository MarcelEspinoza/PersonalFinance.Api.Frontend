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
import type { MonthlyEntry } from "../../types/ledger";

export interface EntryFormValues {
  dueDate: string;
  forecastAmount: number;
  description: string;
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

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && entry) {
      setDueDate(entry.dueDate);
      setAmount(String(entry.forecastAmount));
      setDescription(entry.description ?? "");
      return;
    }

    setDueDate(firstDayOf(year, month));
    setAmount("");
    setDescription("");
  }, [open, mode, entry, year, month]);

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit =
    !busy && dueDate.length === 10 && amount.trim() !== "" && Number.isFinite(parsedAmount);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      dueDate,
      forecastAmount: parsedAmount,
      description: description.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Nuevo apunte" : "Editar apunte"}</DialogTitle>
            <DialogDescription>{conceptName}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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
              <Label htmlFor="entry-description">Descripción</Label>
              <Input
                id="entry-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            {error && <p className="text-sm text-negative">{error}</p>}
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
