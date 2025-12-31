import { useState } from "react";
import { budgetService } from "../../services/budgetService";

type Props = {
  onSaved: () => void;
};

export function BudgetForm({ onSaved }: Props) {
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [monthlyLimit, setMonthlyLimit] = useState<number>(0);
  const [startMonth, setStartMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );

  const submit = async () => {
    if (!categoryId || monthlyLimit <= 0) return;

    await budgetService.create({
      categoryId,
      monthlyLimit,
      startMonth: `${startMonth}-01`,
      isActive: true,
    });

    setCategoryId("");
    setMonthlyLimit(0);
    onSaved();
  };

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold">Nuevo presupuesto</h3>

      <div className="flex gap-3">
        <input
          type="number"
          placeholder="Category ID"
          className="border rounded px-2 py-1 w-32"
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
        />

        <input
          type="number"
          placeholder="Límite mensual"
          className="border rounded px-2 py-1 w-40"
          value={monthlyLimit}
          onChange={(e) => setMonthlyLimit(Number(e.target.value))}
        />

        <input
          type="month"
          className="border rounded px-2 py-1"
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
        />

        <button
          onClick={submit}
          className="bg-emerald-600 text-white px-4 rounded"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
