import { Transaction } from "../../types/Transaction";

interface Props {
  transaction: Transaction;
}

export function MonthlyItem({ transaction }: Props) {
  return (
    <div className="p-4 hover:bg-slate-50 transition flex justify-between">
      <div>
        <p className="font-medium text-slate-800">{transaction.name}</p>
        <p className="text-sm text-slate-500">
          {transaction.categoryName} • {transaction.source} •{" "}
          {transaction.date && new Date(transaction.date).toLocaleDateString("es-ES")}
        </p>
      </div>
      <p
        className={`font-bold ${
          transaction.type === "income" ? "text-green-600" : "text-red-600"
        }`}
      >
        {transaction.type === "income" ? "+" : "-"}
        {transaction.amount.toFixed(2)} €
      </p>
    </div>
  );
}
