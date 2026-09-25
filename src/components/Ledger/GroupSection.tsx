import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { EntryRow } from "./EntryRow";
import type { MonthlyConcept, MonthlyEntry, MonthlyGroup } from "../../types/ledger";
import { money } from "../../utils/civilDate";

interface Props {
  group: MonthlyGroup;
  locked: boolean;
  busy: boolean;
  onAddEntry: (concept: MonthlyConcept, group: MonthlyGroup) => void;
  onConfirm: (entry: MonthlyEntry) => void;
  onUnconfirm: (entry: MonthlyEntry) => void;
  onSkip: (entry: MonthlyEntry) => void;
  onUnskip: (entry: MonthlyEntry) => void;
  onEdit: (entry: MonthlyEntry) => void;
  onDelete: (entry: MonthlyEntry) => void;
}

export function GroupSection({ group, locked, busy, onAddEntry, ...rowHandlers }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (conceptId: string) =>
    setCollapsed((current) => ({ ...current, [conceptId]: !current[conceptId] }));

  return (
    <section className="mb-6 overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-secondary/70 px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
          {group.name}
        </h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums">
          <span className="text-muted-foreground">
            Previsto <span className="text-foreground">{money(group.forecastTotal)}</span>
          </span>
          <span className="text-muted-foreground">
            Real <span className="font-semibold text-foreground">{money(group.actualTotal)}</span>
          </span>
          <span className="text-muted-foreground">
            Resta <span className="text-foreground">{money(group.remainingTotal)}</span>
          </span>
        </div>
      </header>

      <table className="w-full">
        <thead className="sr-only">
          <tr>
            <th>Concepto</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Previsto</th>
            <th>Real</th>
            <th>Restante</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {group.concepts.map((concept) => {
            const isCollapsed = collapsed[concept.conceptId] ?? false;
            const hasEntries = concept.entries.length > 0;

            return (
              <ConceptRows
                key={concept.conceptId}
                concept={concept}
                collapsed={isCollapsed}
                hasEntries={hasEntries}
                locked={locked}
                busy={busy}
                onToggle={() => toggle(concept.conceptId)}
                onAddEntry={() => onAddEntry(concept, group)}
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
  rowHandlers,
}: {
  concept: MonthlyConcept;
  collapsed: boolean;
  hasEntries: boolean;
  locked: boolean;
  busy: boolean;
  onToggle: () => void;
  onAddEntry: () => void;
  rowHandlers: Omit<Props, "group" | "locked" | "busy" | "onAddEntry">;
}) {
  return (
    <>
      <tr className="border-t border-border first:border-t-0 transition-colors hover:bg-accent/30">
        <td className="py-3 pl-5 pr-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground disabled:cursor-default"
            disabled={!hasEntries}
          >
            {hasEntries ? (
              collapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
            {concept.name}
          </button>

          {concept.budgetLimit != null && (
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                concept.isOverBudget
                  ? "bg-negative-soft text-negative"
                  : "bg-secondary text-muted-foreground"
              }`}
              title="Presupuesto del mes"
            >
              {money(concept.actualTotal)} / {money(concept.budgetLimit)}
            </span>
          )}
        </td>

        <td />
        <td />

        <td className="px-3 py-3 text-right text-sm tabular-nums text-muted-foreground">
          {money(concept.forecastTotal)}
        </td>
        <td className="px-3 py-3 text-right text-sm font-medium tabular-nums">
          {money(concept.actualTotal)}
        </td>
        <td className="px-3 py-3 text-right text-sm tabular-nums text-muted-foreground">
          {money(concept.remainingTotal)}
        </td>

        <td className="px-3 py-3 text-right">
          <Button
            variant="ghost"
            size="icon"
            title="Añadir apunte"
            disabled={locked || busy}
            onClick={onAddEntry}
          >
            <Plus />
          </Button>
        </td>
      </tr>

      {!collapsed &&
        concept.entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} locked={locked} busy={busy} {...rowHandlers} />
        ))}
    </>
  );
}
