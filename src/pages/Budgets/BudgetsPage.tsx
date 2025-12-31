import { useEffect, useState } from "react";
import { budgetService } from "../../services/budgetService";
import type { BudgetStatus } from "../../types/BudgetStatus";

export function BudgetsPage() {
  const [items, setItems] = useState<BudgetStatus[]>([]);

  const load = async () => {
    const { data } = await budgetService.getMonthlyStatus();
    setItems(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Presupuestos</h1>

      <div className="bg-white border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Categoría</th>
              <th className="p-3">Límite</th>
              <th className="p-3">Gastado</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map(b => (
              <tr key={b.budgetId} className="border-t">
                <td className="p-3">{b.categoryName}</td>
                <td className="p-3">{b.monthlyLimit.toFixed(2)} €</td>
                <td className="p-3">{b.spentAmount.toFixed(2)} €</td>
                <td className="p-3">
                  {b.isExceeded ? "🔴 Excedido" : "🟢 OK"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
