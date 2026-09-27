// pages/Dashboard/Dashboard.tsx
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Loader2,
  Landmark,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import {
  type DashboardAccount,
  type MonthlyData,
  type Summary,
  getDashboardProjection,
} from "../../services/dashboardService";
import type { DashboardAlerts } from "../../types/DashboardAlerts";
import { money } from "../../utils/civilDate";

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summary, setSummary] = useState<Summary>({
    currentBalance: 0,
    monthOpeningBalance: 0,
    currentMonthIncome: 0,
    currentMonthExpense: 0,
    currentMonthResult: 0,
  });
  const [accounts, setAccounts] = useState<DashboardAccount[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);

  useEffect(() => {
    if (user) loadFinancialData();
  }, [user]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getDashboardProjection();
      setMonthlyData(data.monthlyData);
      setSummary(data.summary);
      setAlerts(data.alerts);
      setAccounts(data.accounts);
    } catch (err) {
      console.error("Error loading dashboard", err);
      setError("No se ha podido cargar tu situación financiera.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
      </div>
    );
  }

  const currentMonth = monthlyData.find((m) => m.isCurrent);
  const futureMonths = monthlyData.filter((m) => !m.isCurrent);
  const resultTone = summary.currentMonthResult >= 0 ? "positive" : "negative";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tu situación financiera"
        description="Lo que tienes hoy, cómo va el mes y qué puede pasar en los próximos 6 meses."
      />

      {error && (
        <div className="rounded-xl border border-negative/25 bg-negative-soft p-4 text-sm text-negative">
          {error}
        </div>
      )}

      {alerts && alerts.items.length > 0 && (
        <div className="space-y-3">
          {alerts.items.map((a, i) => (
            <AlertCard
              key={i}
              type={a.type}
              message={a.message}
              action={a.action}
            />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="h-4 w-4 text-primary" />
                  Dinero disponible hoy
                </div>
                <div className="mt-3 text-4xl font-bold tracking-tight">
                  {money(summary.currentBalance)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Saldo calculado con los movimientos liquidados de tus cuentas.
                </p>
              </div>
              <a
                href="/monthly"
                className="rounded-lg border bg-background/70 px-3 py-2 text-sm font-medium hover:bg-background"
              >
                Comprobar cuadre
              </a>
            </div>
            <div className="mt-6 border-t pt-4">
              <MiniStat label="Inicio del mes" value={summary.monthOpeningBalance} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Landmark className="h-4 w-4" />
              Tus cuentas
            </div>
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.accountId} className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-3">
                  <span className="text-sm font-medium">{account.name}</span>
                  <span className={`font-semibold ${account.balance < 0 ? "text-negative" : ""}`}>
                    {money(account.balance)}
                  </span>
                </div>
              ))}
              {accounts.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay cuentas activas.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="h-5 w-5 text-primary" />
          Este mes
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard title="Ingresos cobrados" value={summary.currentMonthIncome} icon={<ArrowUpCircle />} tone="positive" />
          <SummaryCard title="Gastos pagados" value={summary.currentMonthExpense} icon={<ArrowDownCircle />} tone="negative" />
          <SummaryCard
            title="Resultado del mes"
            value={summary.currentMonthResult}
            icon={<Wallet />}
            tone={resultTone}
            help="Ingresos menos gastos. No es el saldo de tu banco."
          />
        </div>
        {currentMonth && (currentMonth.pendingIncome > 0 || currentMonth.pendingExpense > 0) && (
          <p className="mt-3 text-sm text-muted-foreground">
            Pendiente este mes: {money(currentMonth.pendingIncome)} por cobrar y{" "}
            {money(currentMonth.pendingExpense)} por pagar.
          </p>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-5">
            <div>
              <h2 className="text-lg font-semibold">Ingresos y gastos previstos</h2>
              <p className="text-sm text-muted-foreground">
                Basado únicamente en los gastos fijos y límites variables que configures.
              </p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="month" tickFormatter={(value) => String(value).split(" ")[0].slice(0, 3)} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value))} €`} width={72} />
                <Tooltip formatter={(value) => money(Number(value ?? 0))} />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Próximos 6 meses</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {futureMonths.map((month) => (
            <div key={`${month.year}-${month.monthNumber}`} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold capitalize">{month.month}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{month.projectionSource}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <ProjectionValue label="Entrará" value={month.income} tone="positive" />
                <ProjectionValue label="Saldrá" value={month.expense} tone="negative" />
                <ProjectionValue
                  label="Diferencia"
                  value={month.balance}
                  tone={month.balance >= 0 ? "positive" : "negative"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a href="/monthly" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Ver detalle del mes
        </a>
        <a href="/movements" className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
          Revisar movimientos
        </a>
      </div>
    </div>
  );
}

function ProjectionValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative";
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-semibold ${tone === "negative" ? "text-negative" : "text-positive"}`}>
        {money(value)}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  tone,
  help,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  tone?: "positive" | "negative";
  help?: string;
}) {
  const toneClass = tone === "negative"
    ? "text-negative"
    : tone === "positive"
      ? "text-positive"
      : "";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={toneClass}>{icon}</span>
          <span>{title}</span>
        </div>
        <div className={`mt-2 text-2xl font-semibold tracking-tight ${toneClass}`}>
          {money(value)}
        </div>
        {help && <p className="mt-2 text-xs text-muted-foreground">{help}</p>}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "positive" | "negative";
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-semibold ${
        tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : ""
      }`}>
        {money(value)}
      </div>
    </div>
  );
}

function AlertCard({
  type,
  message,
  action,
}: {
  type: "Budget" | "Commitment" | "Balance";
  message: string;
  action?: string;
}) {
  const styles = {
    Budget: "border-warning bg-warning-soft text-warning",
    Commitment: "border-warning bg-warning-soft text-warning",
    Balance: "border-negative bg-negative-soft text-negative",
  }[type];

  return (
    <div className={`flex items-center justify-between rounded-md border-l-4 p-4 ${styles}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        {message}
      </div>
      {action && (
        <a href={action} className="text-sm font-medium underline-offset-2 hover:underline">
          Ver
        </a>
      )}
    </div>
  );
}
