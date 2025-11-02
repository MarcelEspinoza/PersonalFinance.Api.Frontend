import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  PiggyBank,
  Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MonthlyData, Summary, getDashboardProjection } from '../services/dashboardService';

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    savings: 0,
  });

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
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard Financiero</h1>
        <p className="text-slate-600 mt-1">Proyección del mes actual y los próximos 6 meses</p>
      </div>

      {/* === Tarjeta del mes actual === */}
      {currentMonth && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-emerald-700">Resumen del Mes Actual</h2>
            <CalendarDays className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              title="Ahorro Estimado"
              value={typeof currentMonth.balance === 'number' ? currentMonth.balance * 0.2 : 0}
              icon={<PiggyBank className="w-6 h-6 text-emerald-600" />}
              bgColor="bg-emerald-100"
              textColor="text-emerald-600"
            />
          </div>
        </div>
      )}

      {/* === Evolución mensual como tabla === */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Evolución Mensual</h2>

        <table className="min-w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-2">Mes</th>
              <th className="px-4 py-2 text-green-600">Ingresos</th>
              <th className="px-4 py-2 text-red-600">Gastos</th>
              <th className="px-4 py-2">Balance</th>
              <th className="px-4 py-2 text-emerald-600">Ahorro Estimado</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((data, index) => {
              const ahorro = typeof data.balance === 'number' ? data.balance * 0.2 : 0;

              const isCurrent = data.isCurrent;
              return (
                <tr
                  key={index}
                  className={`border-t ${isCurrent ? 'bg-emerald-50 font-semibold text-emerald-700' : 'bg-white'}`}
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
                  <td className="px-4 py-2">{(ahorro ?? 0).toFixed(2)} €</td>
                  <td className="px-4 py-2">{ahorro.toFixed(2)} €</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 text-xs text-slate-500">
          El ahorro estimado se calcula como el 20% del balance mensual.
        </div>
      </div>

    </div>
  );
}

/* === Componentes pequeños reutilizables === */
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
      <p className={`text-2xl font-bold ${textColor}`}>{(value ?? 0).toFixed(2)} €</p>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex-1 relative">
      <div
        className={`absolute inset-0 ${color} rounded transition-all`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center">
      <div className={`w-4 h-4 ${color} rounded mr-2`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}