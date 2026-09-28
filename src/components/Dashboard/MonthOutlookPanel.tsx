import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  PiggyBank,
  Scale,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "../ui/card";
import type { MonthOutlook, OutlookItem } from "../../services/dashboardService";
import { ConceptKind, EntryDirection } from "../../types/ledger";
import { money, shortDate } from "../../utils/civilDate";

type Props = {
  outlook: MonthOutlook;
  monthName: string;
};

export function MonthOutlookPanel({ outlook, monthName }: Props) {
  const accountsAtRisk = outlook.accounts.filter((account) => account.shortfall > 0.01);
  const pendingExpenses = outlook.pendingItems.filter((item) => item.direction === EntryDirection.Out);
  const pendingIncomes = outlook.pendingItems.filter((item) => item.direction === EntryDirection.In);
  const relevantDeviations = outlook.deviations
    .filter((item) => Math.abs(item.deviation) >= 1)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="h-5 w-5 text-primary" />
          Previsión de {monthName}
        </h2>
        <p className="text-sm text-muted-foreground">
          {outlook.isPast
            ? "El mes ya terminó: los saldos son reales y lo que quedó sin pagar aparece como vencido."
            : "Qué falta por cobrar y pagar, cómo terminará cada cuenta y qué deberías mover para no quedarte en negativo."}
        </p>
      </div>

      {!outlook.isPast && (
        <ActionBlock accountsAtRiskCount={accountsAtRisk.length} outlook={outlook} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {outlook.accounts.map((account) => {
          const atRisk = account.shortfall > 0.01;
          return (
            <Card key={account.accountId} className={atRisk ? "border-negative/40" : undefined}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {outlook.isPast ? "Saldo real a fin de mes" : "Saldo previsto a fin de mes"}
                    </p>
                  </div>
                  <span className={`text-xl font-bold tabular-nums ${
                    account.projectedEndBalance < 0 ? "text-negative" : ""
                  }`}>
                    {money(account.projectedEndBalance)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <Stat label={outlook.isCurrent ? "Hoy" : "Partida"} value={account.baseBalance} />
                  <Stat label="Por cobrar" value={account.pendingIncome} tone="positive" />
                  <Stat label="Por pagar" value={account.pendingExpense} tone="negative" />
                </div>
                {atRisk && (
                  <p className="mt-4 flex items-start gap-2 rounded-lg bg-negative-soft p-3 text-sm text-negative">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Se quedará en <strong>{money(account.lowestBalance)}</strong>
                      {account.lowestBalanceDate ? ` el ${shortDate(account.lowestBalanceDate)}` : ""}.
                      Le faltan <strong>{money(account.shortfall)}</strong>.
                    </span>
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  {account.reconciledBalance == null
                    ? "Cuadre del mes pendiente."
                    : account.isReconciled
                      ? "Cuadrada con el banco."
                      : `Cuadre guardado (${money(account.reconciledBalance)}) no coincide con ${money(account.actualBalance)}.`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {outlook.overdueItems.length > 0 && (
        <Card className="border-negative/30">
          <CardContent className="p-0">
            <SectionHeader
              icon={<AlertTriangle className="h-4 w-4 text-negative" />}
              title="Vencidos sin pagar"
              subtitle="Su fecha ya pasó y siguen sin confirmarse. Revisa si ya salieron del banco."
            />
            <ItemList items={outlook.overdueItems} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <SectionHeader
              title={`Pagos pendientes (${pendingExpenses.length})`}
              subtitle={`Total ${money(pendingExpenses.reduce((sum, item) => sum + item.amount, 0))}`}
            />
            {pendingExpenses.length === 0
              ? <Empty text="No queda nada por pagar este mes." />
              : <ItemList items={pendingExpenses} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <SectionHeader
              title={`Cobros pendientes (${pendingIncomes.length})`}
              subtitle={`Total ${money(pendingIncomes.reduce((sum, item) => sum + item.amount, 0))}`}
            />
            {pendingIncomes.length === 0
              ? <Empty text="No queda nada por cobrar este mes." />
              : <ItemList items={pendingIncomes} />}
          </CardContent>
        </Card>
      </div>

      {relevantDeviations.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <SectionHeader
              icon={<Scale className="h-4 w-4 text-primary" />}
              title="Desvío frente a lo planificado"
              subtitle="Lo real más lo pendiente comparado con lo que planificaste."
            />
            <div className="divide-y">
              {relevantDeviations.map((item) => {
                const isExpense = item.kind === ConceptKind.Expense;
                const bad = isExpense ? item.deviation > 0 : item.deviation < 0;
                return (
                  <div key={item.conceptId} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Planificado {money(item.planned)} · real {money(item.actual)}
                        {item.pending > 0 ? ` · pendiente ${money(item.pending)}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 font-semibold tabular-nums ${bad ? "text-negative" : "text-positive"}`}>
                      {item.deviation > 0 ? "+" : ""}{money(item.deviation)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActionBlock({
  outlook,
  accountsAtRiskCount,
}: {
  outlook: MonthOutlook;
  accountsAtRiskCount: number;
}) {
  const { unassigned } = outlook;
  const hasReserves = unassigned.variableExpenseReserve > 0 || unassigned.pendingExpense > 0;

  return (
    <Card className={accountsAtRiskCount > 0 ? "border-negative/40 bg-negative-soft/30" : "border-positive/30 bg-positive-soft/30"}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              {accountsAtRiskCount > 0
                ? <AlertTriangle className="h-5 w-5 text-negative" />
                : <CheckCircle2 className="h-5 w-5 text-positive" />}
              {accountsAtRiskCount > 0
                ? `${accountsAtRiskCount === 1 ? "Una cuenta se quedará" : `${accountsAtRiskCount} cuentas se quedarán`} en negativo`
                : "Todas las cuentas cubren sus pagos"}
            </p>
            {hasReserves && (
              <p className="mt-1 text-sm text-muted-foreground">
                Reserva para gastos variables: {money(unassigned.variableExpenseReserve)}
                {unassigned.pendingExpense > 0 ? ` · pagos sin cuenta asignada: ${money(unassigned.pendingExpense)}` : ""}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-muted-foreground">
              <PiggyBank className="h-4 w-4" /> Dinero libre al terminar el mes
            </p>
            <p className={`text-2xl font-bold tabular-nums ${outlook.freeMoney < 0 ? "text-negative" : "text-positive"}`}>
              {money(outlook.freeMoney)}
            </p>
          </div>
        </div>

        {outlook.suggestedTransfers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Movimientos recomendados</p>
            {outlook.suggestedTransfers.map((transfer, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg bg-card p-3 text-sm shadow-sm">
                <span className="font-medium">{transfer.fromAccountName}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-medium">{transfer.toAccountName}</span>
                <span className="ml-auto font-bold tabular-nums">{money(transfer.amount)}</span>
                {transfer.before && (
                  <span className="w-full text-xs text-muted-foreground">
                    Antes del {shortDate(transfer.before)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {outlook.uncoveredShortfall > 0.01 && (
          <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">
            Aunque muevas dinero entre cuentas, faltan <strong>{money(outlook.uncoveredShortfall)}</strong> en
            algún momento del mes. Necesitas aportar ese dinero, retrasar algún pago o esperar al próximo cobro.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ItemList({ items }: { items: OutlookItem[] }) {
  return (
    <div className="max-h-96 divide-y overflow-y-auto">
      {items.map((item, index) => (
        <div key={`${item.dueDate}-${item.description}-${index}`} className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.description}</p>
            <p className={`text-xs ${item.isOverdue ? "font-medium text-negative" : "text-muted-foreground"}`}>
              {shortDate(item.dueDate)} · {item.accountName ?? "Sin cuenta asignada"}
              {item.isOverdue ? " · vencido" : ""}
              {item.isTransfer ? " · traspaso" : ""}
            </p>
          </div>
          <span className={`shrink-0 text-sm font-semibold tabular-nums ${
            item.direction === EntryDirection.In ? "text-positive" : "text-negative"
          }`}>
            {item.direction === EntryDirection.In ? "+" : "-"}{money(item.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <div className="border-b p-5">
      <h3 className="flex items-center gap-2 font-semibold">{icon}{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="p-5 text-sm text-muted-foreground">{text}</p>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "positive" | "negative" }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-semibold tabular-nums ${
        tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : ""
      }`}>
        {money(value)}
      </div>
    </div>
  );
}
