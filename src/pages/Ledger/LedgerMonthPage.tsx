import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { MonthNavigator } from "../../components/Ledger/MonthNavigator";
import { TotalsPanel } from "../../components/Ledger/TotalsPanel";
import { GroupSection } from "../../components/Ledger/GroupSection";
import { LedgerColumnsHeader } from "../../components/Ledger/ledgerColumns";
import { EntryDialog, type EntryFormValues } from "../../components/Ledger/EntryDialog";
import {
  ConfirmEntryDialog,
  type ConfirmFormValues,
} from "../../components/Ledger/ConfirmEntryDialog";
import { CloseMonthDialog } from "../../components/Ledger/CloseMonthDialog";
import { AssignEntryDialog } from "../../components/Ledger/AssignEntryDialog";
import { RenameConceptDialog } from "../../components/Ledger/RenameConceptDialog";
import { MonthWorkspaceTabs } from "../../components/Monthly/MonthWorkspaceTabs";
import { LedgerService, ledgerErrorMessage } from "../../services/ledgerService";
import {
  ConceptKind,
  EntryDirection,
  PeriodStatus,
  type MonthlyConcept,
  type MonthlyEntry,
  type MonthlyGroup,
  type MonthlySummary,
} from "../../types/ledger";
import { nextMonth, previousMonth } from "../../utils/civilDate";

interface EntryDialogState {
  open: boolean;
  mode: "create" | "edit";
  concept: MonthlyConcept | null;
  direction: EntryDirection;
  entry: MonthlyEntry | null;
}

const CLOSED_ENTRY_DIALOG: EntryDialogState = {
  open: false,
  mode: "create",
  concept: null,
  direction: EntryDirection.Out,
  entry: null,
};

