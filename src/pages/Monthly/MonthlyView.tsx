import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Landmark,
  Loader2,
  Lock,
  Unlock,
  Save,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { MonthWorkspaceTabs } from "../../components/Monthly/MonthWorkspaceTabs";
import { PeriodStatusBadge } from "../../components/Monthly/PeriodStatusBadge";
import { reconciliationService } from "../../services/reconciliationService";
import { LedgerService, ledgerErrorMessage } from "../../services/ledgerService";
import type { Reconciliation } from "../../types/bank";
import {
  EntryStatus,
  PeriodStatus,
  type Account,
  type MonthlyConcept,
  type MonthlyEntry,
  type MonthlySummary,
} from "../../types/ledger";
import { money, monthLabel, nextMonth, previousMonth } from "../../utils/civilDate";

type CategoryTotal = {
  id: string;
  name: string;
  actual: number;
  pending: number;
};

type Movement = MonthlyEntry & {
  conceptName: string;
  type: "income" | "expense";
  amount: number;
};

type AccountReconciliation = {
  account: Account;
  calculatedBalance: number;
  bankBalance: string;
  savedBalance: number | null;
};

export function MonthlyView() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState(() => Number(searchParams.get("year")) || now.getFullYear());
  const [month, setMonth] = useState(() => {
    const requested = Number(searchParams.get("month"));
    return requested >= 1 && requested <= 12 ? requested : now.getMonth() + 1;
  });
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [accountReconciliations, setAccountReconciliations] = useState<AccountReconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [changingPeriod, setChangingPeriod] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      LedgerService.getMonth(year, month),
      LedgerService.getAccounts(),
      reconciliationService.getForMonth(year, month).then((response) => response.data),
    ])
      .then(async ([result, accounts, reconciliations]) => {
        const balances = await Promise.all(
          accounts.map((account) => LedgerService.getAccountBalance(account.id, year, month)),
        );
        if (!active) return;

        setSummary(result);
        setAccountReconciliations(accounts.map((account) => {
          const saved = reconciliations.find((item) => item.bankId === account.id);
          const calculated = balances.find((item) => item.accountId === account.id)?.balance ?? 0;
          return {
            account,
            calculatedBalance: calculated,
            bankBalance: saved ? String(saved.closingBalance) : "",
            savedBalance: saved?.closingBalance ?? null,
          };
        }));
      })
      .catch((requestError) => {
        if (active) {
          setSummary(null);
          setAccountReconciliations([]);
          setError(ledgerErrorMessage(requestError, "No se ha podido cargar el resumen mensual."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year, month]);

  const expenseCategories = useMemo(
    () => categoryTotals(summary?.expenseGroups.flatMap((group) => group.concepts) ?? []),
    [summary],
  );
  const incomeCategories = useMemo(
    () => categoryTotals(summary?.incomeGroups.flatMap((group) => group.concepts) ?? []),
    [summary],
  );
  const movements = useMemo(() => getMovements(summary), [summary]);
  const movementCount = movements.length;

  const goTo = (target: { year: number; month: number }) => {
    setYear(target.year);
    setMonth(target.month);
    setSearchParams({ year: String(target.year), month: String(target.month) });
  };

  const isClosed = summary?.status === PeriodStatus.Closed;
  const unreconciledAccounts = accountReconciliations.filter((item) =>
    item.savedBalance === null || Math.abs(item.savedBalance - item.calculatedBalance) > 0.01,
  );

  const closeMonth = async () => {
    const label = monthLabel(year, month);
    const warning = unreconciledAccounts.length === 0
      ? `Todas las cuentas están cuadradas.\n\n¿Cerrar ${label}? No se podrán modificar sus movimientos hasta que lo reabras.`
      : `Atención: estas cuentas no están cuadradas con el banco:\n\n${unreconciledAccounts
          .map((item) => `• ${item.account.name} (${item.savedBalance === null
            ? "sin cuadre guardado"
            : `diferencia ${money(item.savedBalance - item.calculatedBalance)}`})`)
          .join("\n")}\n\n¿Cerrar ${label} igualmente? Podrás reabrirlo después.`;
    if (!window.confirm(warning)) return;

    setChangingPeriod(true);
    setError(null);
    try {
      setSummary(await LedgerService.closeMonth(year, month, null));
    } catch (requestError) {
      setError(ledgerErrorMessage(requestError, "No se ha podido cerrar el mes."));
    } finally {
      setChangingPeriod(false);
    }
  };

  const reopenMonth = async () => {
    if (!window.confirm(`¿Reabrir ${monthLabel(year, month)} para poder modificar sus movimientos?`)) return;

    setChangingPeriod(true);
    setError(null);
    try {
      setSummary(await LedgerService.reopenMonth(year, month));
    } catch (requestError) {
      setError(ledgerErrorMessage(requestError, "No se ha podido reabrir el mes."));
    } finally {
      setChangingPeriod(false);
    }
  };

  const saveReconciliation = async (item: AccountReconciliation) => {
    const bankBalance = Number(item.bankBalance.replace(",", "."));
    if (!Number.isFinite(bankBalance)) {
      setError("Introduce un saldo bancario válido.");
      return;
    }

    setSavingAccountId(item.account.id);
    setError(null);
    try {
      const response = await reconciliationService.create({
        bankId: item.account.id,
        year,
        month,
        closingBalance: bankBalance,
        notes: "Conciliación desde Resumen mensual",
      });
      const saved = (response.data ?? response) as Reconciliation;
      setAccountReconciliations((current) => current.map((entry) =>
        entry.account.id === item.account.id
          ? { ...entry, bankBalance: String(saved.closingBalance), savedBalance: saved.closingBalance }
          : entry,
      ));
    } catch (requestError) {
      setError(ledgerErrorMessage(requestError, "No se ha podido guardar el saldo bancario."));
    } finally {
      setSavingAccountId(null);
    }
  };

  return (
    <div className="space-y-6">
      <MonthWorkspaceTabs year={year} month={month} />

      <PageHeader
        title="Resumen y cuadre"
        description="Comprueba qué ocurrió realmente y cuadra cada cuenta con su banco."
        actions={
          <div className="flex flex-wrap items-center gap-2">
          {summary && (
            <PeriodStatusBadge status={isClosed ? "closed" : "open"} />
          )}
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <Button variant="ghost" size="icon" onClick={() => goTo(previousMonth(year, month))} disabled={loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-semibold capitalize">{monthLabel(year, month)}</span>
            <Button variant="ghost" size="icon" onClick={() => goTo(nextMonth(year, month))} disabled={loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goTo({ year: now.getFullYear(), month: now.getMonth() + 1 })}
              disabled={loading}
            >
              Hoy
            </Button>
          </div>
          </div>
        }
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando resumen…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-negative/25 bg-negative-soft p-4 text-sm text-negative">{error}</div>
      )}

      {!loading && summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Ingresos reales" value={summary.totals.incomeActual} icon={<ArrowUpCircle />} tone="positive" />
            <SummaryCard label="Gastos reales" value={summary.totals.expenseActual} icon={<ArrowDownCircle />} tone="negative" />
            <SummaryCard label="Saldo real" value={summary.totals.actualBalance} icon={<Wallet />} />
            <SummaryCard
              label="Pendiente"
              value={summary.totals.pendingIncome - summary.totals.pendingExpense}
              icon={<Clock3 />}
              hint={`${money(summary.totals.pendingIncome)} por cobrar · ${money(summary.totals.pendingExpense)} por pagar`}
            />
            <SummaryCard label="Saldo proyectado" value={summary.totals.projectedBalance} icon={<Wallet />} emphasis />
          </div>

          <AccountReconciliationPanel
            items={accountReconciliations}
            savingAccountId={savingAccountId}
            onChange={(accountId, value) => setAccountReconciliations((current) =>
              current.map((item) => item.account.id === accountId ? { ...item, bankBalance: value } : item),
            )}
            onSave={(item) => void saveReconciliation(item)}
          />

          <Card className={isClosed ? "border-positive/40 bg-positive-soft/30" : undefined}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  {isClosed ? <Lock className="h-4 w-4 text-positive" /> : <Unlock className="h-4 w-4 text-warning" />}
                  {isClosed ? "Mes cerrado y saldado" : "Cierre del mes"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isClosed
                    ? "Sus movimientos están bloqueados y su saldo final pasa al mes siguiente. Reábrelo si necesitas corregir algo."
                    : unreconciledAccounts.length === 0
                      ? "Todas las cuentas están cuadradas: ya puedes cerrar el mes."
                      : `Faltan por cuadrar: ${unreconciledAccounts.map((item) => item.account.name).join(", ")}. Puedes cerrar igualmente.`}
                </p>
              </div>
              {isClosed ? (
                <Button variant="outline" onClick={() => void reopenMonth()} disabled={changingPeriod}>
                  {changingPeriod ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                  Reabrir mes
                </Button>
              ) : (
                <Button onClick={() => void closeMonth()} disabled={changingPeriod}>
                  {changingPeriod ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Cerrar mes
                </Button>
              )}
            </CardContent>
          </Card>

          {movementCount === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="font-medium">No hay movimientos en {monthLabel(year, month)}.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usa las flechas para consultar otro mes o importa un extracto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <CategoryBreakdown title="Gastos por categoría" categories={expenseCategories} tone="negative" />
                <CategoryBreakdown title="Ingresos por categoría" categories={incomeCategories} tone="positive" />
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="border-b p-5">
                    <h2 className="font-semibold">Principales movimientos</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{movementCount} movimientos durante el mes</p>
                  </div>
                  <div className="divide-y">
                    {movements.slice(0, 12).map((movement) => (
                      <div key={movement.id} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{movement.description || movement.conceptName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {movement.dueDate} · {movement.conceptName}
                            {movement.status !== EntryStatus.Paid ? " · pendiente" : ""}
                          </p>
                        </div>
                        <span className={`shrink-0 text-sm font-semibold tabular-nums ${
                          movement.type === "income" ? "text-positive" : "text-negative"
                        }`}>
                          {movement.type === "income" ? "+" : "-"}{money(movement.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AccountReconciliationPanel({
  items,
  savingAccountId,
  onChange,
  onSave,
}: {
  items: AccountReconciliation[];
  savingAccountId: string | null;
  onChange: (accountId: string, value: string) => void;
  onSave: (item: AccountReconciliation) => void;
}) {
  const reconciledCount = items.filter((item) => {
    const enteredBalance = Number(item.bankBalance.replace(",", "."));
    return item.bankBalance.trim() !== ""
      && Number.isFinite(enteredBalance)
      && Math.abs(enteredBalance - item.calculatedBalance) <= 0.01;
  }).length;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Cuadre por cuenta</h2>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {reconciledCount} de {items.length} cuentas cuadradas
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada cuenta se comprueba por separado. El total del Dashboard no se usa para decidir si una cuenta cuadra.
          </p>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg bg-muted/60 p-3"><strong>1.</strong> Importa los movimientos de la cuenta.</div>
            <div className="rounded-lg bg-muted/60 p-3"><strong>2.</strong> Copia su saldo actual del banco.</div>
            <div className="rounded-lg bg-muted/60 p-3"><strong>3.</strong> Guarda cuando la diferencia sea 0,00 €.</div>
          </div>
        </div>
        <div className="divide-y">
          {items.map((item) => {
            const enteredBalance = Number(item.bankBalance.replace(",", "."));
            const hasBalance = item.bankBalance.trim() !== "" && Number.isFinite(enteredBalance);
            const difference = hasBalance ? enteredBalance - item.calculatedBalance : null;
            const reconciled = difference !== null && Math.abs(difference) <= 0.01;

            return (
              <div
                key={item.account.id}
                className={`grid gap-4 p-5 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center ${
                  reconciled ? "bg-positive-soft/40" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.account.entity || "Cuenta bancaria"}
                  </p>
                  <p className="mt-1 text-sm">
                    Saldo calculado por la app: <strong>{money(item.calculatedBalance)}</strong>
                  </p>
                </div>
                <div className="w-full lg:w-44">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Saldo que muestra el banco
                  </label>
                  <Input
                    inputMode="decimal"
                    aria-label={`Saldo bancario de ${item.account.name}`}
                    placeholder="Saldo en esa fecha"
                    value={item.bankBalance}
                    onChange={(event) => onChange(item.account.id, event.target.value)}
                  />
                </div>
                <div className="min-w-40">
                  {!hasBalance ? (
                    <span className="text-sm text-muted-foreground">Pendiente de comprobar</span>
                  ) : reconciled ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-positive">
                      <CheckCircle2 className="h-4 w-4" /> Cuadrado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-negative">
                      <AlertTriangle className="h-4 w-4" /> Diferencia {money(difference)}
                    </span>
                  )}
                  {item.savedBalance !== null && (
                    <p className="mt-1 text-xs text-muted-foreground">Último saldo guardado: {money(item.savedBalance)}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => onSave(item)}
                  disabled={!hasBalance || !reconciled || savingAccountId === item.account.id}
                  title={!reconciled ? "El saldo debe coincidir antes de guardar el cuadre" : undefined}
                >
                  {savingAccountId === item.account.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />}
                  Guardar cuadre
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function categoryTotals(concepts: MonthlyConcept[]): CategoryTotal[] {
  return concepts
    .map((concept) => ({
      id: concept.conceptId,
      name: concept.name,
      actual: concept.actualTotal,
      pending: Math.max(0, concept.remainingTotal),
    }))
    .filter((category) => category.actual !== 0 || category.pending !== 0)
    .sort((left, right) => right.actual + right.pending - (left.actual + left.pending));
}

function getMovements(summary: MonthlySummary | null): Movement[] {
  if (!summary) return [];

  const flatten = (concepts: MonthlyConcept[], type: Movement["type"]) =>
    concepts.flatMap((concept) =>
      concept.entries
        .filter((entry) => entry.status !== EntryStatus.Skipped)
        .map((entry) => ({
          ...entry,
          conceptName: concept.name,
          type,
          amount: entry.status === EntryStatus.Paid
            ? entry.actualAmount ?? entry.forecastAmount
            : entry.forecastAmount,
        })),
    );

  return [
    ...flatten(summary.incomeGroups.flatMap((group) => group.concepts), "income"),
    ...flatten(summary.expenseGroups.flatMap((group) => group.concepts), "expense"),
  ].sort((left, right) => right.amount - left.amount);
}

function SummaryCard({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
  emphasis = false,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
  emphasis?: boolean;
}) {
  const color = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <Card className={emphasis ? "border-primary/25 bg-primary/[0.04]" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          {label}
        </div>
        <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{money(value)}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function CategoryBreakdown({
  title,
  categories,
  tone,
}: {
  title: string;
  categories: CategoryTotal[];
  tone: "positive" | "negative";
}) {
  const total = categories.reduce((sum, category) => sum + category.actual + category.pending, 0);

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-semibold">{title}</h2>
        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sin movimientos en este grupo.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {categories.map((category) => {
              const amount = category.actual + category.pending;
              const percentage = total === 0 ? 0 : (amount / total) * 100;
              return (
                <div key={category.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{category.name}</span>
                    <span className={`shrink-0 tabular-nums ${tone === "positive" ? "text-positive" : "text-negative"}`}>
                      {money(amount)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${tone === "positive" ? "bg-positive" : "bg-negative"}`}
                      style={{ width: `${Math.max(2, percentage)}%` }}
                    />
                  </div>
                  {category.pending > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">{money(category.pending)} pendientes</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
