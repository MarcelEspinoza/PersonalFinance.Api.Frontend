import {
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MonthlyData, Summary, getDashboardData } from '../services/dashboardService';

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
      const data = await getDashboardData();
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

  const maxValue = Math.max(...monthlyData.map((m) => Math.max(m.income, m.expense)), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard Financiero</h1>
        <p className="text-slate-600 mt-1">Resumen de los últimos 6 meses</p>
      </div>

      {/* === Tarjetas de resumen === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Ingresos Totales"
          value={summary.totalIncome}
          icon={<ArrowUpCircle className="w-6 h-6 text-green-600" />}
          bgColor="bg-green-100"
          textColor="text-green-600"
        />
        <SummaryCard
          title="Gastos Totales"
          value={summary.totalExpense}
          icon={<ArrowDownCircle className="w-6 h-6 text-red-600" />}
          bgColor="bg-red-100"
          textColor="text-red-600"
        />
        <SummaryCard
          title="Balance"
          value={summary.balance}
          icon={<Wallet className="w-6 h-6 text-blue-600" />}
          bgColor="bg-blue-100"
          textColor={summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard
          title="Ahorro"
          value={summary.savings}
          icon={<PiggyBank className="w-6 h-6 text-emerald-600" />}
          bgColor="bg-emerald-100"
          textColor="text-emerald-600"
        />
      </div>

      {/* === Evolución mensual === */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Evolución Mensual</h2>

        <div className="space-y-6">
          {monthlyData.map((data, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 capitalize">{data.month}</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">{data.income.toFixed(0)} €</span>
                  </div>
                  <div className="flex items-center">
                    <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                    <span className="text-red-600 font-medium">{data.expense.toFixed(0)} €</span>
                  </div>
                  <span
                    className={`font-bold ${
                      data.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {data.balance.toFixed(0)} €
                  </span>
                </div>
              </div>

              <div className="flex space-x-2 h-10">
                <Bar value={data.income} max={maxValue} color="bg-green-500" />
                <Bar value={data.expense} max={maxValue} color="bg-red-500" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-center space-x-6 text-sm">
          <Legend color="bg-green-500" label="Ingresos" />
          <Legend color="bg-red-500" label="Gastos" />
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
      <p className={`text-2xl font-bold ${textColor}`}>{value.toFixed(2)} €</p>
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
      <div className={`w-4 h-4 ${color} rounded mr-2`}></div>
      <span className="text-slate-600">{label}</span>
    </div>
  );
}
