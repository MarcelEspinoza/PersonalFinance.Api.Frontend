import { ArrowUpDown, ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";

interface Transaction {
  id: number;
  description?: string;
  amount: number;
  date?: string;
  category?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  notes?: string;
  type?: string;
  bankName?: string;
  counterpartyBankName?: string;
  transferReference?: string;
}

interface Props {
  mode: "income" | "expense";
  transactions: Transaction[];
  onEdit: (item: Transaction) => void;
  onDelete: (id: number) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  sortBy: "description" | "bank" | "counterparty" | "date" | "amount" | "type";
  sortDir: "asc" | "desc";
  onRequestSort: (col: "description" | "bank" | "counterparty" | "date" | "amount" | "type") => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
  return dir === "asc" ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />;
}

export function TransactionList({
  mode,
  transactions,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
  sortBy,
  sortDir,
  onRequestSort,
}: Props) {
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No hay {mode === "income" ? "ingresos" : "gastos"} registrados
      </div>
    );
  }

  return (
    <table className="min-w-full table-auto">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left w-12"></th>

          {/* DESCRIPTION: wider */}
          <th className="px-4 py-3 text-left min-w-[340px]">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("description")}>
              Descripción <SortIcon active={sortBy === "description"} dir={sortDir} />
            </button>
          </th>

          {/* BANK (origin) */}
          <th className="px-4 py-3 text-left w-44">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("bank")}>
              Banco <SortIcon active={sortBy === "bank"} dir={sortDir} />
            </button>
          </th>

          {/* COUNTERPARTY */}
          <th className="px-4 py-3 text-left w-44">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("counterparty")}>
              Banco destino <SortIcon active={sortBy === "counterparty"} dir={sortDir} />
            </button>
          </th>

          {/* DATE */}
          <th className="px-4 py-3 text-left w-36">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("date")}>
              Fecha <SortIcon active={sortBy === "date"} dir={sortDir} />
            </button>
          </th>

          {/* CATEGORY */}
          <th className="px-4 py-3 text-left w-40">Categoría</th>

          {/* TYPE (separate column now) */}
          <th className="px-4 py-3 text-left w-36">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("type")}>
              Tipo <SortIcon active={sortBy === "type"} dir={sortDir} />
            </button>
          </th>

          <th className="px-4 py-3 text-left hidden lg:table-cell">Notas</th>

          <th className="px-4 py-3 text-right w-36">
            <button className="flex items-center gap-2 ml-auto" onClick={() => onRequestSort("amount")}>
              Importe <SortIcon active={sortBy === "amount"} dir={sortDir} />
            </button>
          </th>

          <th className="px-4 py-3 w-28"></th>
        </tr>
      </thead>

      <tbody className="bg-white divide-y divide-slate-100">
        {transactions.map((tx) => (
          <tr key={tx.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 align-top">
              <input
                type="checkbox"
                checked={selectedIds.includes(tx.id)}
                onChange={() => onToggleSelect(tx.id)}
              />
            </td>

            <td className="px-4 py-3 align-top">
              <div className="font-medium text-slate-800 leading-snug">{tx.description}</div>
              <div className="text-sm text-slate-500 mt-1">
                {tx.transferReference && <span className="mr-2">Ref: {tx.transferReference}</span>}
                {tx.frequency && <span className="mr-2 capitalize">{tx.frequency}</span>}
              </div>
            </td>

            <td className="px-4 py-3 align-top">
              <div className="text-sm text-slate-600">{tx.bankName ?? "-"}</div>
            </td>

            <td className="px-4 py-3 align-top">
              <div className="text-sm text-slate-600">{tx.counterpartyBankName ?? "-"}</div>
            </td>

            <td className="px-4 py-3 align-top">
              <div className="text-sm text-slate-600">
                {tx.date ? new Date(tx.date).toLocaleDateString("es-ES") : "-"}
              </div>
            </td>

            <td className="px-4 py-3 align-top text-sm text-slate-600">
              {tx.category ?? "-"}
            </td>

            <td className="px-4 py-3 align-top text-sm text-slate-600">
              {tx.type ?? "-"}
            </td>

            <td className="px-4 py-3 align-top text-sm text-slate-600 hidden lg:table-cell">
              {tx.notes ?? "-"}
            </td>

            <td className="px-4 py-3 align-top text-right font-bold">
              <span className={`${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                {tx.amount.toFixed(2)} €
              </span>
            </td>

            <td className="px-4 py-3 align-top text-right">
              <button
                onClick={() => onEdit(tx)}
                className="p-2 hover:bg-slate-100 rounded-lg transition mr-2"
                title="Editar"
              >
                <Edit2 className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => onDelete(tx.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}