import { CalendarClock, Check, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn } from "../../lib/utils";
import type { ImportRow, PlannedCandidate } from "../../types/ledger";
import { money } from "../../utils/civilDate";
import {
  candidatesForRow,
  formatAmount,
  formatCivilDate,
  plannedEntryLabel,
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
  onUnlink: () => void;
  onClose: () => void;
}

export function PlannedEntryPickerDialog({
  row,
  candidates,
  saving,
  error,
  onPick,
  onUnlink,
  onClose,
}: PlannedEntryPickerDialogProps) {
  const options = row ? candidatesForRow(candidates, row) : [];
  const linkedId = row?.plannedEntryId ?? null;

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open: boolean) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Descontar de un previsto</DialogTitle>
          <DialogDescription>
            Al aplicar el lote, este movimiento se restará del previsto que elijas. Si lo cubre por completo, el
            previsto se cierra; si no, queda pendiente lo que falte.
          </DialogDescription>
        </DialogHeader>
        {row && (
          <div className="min-w-0 space-y-3">
            <p className="break-words rounded-md bg-muted p-3 text-sm">
              {formatCivilDate(row.valueDate)} · {truncateText(row.rawDescription, 80)} ·{" "}
              <span className="font-medium tabular-nums">{formatAmount(row.amount, row.currency)}</span>
            </p>
            {options.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay previstos abiertos de {row.amount < 0 ? "gasto" : "ingreso"} cerca de las fechas de este
                extracto.
              </p>
            ) : (
              <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {options.map((candidate) => {
                  const linked = candidate.id === linkedId;
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
          {linkedId && (
            <Button type="button" variant="outline" onClick={onUnlink} disabled={saving}>
              Quitar vínculo
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
