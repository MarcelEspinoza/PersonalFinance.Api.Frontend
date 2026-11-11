import { CalendarClock, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn, normalizeSearchText } from "../../lib/utils";
import type { ImportPlannedAllocation, ImportRow, PlannedCandidate } from "../../types/ledger";
import { money } from "../../utils/civilDate";
import {
  candidatesForRow,
  formatAmount,
  formatCivilDate,
  plannedEntryLabel,
  plannedAllocationsFor,
  remainingIncludingRows,
  remainingText,
  truncateText,
} from "./importAssistantUtils";

interface PlannedEntryPickerDialogProps {
  /** Row to deduct from a planned entry; the dialog is open while it is not null. */
  row: ImportRow | null;
  candidates: PlannedCandidate[];
  saving: boolean;
  error: string | null;
  onPick: (candidate: PlannedCandidate) => void;
  onSave: (allocations: ImportPlannedAllocation[]) => void;
  onUnlink: () => void;
  onClose: () => void;
}

export function PlannedEntryPickerDialog({
  row,
  candidates,
  saving,
  error,
  onPick,
  onSave,
  onUnlink,
  onClose,
}: PlannedEntryPickerDialogProps) {
  const [multiple, setMultiple] = useState(false);
  const [query, setQuery] = useState("");
  const [parts, setParts] = useState<ImportPlannedAllocation[]>([]);
  useEffect(() => {
    setQuery("");
    setMultiple(Boolean(row?.plannedAllocations?.length));
    setParts(row?.plannedAllocations ?? []);
  }, [row]);
  const options = row ? candidatesForRow(candidates, row) : [];
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  const filteredOptions = options.filter(candidate => {
    const text = normalizeSearchText([
      plannedEntryLabel(candidate), candidate.description, candidate.accountName,
      formatCivilDate(candidate.dueDate), candidate.forecastAmount,
    ].join(" "));
    return terms.every(term => text.includes(term));
  });
  const linkedId = row?.plannedEntryId ?? null;
  const current = row ? plannedAllocationsFor(row) : [];
  const cents = (amount: number) => Math.round(amount * 100);
  const total = parts.reduce((sum, part) => sum + cents(part.amount), 0);
  const bankTotal = cents(Math.abs(row?.amount ?? 0));
  const selectedCategory = options.find((candidate) => candidate.id === parts[0]?.plannedEntryId)?.conceptId;
  const available = (candidate: PlannedCandidate) => cents(candidate.remainingAfterLinks) +
    current.filter((part) => part.plannedEntryId === candidate.id).reduce((sum, part) => sum + cents(part.amount), 0);
  const valid = parts.length > 0 && total === bankTotal && parts.every((part) => {
    const candidate = options.find((option) => option.id === part.plannedEntryId);
    return candidate && candidate.conceptId === selectedCategory && Number.isFinite(part.amount) &&
      part.amount > 0 && cents(part.amount) / 100 === part.amount && cents(part.amount) <= available(candidate);
  });
  const toggle = (candidate: PlannedCandidate) => {
    setParts((previous) => previous.some((part) => part.plannedEntryId === candidate.id)
      ? previous.filter((part) => part.plannedEntryId !== candidate.id)
      : [...previous, {
          plannedEntryId: candidate.id,
          amount: Math.max(0, Math.min(available(candidate), bankTotal - total)) / 100,
        }]);
  };

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open: boolean) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Descontar de previstos</DialogTitle>
          <DialogDescription>
            Puedes descontar todo de un previsto o repartir el pago entre varios de la misma categoría.
            Se registra un solo movimiento bancario y cada previsto conserva su historial.
          </DialogDescription>
        </DialogHeader>
        {row && (
          <div className="min-w-0 space-y-3">
            <p className="break-words rounded-md bg-muted p-3 text-sm">
              {formatCivilDate(row.valueDate)} · {truncateText(row.rawDescription, 80)} ·{" "}
              <span className="font-medium tabular-nums">{formatAmount(row.amount, row.currency)}</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant={multiple ? "outline" : "default"} disabled={saving} onClick={() => setMultiple(false)}>
                Un previsto
              </Button>
              <Button type="button" variant={multiple ? "default" : "outline"} disabled={saving} onClick={() => setMultiple(true)}>
                Repartir el pago
              </Button>
            </div>
            {multiple && (
              <p className="text-sm" aria-live="polite">
                Repartido {money(total / 100)} de {money(bankTotal / 100)}.
                {total !== bankTotal && ` ${total < bankTotal ? "Faltan" : "Sobran"} ${money(Math.abs(bankTotal - total) / 100)}.`}
                {" "}Selecciona los previstos e indica cuánto corresponde a cada uno.
                {" "}Usa importes positivos de hasta dos decimales, sin superar lo disponible.
              </p>
            )}
            <Input type="search" aria-label="Buscar previstos"
              placeholder="Buscar por categoría, descripción, cuenta o fecha…"
              value={query} disabled={saving} onChange={event => setQuery(event.target.value)} />
            {options.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay previstos abiertos de {row.amount < 0 ? "gasto" : "ingreso"} cerca de las fechas de este
                extracto.
                {" "}Los presupuestos se actualizan por categoría; no son recibos pendientes.
              </p>
            ) : filteredOptions.length === 0 ? (
              <p role="status" className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay previstos que coincidan con la búsqueda.
              </p>
            ) : (
              <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {filteredOptions.map((candidate) => {
                  const linked = candidate.id === linkedId;
                  const part = parts.find((allocation) => allocation.plannedEntryId === candidate.id);
                  const incompatible = parts.length > 0 && candidate.conceptId !== selectedCategory;
                  const label = plannedEntryLabel(candidate);
                  const after = remainingIncludingRows(candidate, [row]);
                  const otherRows = candidate.linkedRowIds.filter((rowId) => rowId !== row.id).length;
                  const details = [
                    `Vence el ${formatCivilDate(candidate.dueDate)}`,
                    candidate.accountName,
                    candidate.description && candidate.description.trim() !== label ? candidate.description : null,
                  ].filter(Boolean);
                  return (
                    <li key={candidate.id}>
                      {multiple ? (
                        <div className={cn("rounded-md border p-3 text-sm", part && "border-primary bg-primary/5")}>
                          <label className="flex items-start gap-2">
                            <input type="checkbox" checked={Boolean(part)} disabled={saving || (!part && (incompatible || available(candidate) <= 0))}
                              className="mt-1" onChange={() => toggle(candidate)} />
                            <span className="min-w-0">
                              <span className="font-medium">{label}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">{details.join(" · ")}</span>
                              <span className="mt-1 block text-xs">Disponible {money(available(candidate) / 100)}</span>
                              {incompatible && <span className="block text-xs text-muted-foreground">Es de otra categoría.</span>}
                            </span>
                          </label>
                          {part && (
                            <label className="mt-2 flex items-center gap-2">
                              Importe
                              <input type="number" min="0.01" max={available(candidate) / 100} step="0.01"
                                value={part.amount || ""} disabled={saving}
                                className="h-8 w-28 rounded-md border bg-background px-2 tabular-nums"
                                onChange={(event) => {
                                  const amount = Number(event.target.value);
                                  setParts((previous) => previous.map((allocation) =>
                                    allocation.plannedEntryId === candidate.id ? { ...allocation, amount } : allocation));
                                }} />
                              €
                            </label>
                          )}
                        </div>
                      ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onPick(candidate)}
                        aria-pressed={linked}
                        className={cn(
                          "w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
                          linked && "border-primary bg-primary/5",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="break-words font-medium">{label}</span>
                              {linked ? (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                                  <Check className="h-3 w-3" /> Vinculado
                                </span>
                              ) : (
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  Previsto {money(candidate.forecastAmount)}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 break-words text-xs text-muted-foreground">{details.join(" · ")}</p>
                            <p className="mt-1 text-xs">
                              {linked ? `Previsto ${money(candidate.forecastAmount)} · ` : ""}
                              Ahora {remainingText(candidate.remainingAfterLinks)}
                              {otherRows > 0 &&
                                ` (ya ${otherRows === 1 ? "se descuenta 1 movimiento" : `se descuentan ${otherRows} movimientos`} de este extracto)`}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 text-xs font-medium",
                                after < -0.005 ? "text-warning" : "text-positive",
                              )}
                            >
                              {linked ? "Con este movimiento" : "Si lo descuentas de aquí"}, {remainingText(after)}
                            </p>
                          </div>
                        </div>
                      </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          {saving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground sm:mr-auto">
              <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
            </span>
          )}
          {(linkedId || current.length > 0) && (
            <Button type="button" variant="outline" onClick={onUnlink} disabled={saving}>
              Quitar vínculo
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {multiple && (
            <Button type="button" onClick={() => onSave(parts)} disabled={saving || !valid}>
              Guardar reparto
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
