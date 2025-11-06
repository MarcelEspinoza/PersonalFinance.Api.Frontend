import { Calendar, Edit2, Trash2 } from "lucide-react";

interface Transaction {
  id: number;
  name?: string;
  description?: string;
  amount: number;
  date?: string;
  category?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  notes?: string;
  type?: string; // "income" | "expense" o "Fixed"/"Variable"/"Temporary"
}

interface Props {
  activeTab: "fixed" | "variable" | "temporary";
  mode: "income" | "expense";
  transactions: Transaction[];
  onEdit: (item: Transaction) => void;
  onDelete: (id: number) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
}

export function TransactionList({
  activeTab,
  mode,
  transactions,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
}: Props) {
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No hay {mode === "income" ? "ingresos" : "gastos"} registrados
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="p-4 hover:bg-slate-50 transition flex items-center"
        >
          {/* Checkbox de selección */}
          <input
            type="checkbox"
            checked={selectedIds.includes(tx.id)}
            onChange={() => onToggleSelect(tx.id)}
            className="mr-4"
          />

          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">
                {tx.description}
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                {activeTab === "fixed" && (
                  <>
                    {tx.frequency && (
                      <span className="capitalize">{tx.frequency}</span>
                    )}
                    {tx.start_date && (
                      <>
                        <span>•</span>
                        <span>
                          Desde{" "}
                          {new Date(tx.start_date).toLocaleDateString("es-ES")}
                        </span>
                      </>
                    )}
                    {tx.end_date && (
                      <>
                        <span>•</span>
                        <span>Día {tx.end_date}</span>
                      </>
                    )}
                    {tx.is_active === false && (
                      <span className="text-red-500">• Inactivo</span>
                    )}
                  </>
                )}
                {activeTab === "variable" && (
                  <>
                    {tx.date && (
                      <>
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(tx.date).toLocaleDateString("es-ES")}
                        </span>
                      </>
                    )}
                    {tx.category && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{tx.category}</span>
                      </>
                    )}
                  </>
                )}
                {activeTab === "temporary" && (
                  <>
                    {tx.frequency && (
                      <span className="capitalize">{tx.frequency}</span>
                    )}
                    {tx.type && (
                      <>
                        <span>•</span>
                        <span>
                          {tx.type === "income"
                            ? "Ingreso"
                            : tx.type === "expense"
                            ? "Gasto"
                            : tx.type}
                        </span>
                      </>
                    )}
                    {tx.start_date && tx.end_date && (
                      <>
                        <span>•</span>
                        <span>
                          {new Date(tx.start_date).toLocaleDateString("es-ES")} →{" "}
                          {new Date(tx.end_date).toLocaleDateString("es-ES")}
                        </span>
                      </>
                    )}
                    {tx.is_active === false && (
                      <span className="text-red-500">• Inactivo</span>
                    )}
                  </>
                )}
              </div>
              {tx.notes && (
                <p className="text-sm text-slate-600 mt-1">{tx.notes}</p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <p
                className={`text-xl font-bold ${
                  mode === "income" ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.amount.toFixed(2)} €
              </p>
              <button
                onClick={() => onEdit(tx)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => onDelete(tx.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
