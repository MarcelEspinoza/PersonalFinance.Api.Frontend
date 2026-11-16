import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import type { ImportConceptOption, ImportPersonOption, ImportRow, PlannedCandidate, ShareImportRowInput } from "../../types/ledger";
import { ledgerErrorMessage } from "../../services/ledgerService";
import { normalizeSearchText } from "../../lib/utils";
import { candidatesForRow, formatAmount, formatCivilDate, plannedAllocationsFor, plannedEntryLabel } from "./importAssistantUtils";
import { ImportConceptPicker } from "./ImportConceptPicker";
import { ImportPersonPicker } from "./ImportPersonPicker";

interface SharedExpenseDialogProps {
  row: ImportRow;
  people: ImportPersonOption[];
  concepts: ImportConceptOption[];
  plannedCandidates: PlannedCandidate[];
  plannedWarning: string | null;
  onCreatePerson: (name: string) => Promise<ImportPersonOption>;
  onSave: (input: ShareImportRowInput) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export function SharedExpenseDialog({
  row, people, concepts, plannedCandidates, plannedWarning, onCreatePerson, onSave, onRemove, onClose,
}: SharedExpenseDialogProps) {
  const sharedParts = row.allocations.filter((part) => part.counterpartyId);
  const own = row.allocations.find((part) => !part.counterpartyId);
  const [conceptId, setConceptId] = useState(own?.conceptId ?? row.confirmedConceptId ?? row.suggestedConceptId ?? "");
  const currentPlanned = plannedAllocationsFor(row);
  const [plannedEntryId, setPlannedEntryId] = useState(currentPlanned[0]?.plannedEntryId ?? "");
  const [plannedSearch, setPlannedSearch] = useState("");
  const [shares, setShares] = useState(sharedParts.length > 0
    ? sharedParts.map((part) => ({ personId: part.counterpartyId ?? "", amount: String(part.amount) }))
    : [{ personId: "", amount: (Math.abs(row.amount) / 2).toFixed(2) }]);
  const [savingExpense, setSavingExpense] = useState(false);
  const [creatingPerson, setCreatingPerson] = useState(false);
  const saving = savingExpense || creatingPerson;
  const [error, setError] = useState<string | null>(null);
  const bankCents = Math.round(Math.abs(row.amount) * 100);
  const amounts = shares.map((share) => Number(share.amount.replace(",", ".")));
  const shareCents = amounts.map((value) => Number.isFinite(value) ? Math.round(value * 100) : 0);
  const totalSharedCents = shareCents.reduce((sum, amountCents) => sum + amountCents, 0);
  const ownCents = bankCents - totalSharedCents;
  const plannedOptions = candidatesForRow(plannedCandidates, row);
  const selectedPlanned = plannedOptions.find(candidate => candidate.id === plannedEntryId);
  const availableCents = (candidate: PlannedCandidate) => Math.round(candidate.remainingAfterLinks * 100) +
    currentPlanned.filter(link => link.plannedEntryId === candidate.id)
      .reduce((sum, link) => sum + Math.round(link.amount * 100), 0);
  const usesPlanned = ownCents > 0 && Boolean(plannedEntryId);
  const validPlanned = !usesPlanned || (!plannedWarning && selectedPlanned?.conceptId === conceptId &&
    ownCents <= availableCents(selectedPlanned));
  const valid = shares.length > 0 &&
    shares.every((share, index) => people.some((person) => person.id === share.personId) &&
      Number.isFinite(amounts[index]) && shareCents[index] > 0 &&
      shareCents[index] / 100 === amounts[index]) &&
    new Set(shares.map((share) => share.personId)).size === shares.length &&
    totalSharedCents > 0 && totalSharedCents <= bankCents &&
    concepts.some((concept) => concept.id === conceptId && concept.kind.toLowerCase() === "expense") &&
    bankCents > 0 && validPlanned;
  const canAddShare = bankCents - totalSharedCents > 0;
  const submit = async (remove: boolean) => {
    setSavingExpense(true);
    setError(null);
    try {
      if (remove) await onRemove();
      else await onSave({
        conceptId,
        plannedEntryId: usesPlanned ? plannedEntryId : null,
        replaceExisting: sharedParts.length > 0,
        shares: shares.map((share, index) => ({
          counterpartyId: share.personId,
          amount: amounts[index],
        })),
      });
    } catch (err) {
      setError(ledgerErrorMessage(err, "No se ha podido guardar el gasto compartido."));
    } finally {
      setSavingExpense(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
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
          <div className="space-y-3">
            {shares.map((share, index) => {
              const otherCents = totalSharedCents - shareCents[index];
              const maximumCents = Math.max(0, bankCents - otherCents);
              return (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_120px_auto] items-end gap-2 rounded-md border p-3">
                  <div className="min-w-0 space-y-1 text-sm">
                    <Label htmlFor={`shared-person-${index}`}>Persona {index + 1}</Label>
                    <ImportPersonPicker id={`shared-person-${index}`} people={people} value={share.personId}
                      disabled={saving} excludedIds={shares.filter((_, itemIndex) => itemIndex !== index).map(item => item.personId)}
                      onChange={personId => setShares(current => current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, personId } : item))}
                      onCreatePerson={onCreatePerson} onCreatingChange={setCreatingPerson} />
                  </div>
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
            <Label htmlFor="shared-expense-concept">Categoría del gasto</Label>
            <ImportConceptPicker
              id="shared-expense-concept"
              concepts={concepts.filter(concept => concept.kind.toLowerCase() === "expense")}
              value={conceptId}
              placeholder="Selecciona una categoría"
              showKind={false}
              label="Categoría del gasto"
              disabled={saving}
              onChange={value => {
                setConceptId(value);
                if (selectedPlanned?.conceptId !== value) setPlannedEntryId("");
              }}
              required
            />
          </div>
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <Label htmlFor="shared-expense-planned">Descontar tu parte de un previsto (opcional)</Label>
            <Input type="search" value={plannedSearch} disabled={saving || ownCents <= 0 || Boolean(plannedWarning)}
              aria-label="Buscar previsto para tu parte" placeholder="Ej.: cumple de Vane"
              onChange={event => setPlannedSearch(event.target.value)} />
            <select id="shared-expense-planned" value={plannedEntryId}
              disabled={saving || ownCents <= 0 || Boolean(plannedWarning)}
              className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
              onChange={event => {
                const id = event.target.value;
                setPlannedEntryId(id);
                const candidate = plannedOptions.find(option => option.id === id);
                if (candidate?.conceptId) setConceptId(candidate.conceptId);
              }}>
              <option value="">Sin previsto: solo registrar mi gasto</option>
              {plannedEntryId && !selectedPlanned && (
                <option value={plannedEntryId}>Previsto vinculado no disponible</option>
              )}
              {plannedOptions.filter(candidate => {
                const text = normalizeSearchText([plannedEntryLabel(candidate), candidate.description, candidate.accountName,
                  formatCivilDate(candidate.dueDate)].join(" "));
                return candidate.id === plannedEntryId ||
                  normalizeSearchText(plannedSearch).split(/\s+/).every(term => text.includes(term));
              }).map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {[plannedEntryLabel(candidate), candidate.description, formatCivilDate(candidate.dueDate),
                    `disponible ${formatAmount(availableCents(candidate) / 100, row.currency)}`].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
            {plannedWarning && <p role="alert" className="text-xs text-destructive">{plannedWarning}</p>}
            <p className="text-xs text-muted-foreground">
              {ownCents <= 0 ? "Si te devuelven todo, no se descuenta nada de tus previstos." :
                usesPlanned ? `Solo tus ${formatAmount(ownCents / 100, row.currency)} se descontarán del previsto. Las devoluciones quedan aparte.` :
                  "Elige un previsto para descontar solo tu parte. Su categoría se seleccionará automáticamente."}
            </p>
            {!validPlanned && (
              <p role="alert" className="text-xs text-destructive">
                {!selectedPlanned ? "El previsto ya no está disponible. Actualiza la revisión o quita el vínculo." :
                  "Tu parte supera lo disponible en el previsto. Elige otro o ajusta el reparto."}
              </p>
            )}
          </div>
          {totalSharedCents > 0 && totalSharedCents <= bankCents && <p className="text-sm" aria-live="polite">
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
