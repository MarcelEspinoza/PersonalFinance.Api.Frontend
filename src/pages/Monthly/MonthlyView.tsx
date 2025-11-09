import { useEffect, useState } from "react";

import { MonthHeader } from "../../components/Monthly/MonthHeader";
import { MonthlyList } from "../../components/Monthly/MonthlyList";
import MonthlyReconciliation from "../../components/Monthly/MonthlyReconciliation";
import { SummaryCards } from "../../components/Monthly/SummaryCards";
import { useAuth } from "../../contexts/AuthContext";
import { MonthlyService } from "../../services/monthlyService";
import { Transaction } from "../../types/Transaction";

export function MonthlyView() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

  useEffect(() => {
    if (user) loadMonthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentDate]);

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      const { data } = await MonthlyService.getMonthData(user!.id, startStr, endStr);
      const allTransactions: Transaction[] = data.transactions || [];

      // Ordenar por fecha descendente
      allTransactions.sort((a, b) => {
        if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });

      setTransactions(allTransactions);

      const totalIncome = allTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = allTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

      setSummary({
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
      });
    } catch (error) {
      console.error("Error loading month data:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const monthName = currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1..12

  return (
    <div className="space-y-8">
      {/* Cabecera con navegación de meses */}
      <MonthHeader
        monthName={monthName}
        onChangeMonth={changeMonth}
        onToday={() => setCurrentDate(new Date())}
      />

      {/* Grid: lista principal + panel de conciliación */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Resumen de ingresos, gastos y balance */}
          <SummaryCards
            income={summary.income}
            expense={summary.expense}
            balance={summary.balance}
          />

          {/* Lista de movimientos */}
          <MonthlyList transactions={transactions} />
        </div>

        {/* Panel de conciliación bancaria */}
        <div className="lg:col-span-1">
          <MonthlyReconciliation year={year} month={month} />
        </div>
      </div>
    </div>
  );
}