import { ArrowUpDown, ChevronDown, ChevronUp, Edit2, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

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
  highlight?: string;
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
  highlight,
}: Props) {
  const [openRowId, setOpenRowId] = useState<number | null>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenRowId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // helper to escape regex special chars
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // highlight helper: returns JSX with <mark> around matches
  function Highlight({ text, term }: { text?: string; term?: string }) {
    if (!term || !text) return <>{text}</>;
    const t = text.toString();
    const q = term.trim();
    if (!q) return <>{t}</>;
    try {
      const re = new RegExp(`(${escapeRegex(q)})`, "ig");
      const parts = t.split(re);
      return (
        <>
          {parts.map((p, i) =>
            re.test(p) ? (
              <mark key={i} className="bg-amber-200 text-amber-900 px-[2px] rounded-sm">
                {p}
              </mark>
            ) : (
              <span key={i}>{p}</span>
            )
          )}
        </>
      );
    } catch {
      return <>{t}</>;
    }
  }

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

          <th className="px-4 py-3 text-left min-w-[420px]">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("description")}>
              Descripción <SortIcon active={sortBy === "description"} dir={sortDir} />
            </button>
          </th>

          <th className="px-4 py-3 text-left w-44">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("bank")}>
              Banco <SortIcon active={sortBy === "bank"} dir={sortDir} />
            </button>
          </th>

          <th className="px-4 py-3 text-left w-44">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("counterparty")}>
              Banco destino <SortIcon active={sortBy === "counterparty"} dir={sortDir} />
            </button>
          </th>

          <th className="px-4 py-3 text-left w-36">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("date")}>
              Fecha <SortIcon active={sortBy === "date"} dir={sortDir} />
            </button>
          </th>

          <th className="px-4 py-3 text-left w-40">Categoría</th>

          <th className="px-4 py-3 text-left w-36">
            <button className="flex items-center gap-2" onClick={() => onRequestSort("type")}>
              Tipo <SortIcon active={sortBy === "type"} dir={sortDir} />
            </button>
          </th>

          <th className="px-4 py-3 text-right w-36">
            <button className="flex items-center gap-2 ml-auto" onClick={() => onRequestSort("amount")}>
              Importe <SortIcon active={sortBy === "amount"} dir={sortDir} />
            </button>
          </th>

          <th className="px-4 py-3 w-28"></th>
        </tr>
      </thead>

      <tbody className="bg-white divide-y divide-slate-100">
        {transactions.map((tx) => {
          const isOpen = openRowId === tx.id;
          return (
            <tr key={tx.id} className="hover:bg-slate-50 relative">
              <td className="px-4 py-3 align-top">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(tx.id)}
                  onChange={() => onToggleSelect(tx.id)}
                />
              </td>

              {/* Content wrapper: translateX when menu open */}
              <td
                className="px-4 py-3 align-top transition-transform duration-200"
                style={{ transform: isOpen ? "translateX(-120px)" : "translateX(0)" }}
                onClick={() => setOpenRowId(null)} // clicking row content closes menu
              >
                <div className="font-medium text-slate-800 leading-snug">
                  <Highlight text={tx.description} term={highlight} />
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {tx.transferReference && (
                    <span className="mr-2">
                      Ref: <Highlight text={tx.transferReference} term={highlight} />
                    </span>
                  )}
                  {tx.frequency && <span className="mr-2 capitalize">{tx.frequency}</span>}
                </div>
              </td>

              <td className="px-4 py-3 align-top" style={{ transform: isOpen ? "translateX(-120px)" : "translateX(0)", transition: "transform 200ms" }}>
                <div className="text-sm text-slate-600">
                  <Highlight text={tx.bankName} term={highlight} />
                </div>
              </td>

              <td className="px-4 py-3 align-top" style={{ transform: isOpen ? "translateX(-120px)" : "translateX(0)", transition: "transform 200ms" }}>
                <div className="text-sm text-slate-600">
                  <Highlight text={tx.counterpartyBankName} term={highlight} />
                </div>
              </td>

              <td className="px-4 py-3 align-top" style={{ transform: isOpen ? "translateX(-120px)" : "translateX(0)", transition: "transform 200ms" }}>
                <div className="text-sm text-slate-600">
                  {tx.date ? new Date(tx.date).toLocaleDateString("es-ES") : "-"}
                </div>
              </td>

              <td className="px-4 py-3 align-top text-sm text-slate-600" style={{ transform: isOpen ? "translateX(-120px)" : "translateX(0)", transition: "transform 200ms" }}>
                <Highlight text={tx.category} term={highlight} />
              </td>

              <td className="px-4 py-3 align-top text-sm text-slate-600" style={{ transform: isOpen ? "translateX(-120px)" : "translateX(0)", transition: "transform 200ms" }}>
                <Highlight text={tx.type} term={highlight} />
              </td>

              <td className="px-4 py-3 align-top text-right font-bold" style={{ transform: isOpen ? "translateX(-120px)" : "translateX(0)", transition: "transform 200ms" }}>
                <span className={`${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {tx.amount.toFixed(2)} €
                </span>
              </td>

              {/* Actions column: three-dots button and action panel */}
              <td className="px-4 py-3 align-top text-right relative">
                {/* three-dots button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenRowId(isOpen ? null : tx.id);
                  }}
                  className="p-2 rounded-full hover:bg-slate-100 transition"
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  title="Más opciones"
                >
                  <MoreVertical className="w-5 h-5 text-slate-600" />
                </button>

                {/* Action panel: positioned absolutely to the right of the row */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute right-0 top-1/2 transform -translate-y-1/2 flex gap-2 items-center transition-opacity duration-150 z-20 ${
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <button
                    onClick={() => {
                      setOpenRowId(null);
                      onEdit(tx);
                    }}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4" /> <span className="text-sm">Editar</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setOpenRowId(null);
                      if (confirm("¿Eliminar este movimiento?")) onDelete(tx.id);
                    }}
                    className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-md text-rose-600 hover:bg-rose-100 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> <span className="text-sm">Eliminar</span>
                    </div>
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}