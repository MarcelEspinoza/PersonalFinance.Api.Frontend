import { Transaction } from "../../types/Transaction";


interface Props {
  transactions: Transaction[];
}

export function CategorySummary({ transactions }: Props) {
  // Agrupar por categoría
  const grouped = transactions.reduce<Record<string, { income: number; expense: number }>>(
    (acc, tx) => {
      const key = tx.categoryName || "Sin categoría";
      if (!acc[key]) acc[key] = { income: 0, expense: 0 };
      if (tx.type === "income") acc[key].income += tx.amount;
      else acc[key].expense += tx.amount;
      return acc;
    },
    {}
  );

  const categories = Object.entries(grouped);

  if (categories.length === 0) {
    return <div className="p-8 text-center text-slate-500">No hay movimientos este mes</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Resumen por Categorías</h2>
      </div>
      <div className="divide-y divide-slate-200">
        {categories.map(([category, { income, expense }]) => (
          <div key={category} className="p-4 flex justify-between">
            <span className="font-medium text-slate-700 capitalize">{category}</span>
            <div className="flex space-x-6">
              <span className="text-green-600 font-bold">+{income.toFixed(2)} €</span>
              <span className="text-red-600 font-bold">-{expense.toFixed(2)} €</span>
              <span
                className={`font-bold ${
                  income - expense >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {(income - expense).toFixed(2)} €
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
