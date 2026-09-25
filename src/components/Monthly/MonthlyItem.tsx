import { Transaction } from "../../types/Transaction";

interface Props {
  transaction: Transaction;
}

export function MonthlyItem({ transaction }: Props) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">{transaction.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {transaction.categoryName} • {transaction.source} • {" "}
          {transaction.date && new Date(transaction.date).toLocaleDateString("es-ES")}
        </p>
      </div>
      <p className={`shrink-0 text-base font-semibold tabular-nums ${transaction.type === "income" ? "text-positive" : "text-negative"}`}>
        {transaction.type === "income" ? "+" : "-"}
        {transaction.amount.toFixed(2)} €
      </p>
    </div>
  );
}
