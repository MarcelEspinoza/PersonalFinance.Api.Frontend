import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { EntryRow } from "./EntryRow";
import { LEDGER_LG_CELL, LEDGER_XL_CELL, LedgerColGroup } from "./ledgerColumns";
import type { MonthlyConcept, MonthlyEntry, MonthlyGroup } from "../../types/ledger";
import { money } from "../../utils/civilDate";

interface Props {
  group: MonthlyGroup;
  locked: boolean;
  busy: boolean;
  /** The whole group folded down to its header (its totals stay visible). */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAddEntry: (concept: MonthlyConcept, group: MonthlyGroup) => void;
  onRenameConcept?: (concept: MonthlyConcept) => void;
  onConfirm: (entry: MonthlyEntry) => void;
  onUnconfirm: (entry: MonthlyEntry) => void;
  onSkip: (entry: MonthlyEntry) => void;
  onUnskip: (entry: MonthlyEntry) => void;
  onEdit: (entry: MonthlyEntry) => void;
  onDelete: (entry: MonthlyEntry) => void;
  onAssign?: (entry: MonthlyEntry) => void;
  /** Nothing in the group matches the search; it stays mounted so its folds are kept. */
  hidden?: boolean;
  /** While searching, concept folds come from here instead of the group's own ones (kept for afterwards). */
  searchFolding?: { folds: Record<string, boolean>; toggle: (conceptId: string) => void };
}

export function GroupSection({
  group,
  locked,
  busy,
  collapsed,
  onToggleCollapsed,
  onAddEntry,
  onRenameConcept,
  hidden = false,
  searchFolding,
  ...rowHandlers
}: Props) {
  const [collapsedConcepts, setCollapsedConcepts] = useState<Record<string, boolean>>({});

  const toggle = (conceptId: string) =>
    setCollapsedConcepts((current) => ({ ...current, [conceptId]: !current[conceptId] }));

  if (hidden) return null;

  return (
    <section className="mb-4 overflow-hidden rounded-xl border bg-card shadow-sm">
      <header data-tour="month-group" className={`bg-secondary/70 ${collapsed ? "" : "border-b"}`}>
        <h2>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            title={collapsed ? "Expandir grupo" : "Contraer grupo"}
            className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5 text-left transition-colors hover:bg-secondary sm:px-5"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              {collapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{group.name}</span>
            </span>
            <span className="flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums">
              <span className="whitespace-nowrap text-muted-foreground">
                Previsto <span className="text-foreground">{money(group.forecastTotal)}</span>
              </span>
              <span className="whitespace-nowrap text-muted-foreground">
                Real <span className="font-semibold text-foreground">{money(group.actualTotal)}</span>
              </span>
              <span className="whitespace-nowrap text-muted-foreground">
                Resta <span className="text-foreground">{money(group.remainingTotal)}</span>
              </span>
            </span>
          </button>
        </h2>
      </header>

      {!collapsed && (
        <table className="w-full table-fixed">
          <LedgerColGroup />
          <thead className="sr-only">
            <tr>
              <th>Concepto</th>
              <th className={LEDGER_LG_CELL}>Fecha</th>
              <th className={LEDGER_LG_CELL}>Estado</th>
              <th className={LEDGER_XL_CELL}>Previsto</th>
              <th>Real</th>
              <th className={LEDGER_XL_CELL}>Restante</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {group.concepts.map((concept) => {
              const isCollapsed = searchFolding
                ? searchFolding.folds[concept.conceptId] ?? false
                : collapsedConcepts[concept.conceptId] ?? false;
              const hasEntries = concept.entries.length > 0;

              return (
                <ConceptRows
                  key={concept.conceptId}
                  concept={concept}
                  collapsed={isCollapsed}
                  hasEntries={hasEntries}
                  locked={locked}
                  busy={busy}
                  onToggle={() =>
                    searchFolding ? searchFolding.toggle(concept.conceptId) : toggle(concept.conceptId)
                  }
                  onAddEntry={() => onAddEntry(concept, group)}
                  onRename={onRenameConcept ? () => onRenameConcept(concept) : undefined}
                  rowHandlers={rowHandlers}
                />
              );
            })}

            {group.concepts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Sin conceptos en este grupo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ConceptRows({
  concept,
  collapsed,
  hasEntries,
  locked,
  busy,
  onToggle,
  onAddEntry,
  onRename,
  rowHandlers,
}: {
  concept: MonthlyConcept;
  collapsed: boolean;
  hasEntries: boolean;
  locked: boolean;
  busy: boolean;
  onToggle: () => void;
  onAddEntry: () => void;
  onRename?: () => void;
  rowHandlers: Omit<
    Props,
    "group" | "locked" | "busy" | "collapsed" | "onToggleCollapsed" | "onAddEntry" | "onRenameConcept" | "hidden" | "searchFolding"
  >;
}) {
  return (
    <>
      <tr className="border-t border-border first:border-t-0 transition-colors hover:bg-accent/30">
        <td className="py-2 pl-3 pr-2 sm:pl-5 sm:pr-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex min-w-0 max-w-full items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground disabled:cursor-default"
              disabled={!hasEntries}
            >
              {hasEntries ? (
                collapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <span className="truncate" title={concept.name}>
                {concept.name}
              </span>
            </button>

            {concept.budgetLimit != null && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                  concept.isOverBudget
                    ? "bg-negative-soft text-negative"
                    : "bg-secondary text-muted-foreground"
                }`}
                title="Presupuesto del mes"
              >
                {money(concept.actualTotal)} / {money(concept.budgetLimit)}
              </span>
            )}
          </div>
          {/* Data from the columns hidden on narrower screens (see ledgerColumns). */}
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs tabular-nums text-muted-foreground xl:hidden">
            <span>Previsto {money(concept.forecastTotal)}</span>
            <span>Resta {money(concept.remainingTotal)}</span>
          </div>
        </td>

        <td className={LEDGER_LG_CELL} />
        <td className={LEDGER_LG_CELL} />

        <td className={`${LEDGER_XL_CELL} whitespace-nowrap px-3 py-2 text-right text-sm tabular-nums text-muted-foreground`}>
          {money(concept.forecastTotal)}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-medium tabular-nums sm:px-3">
          {money(concept.actualTotal)}
        </td>
        <td className={`${LEDGER_XL_CELL} whitespace-nowrap px-3 py-2 text-right text-sm tabular-nums text-muted-foreground`}>
          {money(concept.remainingTotal)}
        </td>

        <td className="py-2 pl-1 pr-2">
          <div className="flex flex-wrap justify-end gap-0.5">
            {onRename && (
              <Button
                variant="ghost"
                size="icon"
                title="Renombrar concepto"
                data-tour="concept-rename"
                disabled={busy}
                onClick={onRename}
              >
                <Pencil />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              title="Añadir apunte"
              data-tour="concept-add"
              disabled={locked || busy}
              onClick={onAddEntry}
            >
              <Plus />
            </Button>
          </div>
        </td>
      </tr>

      {!collapsed &&
        concept.entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} locked={locked} busy={busy} {...rowHandlers} />
        ))}
    </>
  );
}
