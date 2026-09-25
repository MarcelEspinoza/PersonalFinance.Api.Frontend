import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Transaction } from "../../types/Transaction";
import { MonthlyItem } from "./MonthlyItem";

interface Props {
  transactions: Transaction[];
}

export function MonthlyList({ transactions }: Props) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Movimientos del Mes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No hay movimientos este mes</div>
          ) : (
            transactions.map((t) => <MonthlyItem key={t.id} transaction={t} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
