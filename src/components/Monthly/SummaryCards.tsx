interface Props {
  income: number;
  expense: number;
  balance: number;
}

export function SummaryCards({ income, expense, balance }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-sm text-slate-600 mb-1">Ingresos del Mes</p>
        <p className="text-3xl font-bold text-green-600">{income.toFixed(2)} €</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-sm text-slate-600 mb-1">Gastos del Mes</p>
        <p className="text-3xl font-bold text-red-600">{expense.toFixed(2)} €</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-sm text-slate-600 mb-1">Balance del Mes</p>
        <p className={`text-3xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {balance.toFixed(2)} €
        </p>
      </div>
    </div>
  );
}
