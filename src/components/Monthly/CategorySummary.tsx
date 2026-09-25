import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Transaction } from "../../types/Transaction";

interface Props {
  transactions: Transaction[];
}

export function CategorySummary({ transactions }: Props) {
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
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No hay movimientos este mes
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Resumen por Categorías</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {categories.map(([category, { income, expense }]) => (
            <div key={category} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium capitalize">{category}</span>
              <div className="flex items-center gap-4 text-sm tabular-nums sm:gap-6">
                <span className="font-semibold text-positive">+{income.toFixed(2)} €</span>
                <span className="font-semibold text-negative">-{expense.toFixed(2)} €</span>
                <span className={`font-semibold ${income - expense >= 0 ? "text-positive" : "text-negative"}`}>
                  {(income - expense).toFixed(2)} €
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
