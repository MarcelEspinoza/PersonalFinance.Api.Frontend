import { Plus, X } from "lucide-react";
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
  const sharedParts = row.allocations.filter((part) => part.counterpartyId);
  const own = row.allocations.find((part) => !part.counterpartyId);
  const [conceptId, setConceptId] = useState(own?.conceptId ?? row.confirmedConceptId ?? row.suggestedConceptId ?? "");
  const [shares, setShares] = useState(sharedParts.length > 0
    ? sharedParts.map((part) => ({ personId: part.counterpartyId ?? "", amount: String(part.amount) }))
    : [{ personId: "", amount: (Math.abs(row.amount) / 2).toFixed(2) }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bankCents = Math.round(Math.abs(row.amount) * 100);
  const amounts = shares.map((share) => Number(share.amount.replace(",", ".")));
  const shareCents = amounts.map((value) => Number.isFinite(value) ? Math.round(value * 100) : 0);
  const totalSharedCents = shareCents.reduce((sum, amountCents) => sum + amountCents, 0);
  const valid = shares.length > 0 &&
    shares.every((share, index) => people.some((person) => person.id === share.personId) &&
      Number.isFinite(amounts[index]) && shareCents[index] > 0 &&
      shareCents[index] / 100 === amounts[index]) &&
    new Set(shares.map((share) => share.personId)).size === shares.length &&
    totalSharedCents > 0 && totalSharedCents < bankCents &&
    concepts.some((concept) => concept.id === conceptId && concept.kind.toLowerCase() === "expense") &&
    bankCents > 1;
  const canAddShare = people.length > shares.length && bankCents - totalSharedCents > 1;
  const submit = async (remove: boolean) => {
    setSaving(true);
    setError(null);
    try {
      if (remove) await onRemove();
      else await onSave({
        conceptId,
        replaceExisting: sharedParts.length > 0,
        shares: shares.map((share, index) => ({
          counterpartyId: share.personId,
          amount: amounts[index],
        })),
      });
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
            El banco conserva el pago completo. Solo lo que no te devuelven cuenta como gasto; cada parte adelantada queda por cobrar a esa persona en Liquidaciones.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (valid) void submit(false); }}>
          <p className="rounded-md bg-muted p-3 text-sm">
            {row.rawDescription} · {formatAmount(row.amount, row.currency)}
          </p>
          {people.length === 0 && <p className="text-sm text-muted-foreground">Añade primero a la persona en Liquidaciones.</p>}
          <div className="space-y-3">
            {shares.map((share, index) => {
              const otherCents = totalSharedCents - shareCents[index];
              const maximumCents = Math.max(0, bankCents - otherCents - 1);
              return (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_120px_auto] items-end gap-2 rounded-md border p-3">
                  <label className="block min-w-0 space-y-1 text-sm">
                    <span>Persona {index + 1}</span>
                    <select className="h-9 w-full rounded-md border bg-background px-2" value={share.personId}
                      disabled={saving} onChange={(event) => setShares((current) => current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, personId: event.target.value } : item))} required>
                      <option value="">Selecciona una persona</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id} disabled={shares.some((item, itemIndex) =>
                          itemIndex !== index && item.personId === person.id)}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>Te devuelve</span>
                    <Input type="number" min="0.01" max={maximumCents / 100} step="0.01" required
                      value={share.amount} disabled={saving} onChange={(event) => setShares((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} />
                  </label>
                  {shares.length > 1 && (
                    <Button type="button" size="icon" variant="outline" aria-label={`Quitar persona ${index + 1}`}
                      disabled={saving} onClick={() => setShares((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
            {canAddShare && (
              <Button type="button" size="sm" variant="outline" disabled={saving}
                onClick={() => {
                  const amountCents = Math.floor((bankCents - totalSharedCents) / 2);
                  setShares((current) => [...current, { personId: "", amount: (amountCents / 100).toFixed(2) }]);
                }}>
                <Plus className="h-4 w-4" /> Añadir persona
              </Button>
            )}
          </div>
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
          {totalSharedCents > 0 && totalSharedCents < bankCents && <p className="text-sm" aria-live="polite">
            Tu gasto: <strong>{formatAmount((bankCents - totalSharedCents) / 100, row.currency)}</strong>.
            {" "}Pendiente total de devolución: <strong>{formatAmount(totalSharedCents / 100, row.currency)}</strong>.
          </p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            {sharedParts.length > 0 && <Button type="button" variant="outline" disabled={saving} onClick={() => void submit(true)}>Quitar reparto</Button>}
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !valid}>{saving ? "Guardando…" : "Guardar reparto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