export function LedgerMonthPage() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState(() => Number(searchParams.get("year")) || now.getFullYear());
  const [month, setMonth] = useState(() => {
    const requested = Number(searchParams.get("month"));
    return requested >= 1 && requested <= 12 ? requested : now.getMonth() + 1;
  });

  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [entryDialog, setEntryDialog] = useState<EntryDialogState>(CLOSED_ENTRY_DIALOG);
  const [confirmTarget, setConfirmTarget] = useState<MonthlyEntry | null>(null);
  const [assignTarget, setAssignTarget] = useState<MonthlyEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<MonthlyConcept | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  /** Groups folded down to their header, by groupId (all expanded by default). */
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  /**
   * `background` refreshes (after an action) keep the current month on screen instead of the
   * loading state, so the list isn't unmounted and the scroll position isn't lost.
   */
  const load = useCallback(async (targetYear: number, targetMonth: number, background = false) => {
    if (!background) setLoading(true);
    setPageError(null);

    try {
      setSummary(await LedgerService.getMonth(targetYear, targetMonth));
    } catch (error) {
      setSummary(null);
      setPageError(ledgerErrorMessage(error, "No se ha podido cargar el mes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year, month);
  }, [load, year, month]);

  /**
   * Toda mutación recarga el mes: los totales, el arrastre y el estado de los
   * asientos los calcula el backend, así que reconstruirlos aquí sólo
   * serviría para que las dos versiones se separasen.
   */
  const mutate = async (action: () => Promise<unknown>, onDone?: () => void) => {
    setBusy(true);
    setDialogError(null);

    try {
      await action();
      await load(year, month, true);
      onDone?.();
    } catch (error) {
      const message = ledgerErrorMessage(error, "No se ha podido completar la operación.");
      setDialogError(message);

      if (!onDone) setPageError(message);
    } finally {
      setBusy(false);
    }
  };

  const goTo = (target: { year: number; month: number }) => {
    setYear(target.year);
    setMonth(target.month);
    setSearchParams({ year: String(target.year), month: String(target.month) });
  };

  const handleAddEntry = (concept: MonthlyConcept, group: MonthlyGroup) =>
    setEntryDialog({
      open: true,
      mode: "create",
      concept,
      direction: group.kind === ConceptKind.Income ? EntryDirection.In : EntryDirection.Out,
      entry: null,
    });

  const handleEditEntry = (entry: MonthlyEntry) =>
    setEntryDialog({
      open: true,
      mode: "edit",
      concept: null,
      direction: entry.direction,
      entry,
    });

  const submitEntry = (values: EntryFormValues) => {
    const { mode, concept, direction, entry } = entryDialog;
    const description = values.description === "" ? null : values.description;

    if (mode === "create") {
      if (!concept) return;

      void mutate(
        () =>
          LedgerService.createEntry({
            conceptId: concept.conceptId,
            direction,
            dueDate: values.dueDate,
            forecastAmount: values.forecastAmount,
            description,
            notes: values.notes ? values.notes : null,
          }),
        () => setEntryDialog(CLOSED_ENTRY_DIALOG),
      );
      return;
    }

    if (!entry) return;

    void mutate(
      () =>
        LedgerService.updateEntry(entry.id, {
          dueDate: values.dueDate,
          forecastAmount: values.forecastAmount,
          description,
          ...(values.notes !== undefined ? { notes: values.notes } : {}),
        }),
      () => setEntryDialog(CLOSED_ENTRY_DIALOG),
    );
  };

  const submitConfirm = (values: ConfirmFormValues) => {
    if (!confirmTarget) return;

    void mutate(
      () =>
        LedgerService.confirmEntry(confirmTarget.id, {
          actualAmount: values.actualAmount,
          valueDate: values.valueDate || null,
        }),
      () => setConfirmTarget(null),
    );
  };

  const handleDelete = (entry: MonthlyEntry) => {
    if (!window.confirm("¿Borrar este apunte? No se puede deshacer.")) return;
    void mutate(() => LedgerService.deleteEntry(entry.id));
  };

  const handleSeed = () =>
    mutate(() => LedgerService.seedChartOfAccounts(year, month));

  const locked = summary?.status === PeriodStatus.Closed;
  const groups = summary ? [...summary.incomeGroups, ...summary.expenseGroups] : [];
  const isEmpty = summary !== null && groups.length === 0;
  const allGroupsCollapsed = groups.length > 0 && groups.every((group) => collapsedGroups[group.groupId]);

  const toggleGroup = (groupId: string) =>
    setCollapsedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));

  const toggleAllGroups = () =>
    setCollapsedGroups(
      allGroupsCollapsed ? {} : Object.fromEntries(groups.map((group) => [group.groupId, true])),
    );

  const rowHandlers = {
    onConfirm: setConfirmTarget,
    onUnconfirm: (entry: MonthlyEntry) => void mutate(() => LedgerService.unconfirmEntry(entry.id)),
    onSkip: (entry: MonthlyEntry) => void mutate(() => LedgerService.skipEntry(entry.id)),
    onUnskip: (entry: MonthlyEntry) => void mutate(() => LedgerService.unskipEntry(entry.id)),
    onEdit: handleEditEntry,
    onDelete: handleDelete,
    onAssign: setAssignTarget,
  };

  return (
    <div className="space-y-4">
      <MonthWorkspaceTabs year={year} month={month} />

      <MonthNavigator
        year={year}
        month={month}
        status={summary?.status ?? null}
        busy={busy || loading}
        onPrevious={() => goTo(previousMonth(year, month))}
        onNext={() => goTo(nextMonth(year, month))}
        onToday={() => goTo({ year: now.getFullYear(), month: now.getMonth() + 1 })}
        onClose={() => {
          setDialogError(null);
          setCloseDialogOpen(true);
        }}
        onReopen={() => void mutate(() => LedgerService.reopenMonth(year, month))}
      />

      {pageError && (
        <div className="flex items-start gap-3 rounded-xl border border-negative/25 bg-negative-soft p-4 text-sm text-negative">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando mes…
        </div>
      )}

      {!loading && isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center shadow-sm">
          <Sparkles className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
          <h2 className="text-base font-semibold tracking-tight">Aún no hay plan de cuentas</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Crea una estructura personal clara para hogar, alimentación, salud, transporte,
            ocio, compromisos, ingresos y ahorro.
          </p>
          <Button className="mt-5" onClick={() => void handleSeed()} disabled={busy}>
            {busy ? "Creando…" : "Crear plan de cuentas"}
          </Button>
        </div>
      )}

      {!loading && summary && !isEmpty && (
        <>
          <TotalsPanel summary={summary} />

          <div>
            <LedgerColumnsHeader allCollapsed={allGroupsCollapsed} onToggleAll={toggleAllGroups} />

            {groups.map((group) => (
              <GroupSection
                key={group.groupId}
                group={group}
                locked={locked ?? false}
                busy={busy}
                collapsed={collapsedGroups[group.groupId] ?? false}
                onToggleCollapsed={() => toggleGroup(group.groupId)}
                onAddEntry={handleAddEntry}
                onRenameConcept={(concept) => {
                  setDialogError(null);
                  setRenameTarget(concept);
                }}
                {...rowHandlers}
              />
            ))}
          </div>
        </>
      )}

      <RenameConceptDialog
        open={renameTarget !== null}
        currentName={renameTarget?.name ?? ""}
        busy={busy}
        error={dialogError}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSubmit={(name) => {
          if (!renameTarget) return;
          void mutate(
            () => LedgerService.renameConcept(renameTarget.conceptId, name),
            () => setRenameTarget(null),
          );
        }}
      />

      <EntryDialog
        open={entryDialog.open}
        mode={entryDialog.mode}
        conceptName={entryDialog.concept?.name ?? entryDialog.entry?.description ?? ""}
        entry={entryDialog.entry}
        year={year}
        month={month}
        busy={busy}
        error={dialogError}
        onOpenChange={(open) => {
          if (!open) setEntryDialog(CLOSED_ENTRY_DIALOG);
        }}
        onSubmit={submitEntry}
      />

      <ConfirmEntryDialog
        open={confirmTarget !== null}
        entry={confirmTarget}
        busy={busy}
        error={dialogError}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        onSubmit={submitConfirm}
      />

      <CloseMonthDialog
        open={closeDialogOpen}
        year={year}
        month={month}
        computedBalance={summary?.totals.actualBalance ?? 0}
        busy={busy}
        error={dialogError}
        onOpenChange={setCloseDialogOpen}
        onSubmit={(declared) =>
          void mutate(
            () => LedgerService.closeMonth(year, month, declared),
            () => setCloseDialogOpen(false),
          )
        }
      />

      {assignTarget && (
        <AssignEntryDialog
          entryId={assignTarget.id}
          entryDescription={assignTarget.description ?? "Movimiento"}
          entryAmount={assignTarget.actualAmount ?? assignTarget.forecastAmount}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
