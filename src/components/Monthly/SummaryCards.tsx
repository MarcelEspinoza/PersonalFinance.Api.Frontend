import { Card, CardContent } from "../ui/card";

interface Props {
  income: number;
  expense: number;
  balance: number;
}

export function SummaryCards({ income, expense, balance }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-positive tabular-nums">{income.toFixed(2)} €</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Gastos del Mes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-negative tabular-nums">{expense.toFixed(2)} €</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Balance del Mes</p>
          <p className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${balance >= 0 ? "text-positive" : "text-negative"}`}>
            {balance.toFixed(2)} €
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
