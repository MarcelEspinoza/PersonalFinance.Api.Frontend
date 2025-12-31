// pages/Dashboard/Dashboard.tsx
import {
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlanSavingsForm } from '../../components/Savings/PlanSavingsForm';
import { useAuth } from '../../contexts/AuthContext';
import { budgetService } from '../../services/budgetService';
import { commitmentService } from '../../services/commitmentService';
import { MonthlyData, Summary, getDashboardProjection } from '../../services/dashboardService';

// ================= TYPES =================

type CommitmentStatus = {
  commitmentId: string;
  name: string;
  expectedAmount: number;
  actualAmount: number;
  isSatisfied: boolean;
  isOutOfRange: boolean;
};

type BudgetStatus = {
  budgetId: string;
  categoryName: string;
  monthlyLimit: number;
  spentAmount: number;
  remainingAmount: number;
  isExceeded: boolean;
  isNearLimit: boolean;
};

// ================= COMPONENT =================

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

  const [commitments, setCommitments] = useState<CommitmentStatus[]>([]);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);

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

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [commitmentsRes, budgetsRes] = await Promise.all([
        commitmentService.getMonthlyStatus(year, month),
        budgetService.getMonthlyStatus(year, month),
      ]);

      setCommitments(commitmentsRes.data);
      setBudgets(budgetsRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = () => setShowDrawer(true);
  const closeDrawer = () => setShowDrawer(false);

  const handlePlanSaved = async () => {
    closeDrawer();
    await loadFinancialData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const currentMonth = monthlyData.find((m) => m.isCurrent);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard Financiero</h1>
          <p className="text-slate-600 mt-1">
            Situación actual y proyección futura
          </p>
        </div>

        <button
          onClick={openDrawer}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
        >
          <PiggyBank className="w-5 h-5" />
          Planificar ahorro
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <SummaryCard title="Total Ingresos" value={summary.totalIncome} icon={<ArrowUpCircle className="w-6 h-6 text-green-600" />} bgColor="bg-green-100" textColor="text-green-600" />
        <SummaryCard title="Total Gastos" value={summary.totalExpense} icon={<ArrowDownCircle className="w-6 h-6 text-red-600" />} bgColor="bg-red-100" textColor="text-red-600" />
        <SummaryCard title="Balance Total" value={summary.balance} icon={<Wallet className="w-6 h-6 text-blue-600" />} bgColor="bg-blue-100" textColor={summary.balance >= 0 ? 'text-green-600' : 'text-red-600'} />
        <SummaryCard title="Ahorro real" value={summary.savings} icon={<PiggyBank className="w-6 h-6 text-emerald-600" />} bgColor="bg-emerald-100" textColor="text-emerald-600" />
        <SummaryCard title="Ahorro proyectado" value={summary.projectedSavings} icon={<PiggyBank className="w-6 h-6 text-yellow-600" />} bgColor="bg-yellow-100" textColor="text-yellow-600" />
        <SummaryCard title="Balance planificado" value={summary.plannedBalance} icon={<Wallet className="w-6 h-6 text-purple-600" />} bgColor="bg-purple-100" textColor={summary.plannedBalance >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      {/* COMPROMISOS + PRESUPUESTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compromisos */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-bold mb-4">Compromisos del mes</h2>
          <ul className="space-y-2 text-sm">
            {commitments.map(c => (
              <li key={c.commitmentId} className="flex justify-between">
                <span>{c.name}</span>
                <span className={
                  c.isSatisfied
                    ? 'text-green-600'
                    : c.isOutOfRange
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }>
                  {c.actualAmount.toFixed(2)} € / {c.expectedAmount.toFixed(2)} €
                </span>
              </li>
            ))}
            {!commitments.length && (
              <li className="text-slate-400">No hay compromisos configurados</li>
            )}
          </ul>
        </div>

        {/* Presupuestos */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-bold mb-4">Presupuestos del mes</h2>
          <ul className="space-y-2 text-sm">
            {budgets.map(b => (
              <li key={b.budgetId} className="flex justify-between">
                <span>{b.categoryName}</span>
                <span className={
                  b.isExceeded
                    ? 'text-red-600'
                    : b.isNearLimit
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }>
                  {b.spentAmount.toFixed(2)} € / {b.monthlyLimit.toFixed(2)} €
                </span>
              </li>
            ))}
            {!budgets.length && (
              <li className="text-slate-400">No hay presupuestos configurados</li>
            )}
          </ul>
        </div>
      </div>

      {/* DRAWER AHORRO */}
      {showDrawer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-xl z-50">
            <div className="p-4 border-b flex justify-between">
              <h3 className="font-semibold">Planificar ahorro</h3>
              <button onClick={closeDrawer}>✕</button>
            </div>
            <div className="p-4">
              <PlanSavingsForm onSuccess={handlePlanSaved} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ================= HELPER =================

function SummaryCard({
  title,
  value,
  icon,
  bgColor,
  textColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between mb-3">
        <div className={`${bgColor} p-3 rounded-lg`}>{icon}</div>
      </div>
      <p className="text-sm text-slate-600">{title}</p>
      <p className={`text-2xl font-bold ${textColor}`}>
        {value.toFixed(2)} €
      </p>
    </div>
  );
}
