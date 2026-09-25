import type { MonthlySummary } from "../../types/ledger";
import { money } from "../../utils/civilDate";

type Tone = "neutral" | "positive" | "negative";

function Card({
  label,
  value,
  hint,
  tone = "neutral",
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  emphasis?: boolean;
}) {
  const toneClass =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        emphasis ? "border-foreground/15 bg-secondary" : "bg-card"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums tracking-tight ${toneClass}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TotalsPanel({ summary }: { summary: MonthlySummary }) {
  const t = summary.totals;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card
        label="Arrastre"
        value={money(summary.carryOverAmount)}
        hint="Cierre del mes anterior"
        tone={summary.carryOverAmount < 0 ? "negative" : "neutral"}
      />
      <Card
        label="Ingresos"
        value={money(t.incomeActual)}
        hint={`Previsto ${money(t.incomeForecast)}`}
        tone="positive"
      />
      <Card
        label="Gastos"
        value={money(t.expenseActual)}
        hint={`Previsto ${money(t.expenseForecast)}`}
        tone="negative"
      />
      <Card
        label="Saldo real"
        value={money(t.actualBalance)}
        hint="Arrastre + lo confirmado"
        tone={t.actualBalance < 0 ? "negative" : "neutral"}
        emphasis
      />
      <Card
        label="Saldo proyectado"
        value={money(t.projectedBalance)}
        hint={`Quedan ${money(t.pendingExpense)} por pagar`}
        tone={t.projectedBalance < 0 ? "negative" : "neutral"}
      />
    </div>
  );
}
