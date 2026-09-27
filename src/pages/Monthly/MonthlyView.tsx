import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { LedgerService, ledgerErrorMessage } from "../../services/ledgerService";
import { EntryStatus, type MonthlyConcept, type MonthlyEntry, type MonthlySummary } from "../../types/ledger";
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

export function MonthlyView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void LedgerService.getMonth(year, month)
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch((requestError) => {
        if (active) {
          setSummary(null);
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
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen mensual"
        description="Qué ha entrado, en qué se ha gastado y cómo termina el mes."
        actions={
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
