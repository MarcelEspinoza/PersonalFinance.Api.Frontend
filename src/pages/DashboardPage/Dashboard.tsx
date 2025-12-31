// pages/Dashboard/Dashboard.tsx
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PlanSavingsForm } from "../../components/Savings/PlanSavingsForm";
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
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-b-2 border-emerald-600 rounded-full" />
      </div>
    );
  }

  const currentMonth = monthlyData.find((m) => m.isCurrent);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Dashboard financiero
          </h1>
          <p className="text-slate-600">
            Situación actual y proyección a 6 meses
          </p>
        </div>

        <button
          onClick={() => setShowDrawer(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
        >
          <PiggyBank className="w-5 h-5" />
          Planificar ahorro
        </button>
      </div>

      {/* ALERTAS */}
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

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <SummaryCard title="Ingresos" value={summary.totalIncome} icon={<ArrowUpCircle />} />
        <SummaryCard title="Gastos" value={summary.totalExpense} icon={<ArrowDownCircle />} />
        <SummaryCard title="Balance" value={summary.balance} icon={<Wallet />} />
        <SummaryCard title="Ahorro real" value={summary.savings} icon={<PiggyBank />} />
        <SummaryCard title="Ahorro proyectado" value={summary.projectedSavings} icon={<PiggyBank />} />
        <SummaryCard title="Balance planificado" value={summary.plannedBalance} icon={<Wallet />} />
      </div>

      {/* MES ACTUAL */}
      {currentMonth && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Mes actual
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <MiniStat label="Ingresos" value={currentMonth.income} />
            <MiniStat label="Gastos" value={currentMonth.expense} />
            <MiniStat label="Balance" value={currentMonth.balance} />
            <MiniStat label="Ahorro" value={currentMonth.savings} />
            <MiniStat
              label="Planificado"
              value={currentMonth.plannedBalance ?? 0}
            />
          </div>
        </div>
      )}

      {/* DRAWER */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-xl">
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
    Budget: {
      bg: "bg-yellow-50",
      border: "border-yellow-400",
      text: "text-yellow-700",
    },
    Commitment: {
      bg: "bg-orange-50",
      border: "border-orange-400",
      text: "text-orange-700",
    },
    Balance: {
      bg: "bg-rose-50",
      border: "border-rose-400",
      text: "text-rose-700",
    },
  }[type];

  return (
    <div
      className={`flex items-center justify-between border-l-4 p-4 rounded-md ${styles.bg} ${styles.border}`}
    >
      <div className={`flex items-center gap-2 text-sm font-medium ${styles.text}`}>
        <AlertTriangle className="w-4 h-4" />
        {message}
      </div>
      {action && (
        <a
          href={action}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
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
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <span>{title}</span>
      </div>
      <div className="text-2xl font-bold mt-2">
        {value.toFixed(2)} €
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold">{value.toFixed(2)} €</div>
    </div>
  );
}
