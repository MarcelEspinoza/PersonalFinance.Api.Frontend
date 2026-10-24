import { AlertTriangle, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "../../lib/utils";
import type { MonthlyData } from "../../services/dashboardService";
import { money } from "../../utils/civilDate";
import { SectionCard } from "./SectionCard";
import { capitalize, joinWithAnd } from "./dashboardUtils";

const axisNumber = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });

type ChartPoint = {
  label: string;
  fullName: string;
  income: number;
  expense: number;
  balance: number;
};

/** The months after the selected one: what comes in, what goes out and the difference. */
export function FutureMonthsChart({ months, title }: { months: MonthlyData[]; title: string }) {
  const data: ChartPoint[] = months.map((month) => ({
    label: capitalize(month.month.split(" ")[0].slice(0, 3)),
    fullName: capitalize(month.month),
    income: month.income,
    expense: month.expense,
    balance: month.balance,
  }));
  const totalIncome = months.reduce((total, month) => total + month.income, 0);
  const totalExpense = months.reduce((total, month) => total + month.expense, 0);
  const totalBalance = months.reduce((total, month) => total + month.balance, 0);
  const shortMonths = months.filter((month) => month.balance < -0.005).map((month) => month.month.split(" ")[0]);
  const isEmpty = months.every((month) => Math.abs(month.income) < 0.005 && Math.abs(month.expense) < 0.005);

  return (
    <SectionCard
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      title={title}
      subtitle="Lo que se espera que entre y salga cada mes, según tus gastos fijos y tus límites de gastos variables."
    >
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay nada planificado para esos meses. Apunta tus ingresos y gastos fijos en{" "}
          <Link to="/settings" className="font-medium text-primary hover:underline">
            Configuración
          </Link>{" "}
          y aquí verás la previsión.
        </p>
      ) : (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) => `${axisNumber.format(Number(value))} €`}
                  width={84}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => money(Number(value ?? 0))}
                  labelFormatter={(label, payload) => {
                    const point = payload?.[0]?.payload as ChartPoint | undefined;
                    return point?.fullName ?? String(label ?? "");
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="income" name="Entra" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" name="Sale" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Diferencia"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
            <Total label="Entra en total" value={totalIncome} className="text-positive" />
            <Total label="Sale en total" value={totalExpense} className="text-orange-600" />
            <Total
              label="Te queda"
              value={totalBalance}
              className={totalBalance < 0 ? "text-negative" : "text-foreground"}
            />
          </dl>

          {shortMonths.length > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                En {joinWithAnd(shortMonths)} sale más dinero del que entra. Prepáralo con tiempo.
              </span>
            </p>
          )}
        </>
      )}
    </SectionCard>
  );
}

function Total({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-base font-semibold tabular-nums sm:text-lg", className)}>
        {money(value)}
      </dd>
    </div>
  );
}
