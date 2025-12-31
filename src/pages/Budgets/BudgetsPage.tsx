import { useEffect, useState } from "react";
import { BudgetForm } from "../../components/Budgets/BudgetForm";
import { budgetService } from "../../services/budgetService";
import type { BudgetStatus } from "../../types/BudgetStatus";

export function BudgetsPage() {
  const [items, setItems] = useState<BudgetStatus[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const load = async () => {
    const { data } = await budgetService.getMonthlyStatus();
    setItems(data);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (b: BudgetStatus) => {
    setEditingId(b.budgetId);
    setEditValue(b.monthlyLimit);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue(0);
  };

  const saveEdit = async (b: BudgetStatus) => {
    await budgetService.update(b.budgetId, {
      categoryId: b.categoryId,
      monthlyLimit: editValue,
      startMonth: new Date().toISOString(),
      isActive: true,
    });
    cancelEdit();
    await load();
  };

  const renderStatus = (b: BudgetStatus) => {
    const ratio = b.monthlyLimit > 0 ? b.spentAmount / b.monthlyLimit : 0;

    if (ratio >= 1) return <span className="text-red-600 font-semibold">🔴 Excedido</span>;
    if (ratio >= 0.8) return <span className="text-yellow-600 font-semibold">🟡 Cerca</span>;
    return <span className="text-green-600 font-semibold">🟢 OK</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Presupuestos</h1>

      {/* ➕ NUEVO PRESUPUESTO */}
      <BudgetForm onSaved={load} />

      {/* TABLA */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Categoría</th>
              <th className="p-3 text-right">Límite</th>
              <th className="p-3 text-right">Gastado</th>
              <th className="p-3">Progreso</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(b => {
              const ratio = b.monthlyLimit > 0
                ? Math.min(1, b.spentAmount / b.monthlyLimit)
                : 0;

              return (
                <tr key={b.budgetId} className="border-t">
                  <td className="p-3">{b.categoryName}</td>

                  <td className="p-3 text-right">
                    {editingId === b.budgetId ? (
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24 text-right"
                        value={editValue}
                        onChange={(e) => setEditValue(Number(e.target.value))}
                      />
                    ) : (
                      `${b.monthlyLimit.toFixed(2)} €`
                    )}
                  </td>

                  <td className="p-3 text-right">
                    {b.spentAmount.toFixed(2)} €
                  </td>

                  {/* 🅰️ ALERTA VISUAL */}
                  <td className="p-3">
                    <div className="w-full bg-slate-200 rounded h-2">
                      <div
                        className={`h-2 rounded ${
                          ratio >= 1
                            ? "bg-red-500"
                            : ratio >= 0.8
                            ? "bg-yellow-400"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    {renderStatus(b)}
                  </td>

                  {/* 🅱️ ACCIONES */}
                  <td className="p-3 text-right">
                    {editingId === b.budgetId ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => saveEdit(b)}
                          className="text-emerald-600"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-slate-500"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(b)}
                        className="text-blue-600"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🅲 BASE PARA SIMULACIÓN FUTURA */}
      <div className="text-xs text-slate-500">
        Próximamente: simulación de escenarios futuros basada en estos presupuestos.
      </div>
    </div>
  );
}
