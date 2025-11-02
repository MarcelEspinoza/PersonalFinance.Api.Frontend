// src/pages/MonthlyView.tsx
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MonthlyService } from '../services/monthlyService';

interface Transaction {
  id: string;
  name: string;
  amount: number;
  date?: string;
  category?: string;
  type: 'income' | 'expense';
  source: 'fixed' | 'variable' | 'temporary';
}

export function MonthlyView() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

  useEffect(() => {
    if (user) loadMonthData();
  }, [user, currentDate]);

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Llamada al backend
      const { data } = await MonthlyService.getMonthData(user!.id, startStr, endStr);

      const allTransactions: Transaction[] = data.transactions || [];

      allTransactions.sort((a, b) => {
        if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });

      setTransactions(allTransactions);

      const totalIncome = allTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setSummary({
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
      });
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 capitalize">{monthName}</h1>
        <div className="flex items-center space-x-2">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Hoy
          </button>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-600 mb-1">Ingresos del Mes</p>
          <p className="text-3xl font-bold text-green-600">{summary.income.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-600 mb-1">Gastos del Mes</p>
          <p className="text-3xl font-bold text-red-600">{summary.expense.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-600 mb-1">Balance del Mes</p>
          <p className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {summary.balance.toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Movimientos del Mes</h2>
        </div>

        <div className="divide-y divide-slate-200">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No hay movimientos este mes</div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-lg ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {transaction.type === 'income' ? (
                        <Plus className="w-5 h-5 text-green-600" />
                      ) : (
                        <Minus className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{transaction.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <span className="capitalize">{transaction.category}</span>
                        <span>•</span>
                        <span className="capitalize">{transaction.source}</span>
                        {transaction.date && (
                          <>
                            <span>•</span>
                            <span>{new Date(transaction.date).toLocaleDateString('es-ES')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {transaction.amount.toFixed(2)} €
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
