import { useEffect, useState } from "react";
import apiClient from "../../lib/apiClient";
import { BudgetPayload, budgetService } from "../../services/budgetService";

interface Category {
  id: number;
  name: string;
}

export function BudgetForm({ onSaved }: { onSaved: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<BudgetPayload>({
    categoryId: 0,
    monthlyLimit: 0,
    startMonth: new Date().toISOString().slice(0, 7) + "-01",
    endMonth: null
  });

  useEffect(() => {
    apiClient.get<Category[]>("/categories").then(r => setCategories(r.data));
  }, []);

  const submit = async () => {
    if (!form.categoryId || form.monthlyLimit <= 0) return;
    await budgetService.create(form);
    onSaved();
  };

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      <h3 className="font-semibold text-lg">Nuevo presupuesto</h3>

      <select
        className="w-full border rounded p-2"
        value={form.categoryId}
        onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })}
      >
        <option value={0}>Selecciona categoría</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <input
        type="number"
        className="w-full border rounded p-2"
        placeholder="Límite mensual"
        value={form.monthlyLimit}
        onChange={e => setForm({ ...form, monthlyLimit: Number(e.target.value) })}
      />

      <button
        onClick={submit}
        className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
      >
        Guardar presupuesto
      </button>
    </div>
  );
}
