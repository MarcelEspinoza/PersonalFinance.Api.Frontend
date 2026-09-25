import { useEffect, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
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
    <div className="space-y-6">
      <PageHeader title="Presupuestos" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nuevo presupuesto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            aria-label="Selecciona categoría"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={form.categoryId}
            onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })}
          >
            <option value={0}>Selecciona categoría</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <Input
            type="number"
            placeholder="Límite mensual"
            value={form.monthlyLimit}
            onChange={e => setForm({ ...form, monthlyLimit: Number(e.target.value) })}
          />

          <div className="flex justify-end pt-1">
            <Button type="button" onClick={submit}>
              Guardar presupuesto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}