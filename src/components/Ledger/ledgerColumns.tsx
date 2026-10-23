import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

/*
 * Column layout shared by the month ledger: the sticky header and every group table use
 * `table-fixed` + <LedgerColGroup />, so the columns line up across groups.
 *
 * Columns that don't fit on narrower screens are hidden on their <col>, <th> and <td> at the
 * same breakpoint (rows repeat that data under the description instead), so header and body
 * cells must always use these classes. Those repeated labels may wrap before the amount on tiny
 * phones instead of overflowing the fixed column; money() itself never breaks (NBSP before €).
 */

/** Fecha and Estado: visible from lg. */
export const LEDGER_LG_CELL = "hidden lg:table-cell";
/** Previsto and Restante: visible from xl. */
export const LEDGER_XL_CELL = "hidden xl:table-cell";

/** Concepto | Fecha | Estado | Previsto | Real | Restante | Acciones (up to 5 icon buttons). */
export function LedgerColGroup() {
  return (
    <colgroup>
      <col />
      <col className="hidden w-16 lg:table-column" />
      <col className="hidden w-[6.5rem] lg:table-column" />
      <col className="hidden w-28 xl:table-column" />
      <col className="w-24 sm:w-28" />
      <col className="hidden w-28 xl:table-column" />
      <col className="w-[5.5rem] sm:w-32 lg:w-52" />
    </colgroup>
  );
}

interface HeaderProps {
  allCollapsed: boolean;
  onToggleAll: () => void;
}

/** Single visible column header for all the groups; stays on top while scrolling the month. */
export function LedgerColumnsHeader({ allCollapsed, onToggleAll }: HeaderProps) {
  const toggleLabel = allCollapsed ? "Expandir todo" : "Contraer todo";
  const ToggleIcon = allCollapsed ? ChevronsUpDown : ChevronsDownUp;

  return (
    <div className="sticky top-0 z-20 mb-2 overflow-hidden rounded-lg border bg-card/95 shadow-sm backdrop-blur">
      <table className="w-full table-fixed">
        <LedgerColGroup />
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="py-1.5 pl-3 pr-2 text-left font-medium sm:pl-5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">Concepto</span>
                <button
                  type="button"
                  onClick={onToggleAll}
                  title={toggleLabel}
                  aria-label={toggleLabel}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 font-medium normal-case tracking-normal transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ToggleIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{toggleLabel}</span>
                </button>
              </div>
            </th>
            <th scope="col" className={`${LEDGER_LG_CELL} px-2 py-1.5 text-left font-medium`}>
              Fecha
            </th>
            <th scope="col" className={`${LEDGER_LG_CELL} px-2 py-1.5 text-left font-medium`}>
              Estado
            </th>
            <th scope="col" className={`${LEDGER_XL_CELL} px-3 py-1.5 text-right font-medium`}>
              Previsto
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium sm:px-3">
              Real
            </th>
            <th scope="col" className={`${LEDGER_XL_CELL} px-3 py-1.5 text-right font-medium`}>
              Restante
            </th>
            <th scope="col" className="py-1.5 pl-1 pr-2 text-right font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
      </table>
    </div>
  );
}
