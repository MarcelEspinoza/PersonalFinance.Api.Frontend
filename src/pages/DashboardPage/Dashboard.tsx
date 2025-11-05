// pages/Dashboard/Dashboard.tsx
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  PiggyBank,
  Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlanSavingsForm } from '../../components/Savings/PlanSavingsForm';
import { useAuth } from '../../contexts/AuthContext';
import { MonthlyData, Summary, getDashboardProjection } from '../../services/dashboardService';

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
    plannedBalance: 0, // 👈 nuevo campo
  });
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
    } catch (error) {
      console.error('Error loading financial data:', error);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const currentMonth = monthlyData.find((m) => m.isCurrent);

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard Financiero</h1>
          <p className="text-slate-600 mt-1">
            Proyección del mes actual y los próximos 6 meses
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

      {/* KPIs globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <SummaryCard
          title="Total Ingresos"
          value={summary.totalIncome}
          icon={<ArrowUpCircle className="w-6 h-6 text-green-600" />}
          bgColor="bg-green-100"
          textColor="text-green-600"
        />
        <SummaryCard
          title="Total Gastos"
          value={summary.totalExpense}
          icon={<ArrowDownCircle className="w-6 h-6 text-red-600" />}
          bgColor="bg-red-100"
          textColor="text-red-600"
        />
        <SummaryCard
          title="Balance Total"
          value={summary.balance}
          icon={<Wallet className="w-6 h-6 text-blue-600" />}
          bgColor="bg-blue-100"
          textColor={summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard
          title="Ahorro real (mes actual)"
          value={summary.savings}
          icon={<PiggyBank className="w-6 h-6 text-emerald-600" />}
          bgColor="bg-emerald-100"
          textColor="text-emerald-600"
        />
        <SummaryCard
          title="Ahorro proyectado (futuro)"
          value={summary.projectedSavings}
          icon={<PiggyBank className="w-6 h-6 text-yellow-600" />}
          bgColor="bg-yellow-100"
          textColor="text-yellow-600"
        />
        <SummaryCard
          title="Balance neto planificado"
          value={summary.plannedBalance}
          icon={<Wallet className="w-6 h-6 text-purple-600" />}
          bgColor="bg-purple-100"
          textColor={summary.plannedBalance >= 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>
      {/* Resumen del mes actual */}
      {currentMonth && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-emerald-700">Resumen del Mes Actual</h2>
            <CalendarDays className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <SummaryCard
              title="Ingresos"
              value={currentMonth.income}
              icon={<ArrowUpCircle className="w-6 h-6 text-green-600" />}
              bgColor="bg-green-100"
              textColor="text-green-600"
            />
            <SummaryCard
              title="Gastos"
              value={currentMonth.expense}
              icon={<ArrowDownCircle className="w-6 h-6 text-red-600" />}
              bgColor="bg-red-100"
              textColor="text-red-600"
            />
            <SummaryCard
              title="Balance"
              value={currentMonth.balance}
              icon={<Wallet className="w-6 h-6 text-blue-600" />}
              bgColor="bg-blue-100"
              textColor={currentMonth.balance >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <SummaryCard
              title="Ahorro real (mes)"
              value={currentMonth.savings}
              icon={<PiggyBank className="w-6 h-6 text-emerald-600" />}
              bgColor="bg-emerald-100"
              textColor="text-emerald-600"
            />
            <SummaryCard
              title="Balance neto planificado"
              value={currentMonth.plannedBalance ?? 0}
              icon={<Wallet className="w-6 h-6 text-purple-600" />}
              bgColor="bg-purple-100"
              textColor={(currentMonth.plannedBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
            />
          </div>
        </div>
      )}

      {/* Evolución mensual */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Evolución Mensual</h2>

        <table className="min-w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-2">Mes</th>
              <th className="px-4 py-2 text-green-600">Ingresos</th>
              <th className="px-4 py-2 text-red-600">Gastos</th>
              <th className="px-4 py-2">Balance</th>
              <th className="px-4 py-2 text-emerald-600">Ahorro real</th>
              <th className="px-4 py-2 text-yellow-600">Ahorro proyectado</th>
              <th className="px-4 py-2 text-purple-600">Balance neto planificado</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((data, index) => {
              const isCurrent = data.isCurrent;
              return (
                <tr
                  key={index}
                  className={`border-t ${
                    isCurrent
                      ? 'bg-emerald-50 font-semibold text-emerald-700'
                      : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-2 capitalize">
                    {isCurrent ? '★ ' : ''}
                    {data.month}
                  </td>
                  <td className="px-4 py-2">{(data.income ?? 0).toFixed(2)} €</td>
                  <td className="px-4 py-2">{(data.expense ?? 0).toFixed(2)} €</td>
                  <td className={`px-4 py-2 ${data.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.balance >= 0 ? '+' : ''}
                    {(data.balance ?? 0).toFixed(2)} €
                  </td>
                  <td className="px-4 py-2">{(data.savings ?? 0).toFixed(2)} €</td>
                  <td className="px-4 py-2">{(data.projectedSavings ?? 0).toFixed(2)} €</td>
                  <td className={`px-4 py-2 ${(data.plannedBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(data.plannedBalance ?? 0).toFixed(2)} €
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 text-xs text-slate-500">
          El ahorro real refleja aportes registrados. El ahorro proyectado proviene de planes temporales o estimaciones. 
          El balance neto planificado muestra cómo quedarías tras apartar ese ahorro.
        </div>
      </div>

      {/* Drawer lateral */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={closeDrawer}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-xl z-50 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Planificar ahorro</h3>
              <button
                onClick={closeDrawer}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Cerrar panel"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <PlanSavingsForm onSuccess={handlePlanSaved} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`${bgColor} p-3 rounded-lg`}>{icon}</div>
      </div>
      <p className="text-sm text-slate-600 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${textColor}`}>
        {(value ?? 0).toFixed(2)} €
      </p>
    </div>
  );
}
