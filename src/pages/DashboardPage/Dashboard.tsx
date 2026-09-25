// pages/Dashboard/Dashboard.tsx
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Loader2,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PlanSavingsForm } from "../../components/Savings/PlanSavingsForm";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import {
  MonthlyData,
  Summary,
  getDashboardProjection,
} from "../../services/dashboardService";
import type { DashboardAlerts } from "../../types/DashboardAlerts";

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    savings: 0,
    projectedSavings: 0,
    plannedBalance: 0,
  });
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    if (user) loadFinancialData();
  }, [user]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const { data } = await getDashboardProjection();
      setMonthlyData(data.monthlyData);
      setSummary(data.summary);
      setAlerts(data.alerts);
    } catch (err) {
      console.error("Error loading dashboard", err);
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard financiero"
        description="Situación actual y proyección a 6 meses"
        actions={
          <Button onClick={() => setShowDrawer(true)}>
            <PiggyBank className="h-4 w-4" />
            Planificar ahorro
          </Button>
        }
      />

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="Ingresos" value={summary.totalIncome} icon={<ArrowUpCircle className="h-4 w-4" />} />
        <SummaryCard title="Gastos" value={summary.totalExpense} icon={<ArrowDownCircle className="h-4 w-4" />} />
        <SummaryCard title="Balance" value={summary.balance} icon={<Wallet className="h-4 w-4" />} />
        <SummaryCard title="Ahorro real" value={summary.savings} icon={<PiggyBank className="h-4 w-4" />} />
        <SummaryCard title="Ahorro proyectado" value={summary.projectedSavings} icon={<PiggyBank className="h-4 w-4" />} />
        <SummaryCard title="Balance planificado" value={summary.plannedBalance} icon={<Wallet className="h-4 w-4" />} />
      </div>

      {currentMonth && (
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              Mes actual
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              <MiniStat label="Ingresos" value={currentMonth.income} />
              <MiniStat label="Gastos" value={currentMonth.expense} />
              <MiniStat label="Balance" value={currentMonth.balance} />
              <MiniStat label="Ahorro" value={currentMonth.savings} />
              <MiniStat
                label="Planificado"
                value={currentMonth.plannedBalance ?? 0}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {showDrawer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-full w-[420px] bg-card shadow-xl">
            <PlanSavingsForm onSuccess={loadFinancialData} />
          </div>
        </>
      )}
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

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

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{title}</span>
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">
          {value.toFixed(2)} €
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value.toFixed(2)} €</div>
    </div>
  );
}
