import { Check, MinusCircle, Pencil, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { Button } from "../ui/button";
import { EntryStatus, type MonthlyEntry } from "../../types/ledger";
import { money, shortDate } from "../../utils/civilDate";

const STATUS_STYLES: Record<EntryStatus, { label: string; className: string }> = {
  [EntryStatus.Planned]: {
    label: "Previsto",
    className: "bg-secondary text-muted-foreground",
  },
  [EntryStatus.Pending]: {
    label: "Vencido",
    className: "bg-warning-soft text-warning",
  },
  [EntryStatus.Paid]: {
    label: "Confirmado",
    className: "bg-positive-soft text-positive",
  },
  [EntryStatus.Skipped]: {
    label: "Descartado",
    className: "bg-secondary text-muted-foreground",
  },
};

interface Props {
  entry: MonthlyEntry;
  locked: boolean;
  busy: boolean;
  onConfirm: (entry: MonthlyEntry) => void;
  onUnconfirm: (entry: MonthlyEntry) => void;
  onSkip: (entry: MonthlyEntry) => void;
  onUnskip: (entry: MonthlyEntry) => void;
  onEdit: (entry: MonthlyEntry) => void;
  onDelete: (entry: MonthlyEntry) => void;
}

export function EntryRow({
  entry,
  locked,
  busy,
  onConfirm,
  onUnconfirm,
  onSkip,
  onUnskip,
  onEdit,
  onDelete,
}: Props) {
  const status = STATUS_STYLES[entry.status] ?? STATUS_STYLES[EntryStatus.Planned];
  const skipped = entry.status === EntryStatus.Skipped;
  const confirmed = entry.status === EntryStatus.Paid;
  const disabled = locked || busy;

  return (
    <tr className={`border-t border-border/60 text-sm transition-colors hover:bg-accent/40 ${skipped ? "opacity-55" : ""}`}>
      <td className="py-3 pl-10 pr-3">
        <div className="flex items-center gap-2">
          <span className={skipped ? "line-through" : ""}>
            {entry.description || "(sin descripción)"}
          </span>
          {entry.fromRecurringRule && (
            <span
              className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title="Generado por una regla recurrente"
            >
              auto
            </span>
          )}
        </div>
        {entry.accountName && (
          <p className="text-xs text-muted-foreground">{entry.accountName}</p>
        )}
      </td>

      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
        {shortDate(entry.valueDate ?? entry.dueDate)}
      </td>

      <td className="px-3 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </td>

      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
        {money(entry.forecastAmount)}
      </td>

      <td className="px-3 py-3 text-right font-medium tabular-nums">
        {confirmed ? money(entry.actualAmount) : <span className="text-muted-foreground">—</span>}
      </td>

      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
        {skipped ? "—" : money(entry.remaining)}
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-0.5">
          {!skipped && !confirmed && (
            <Button
              variant="ghost"
              size="icon"
              title="Confirmar pago"
              disabled={disabled}
              onClick={() => onConfirm(entry)}
            >
              <Check className="text-positive" />
            </Button>
          )}

          {confirmed && (
            <Button
              variant="ghost"
              size="icon"
              title="Deshacer confirmación"
              disabled={disabled}
              onClick={() => onUnconfirm(entry)}
            >
              <Undo2 />
            </Button>
          )}

          {!confirmed &&
            (skipped ? (
              <Button
                variant="ghost"
                size="icon"
                title="Recuperar"
                disabled={disabled}
                onClick={() => onUnskip(entry)}
              >
                <RotateCcw />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                title="Descartar este mes"
                disabled={disabled}
                onClick={() => onSkip(entry)}
              >
                <MinusCircle />
              </Button>
            ))}

          <Button
            variant="ghost"
            size="icon"
            title="Editar"
            disabled={disabled}
            onClick={() => onEdit(entry)}
          >
            <Pencil />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title={
              entry.fromRecurringRule
                ? "Los asientos recurrentes no se borran: usa descartar"
                : "Borrar"
            }
            disabled={disabled || entry.fromRecurringRule}
            onClick={() => onDelete(entry)}
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
