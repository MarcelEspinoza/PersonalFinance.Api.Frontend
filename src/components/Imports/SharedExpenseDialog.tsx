import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import type { ImportConceptOption, ImportPersonOption, ImportRow, ShareImportRowInput } from "../../types/ledger";
import { ledgerErrorMessage } from "../../services/ledgerService";
import { formatAmount } from "./importAssistantUtils";
import { ImportConceptPicker } from "./ImportConceptPicker";

interface SharedExpenseDialogProps {
  row: ImportRow;
  people: ImportPersonOption[];
  concepts: ImportConceptOption[];
  onSave: (input: ShareImportRowInput) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export function SharedExpenseDialog({ row, people, concepts, onSave, onRemove, onClose }: SharedExpenseDialogProps) {
  const shared = row.allocations.find((part) => part.counterpartyId);
  const own = row.allocations.find((part) => !part.counterpartyId);
  const [personId, setPersonId] = useState(shared?.counterpartyId ?? "");
  const [conceptId, setConceptId] = useState(own?.conceptId ?? row.confirmedConceptId ?? row.suggestedConceptId ?? "");
  const [amount, setAmount] = useState(shared ? String(shared.amount) : (Math.abs(row.amount) / 2).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount);
  const bankCents = Math.round(Math.abs(row.amount) * 100);
  const sharedCents = Math.round(value * 100);
  const valid = people.some((person) => person.id === personId) &&
    concepts.some((concept) => concept.id === conceptId && concept.kind.toLowerCase() === "expense") &&
    Number.isFinite(value) && sharedCents > 0 && sharedCents < bankCents && sharedCents / 100 === value;
  const submit = async (remove: boolean) => {
    setSaving(true);
    setError(null);
    try {
      if (remove) await onRemove();
      else await onSave({ counterpartyId: personId, conceptId, amount: value });
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido guardar el gasto compartido."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartir gasto</DialogTitle>
          <DialogDescription>
            El banco conserva el pago completo. Solo tu parte cuenta como gasto; lo adelantado queda por cobrar en Liquidaciones.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (valid) void submit(false); }}>
          <p className="rounded-md bg-muted p-3 text-sm">
            {row.rawDescription} · {formatAmount(row.amount, row.currency)}
          </p>
          <label className="block space-y-1 text-sm">
            <span>¿Quién te devolverá su parte?</span>
            <select className="h-9 w-full rounded-md border bg-background px-2" value={personId}
              disabled={saving} onChange={(event) => setPersonId(event.target.value)} required>
              <option value="">Selecciona una persona</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          {people.length === 0 && <p className="text-sm text-muted-foreground">Añade primero a la persona en Liquidaciones.</p>}
          <div className="space-y-1 text-sm">
            <Label htmlFor="shared-expense-concept">Categoría de tu parte</Label>
            <ImportConceptPicker
              id="shared-expense-concept"
              concepts={concepts.filter(concept => concept.kind.toLowerCase() === "expense")}
              value={conceptId}
              placeholder="Selecciona una categoría"
              showKind={false}
              label="Categoría de tu parte"
              disabled={saving}
              onChange={setConceptId}
              required
            />
          </div>
          <label className="block space-y-1 text-sm">
            <span>Importe que te devolverá</span>
            <Input type="number" min="0.01" max={(bankCents - 1) / 100} step="0.01" required
              value={amount} disabled={saving} onChange={(event) => setAmount(event.target.value)} />
          </label>
          {valid && <p className="text-sm" aria-live="polite">
            Tu gasto: <strong>{formatAmount((bankCents - sharedCents) / 100, row.currency)}</strong>.
            {" "}Pendiente de devolución: <strong>{formatAmount(value, row.currency)}</strong>.
            {" "}No necesitas una fecha para registrar lo que te deben.
          </p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            {shared && <Button type="button" variant="outline" disabled={saving} onClick={() => void submit(true)}>Quitar reparto</Button>}
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !valid}>{saving ? "Guardando…" : "Guardar reparto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
