import { Transaction } from "../../types/Transaction"; // 👈 importa el tipo centralizado
import { MonthlyItem } from "./MonthlyItem";

interface Props {
  transactions: Transaction[];
}

export function MonthlyList({ transactions }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Movimientos del Mes</h2>
      </div>
      <div className="divide-y divide-slate-200">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay movimientos este mes</div>
        ) : (
          transactions.map((t) => <MonthlyItem key={t.id} transaction={t} />) // 👈 pasa el objeto como prop
        )}
      </div>
    </div>
  );
}
