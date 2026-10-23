import { Check, HandCoins, MinusCircle, Pencil, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { Button } from "../ui/button";
import { EntryStatus, type MonthlyEntry } from "../../types/ledger";
import { money, shortDate } from "../../utils/civilDate";
import { LEDGER_LG_CELL, LEDGER_XL_CELL } from "./ledgerColumns";

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
  /** Manda el movimiento a la liquidación abierta de mamá o Vane. */
  onAssign?: (entry: MonthlyEntry) => void;
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
  onAssign,
}: Props) {
  const status = STATUS_STYLES[entry.status] ?? STATUS_STYLES[EntryStatus.Planned];
  const skipped = entry.status === EntryStatus.Skipped;
  const confirmed = entry.status === EntryStatus.Paid;
  const disabled = locked || busy;
  const description = entry.description || "(sin descripción)";
  const date = shortDate(entry.valueDate ?? entry.dueDate);

  return (
    <tr className={`border-t border-border/60 text-sm transition-colors hover:bg-accent/40 ${skipped ? "opacity-55" : ""}`}>
      <td className="py-2 pl-8 pr-2 sm:pl-10 sm:pr-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate ${skipped ? "line-through" : ""}`} title={description}>
            {description}
          </span>
          {entry.fromRecurringRule && (
            <span
              className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title="Generado por una regla recurrente"
            >
              auto
            </span>
          )}
        </div>
        {/* Data from the columns hidden on narrower screens (see ledgerColumns). */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground xl:hidden">
          {date && <span className="whitespace-nowrap lg:hidden">{date}</span>}
          <span
            data-tour="entry-status"
            className={`whitespace-nowrap rounded-full px-1.5 py-px text-[11px] font-medium lg:hidden ${status.className}`}
          >
            {status.label}
          </span>
          <span className="tabular-nums">Previsto {money(entry.forecastAmount)}</span>
        </div>
        {entry.accountName && (
          <p className="truncate text-xs text-muted-foreground" title={entry.accountName}>
            {entry.accountName}
          </p>
        )}
        {entry.notes && (
          <p className="line-clamp-2 max-w-md text-xs italic text-muted-foreground" title={entry.notes}>
            Nota: {entry.notes}
          </p>
        )}
      </td>

      <td className={`${LEDGER_LG_CELL} whitespace-nowrap px-2 py-2 text-muted-foreground`}>
        {date}
      </td>

      <td className={`${LEDGER_LG_CELL} whitespace-nowrap px-2 py-2`}>
        <span data-tour="entry-status" className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </td>

      <td className={`${LEDGER_XL_CELL} whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground`}>
        {money(entry.forecastAmount)}
      </td>

      <td className="whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums sm:px-3">
        {confirmed ? money(entry.actualAmount) : <span className="text-muted-foreground">—</span>}
      </td>

      <td className={`${LEDGER_XL_CELL} whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground`}>
        {skipped ? "—" : money(entry.remaining)}
      </td>

      <td className="py-2 pl-1 pr-2">
        <div className="flex flex-wrap items-center justify-end gap-0.5">
          {!skipped && !confirmed && (
            <Button
              variant="ghost"
              size="icon"
              title="Confirmar pago"
              data-tour="entry-confirm"
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
              data-tour="entry-unconfirm"
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
                data-tour="entry-unskip"
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
                data-tour="entry-skip"
                disabled={disabled}
                onClick={() => onSkip(entry)}
              >
                <MinusCircle />
              </Button>
            ))}

          {onAssign && (
            <Button
              variant="ghost"
              size="icon"
              title="Es de mamá o de Vane"
              disabled={busy}
              onClick={() => onAssign(entry)}
            >
              <HandCoins />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            title="Editar"
            data-tour="entry-edit"
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
