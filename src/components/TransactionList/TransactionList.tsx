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
  bankId?: string;
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
  onSelectAll?: () => void;
  allSelected?: boolean;
  sortBy: "description" | "bank" | "counterparty" | "date" | "amount" | "type";
  sortDir: "asc" | "desc";
  onRequestSort: (col: "description" | "bank" | "counterparty" | "date" | "amount" | "type") => void;
  highlight?: string;
  bankMap?: Record<string, string>;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
  return dir === "asc" ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />;
}

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

export function TransactionList({
  mode,
  transactions,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  allSelected,
  sortBy,
  sortDir,
  onRequestSort,
  highlight,
  bankMap,
}: Props) {
  const [openRowId, setOpenRowId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) {
        setOpenRowId(null);
        return;
      }
      if (target.closest("[data-actions]") || target.closest("[data-more-btn]")) return;
      setOpenRowId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No hay {mode === "income" ? "ingresos" : "gastos"} registrados
      </div>
    );
  }

  return (
    <>
      <table className="min-w-full table-auto">
        <thead className="bg-slate-50">
          <tr>
            {/* SELECT ALL in header; counter BELOW the checkbox to avoid layout shift */}
            <th className="px-4 py-3 text-left w-12">
              <div className="flex flex-col items-start">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todo"
                  checked={Boolean(allSelected)}
                  onChange={() => onSelectAll && onSelectAll()}
                />
                <div className="text-xs text-slate-500 mt-1">
                  {selectedIds.length}/{transactions.length}
                </div>
              </div>
            </th>

            <th className="px-4 py-3 text-left min-w-[300px]">
              <button className="flex items-center gap-2" onClick={() => onRequestSort("description")}>
                Descripción <SortIcon active={sortBy === "description"} dir={sortDir} />
              </button>
            </th>

            <th className="px-4 py-3 text-left w-36">
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

            <th className="px-4 py-3 text-left w-28">
              <button className="flex items-center gap-2" onClick={() => onRequestSort("type")}>
                Tipo <SortIcon active={sortBy === "type"} dir={sortDir} />
              </button>
            </th>

            <th className="px-4 py-3 text-right w-28 pr-12">
              <button className="flex items-center gap-2 ml-auto" onClick={() => onRequestSort("amount")}>
                Imp <SortIcon active={sortBy === "amount"} dir={sortDir} />
              </button>
            </th>

            <th className="px-4 py-3 w-16 sticky right-0 bg-white border-l border-slate-100 shadow-sm"></th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-slate-100">
          {transactions.map((tx) => {
            const isOpen = openRowId === tx.id;

            return (
              <tr key={tx.id} className="hover:bg-slate-50 relative">
                <td className="px-4 py-3 align-top">
                  {!isOpen ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tx.id)}
                      onChange={() => onToggleSelect(tx.id)}
                    />
                  ) : (
                    <span aria-hidden className="inline-block w-4 h-4" />
                  )}
                </td>

                <td
                  className="px-4 py-3 align-top transition-transform duration-200"
                  style={{ transform: isOpen && !isMobile ? "translateX(-300px)" : "translateX(0)" }}
                  onClick={() => setOpenRowId(null)}
                >
                  <div
                    className="font-medium text-slate-800 leading-snug"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    <Highlight text={tx.description} term={highlight} />
                  </div>
                  <div
                    className="text-sm text-slate-500 mt-1"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {tx.transferReference && (
                      <span className="mr-2">
                        Ref: <Highlight text={tx.transferReference} term={highlight} />
                      </span>
                    )}
                    {tx.frequency && <span className="mr-2 capitalize">{tx.frequency}</span>}
                  </div>
                </td>

                {/* Banco origen: prefer tx.bankName, else lookup bankMap by bankId, else show id */}
                <td className="px-4 py-3 align-top transition-transform duration-200" style={{ transform: isOpen && !isMobile ? "translateX(-300px)" : "translateX(0)" }}>
                  <div className="text-sm text-slate-600 truncate max-w-[120px]">
                    {tx.bankName ?? (tx.bankId ? (bankMap ? bankMap[tx.bankId] ?? tx.bankId : tx.bankId) : "-")}
                  </div>
                </td>

                <td className="px-4 py-3 align-top transition-transform duration-200" style={{ transform: isOpen && !isMobile ? "translateX(-300px)" : "translateX(0)" }}>
                  <div className="text-sm text-slate-600 truncate max-w-[160px]">
                    <Highlight text={tx.counterpartyBankName} term={highlight} />
                  </div>
                </td>

                <td className="px-4 py-3 align-top transition-transform duration-200" style={{ transform: isOpen && !isMobile ? "translateX(-300px)" : "translateX(0)" }}>
                  <div className="text-sm text-slate-600">
                    {tx.date ? new Date(tx.date).toLocaleDateString("es-ES") : "-"}
                  </div>
                </td>

                <td className="px-4 py-3 align-top text-sm text-slate-600 transition-transform duration-200" style={{ transform: isOpen && !isMobile ? "translateX(-300px)" : "translateX(0)" }}>
                  <Highlight text={tx.category} term={highlight} />
                </td>

                <td className="px-4 py-3 align-top text-sm text-slate-600 transition-transform duration-200" style={{ transform: isOpen && !isMobile ? "translateX(-300px)" : "translateX(0)" }}>
                  <Highlight text={tx.type} term={highlight} />
                </td>

                <td className="px-4 py-3 align-top text-right font-bold transition-transform duration-200 pr-12" style={{ transform: isOpen && !isMobile ? "translateX(-300px)" : "translateX(0)" }}>
                  <span className={`${tx.amount >= 0 ? "text-green-600" : "text-red-600"} whitespace-nowrap`}>
                    {tx.amount.toFixed(2)}{'\u00A0€'}
                  </span>
                </td>

                <td className="px-4 py-3 align-top text-right relative sticky right-0 bg-white border-l border-slate-100 shadow-sm">
                  <button
                    data-more-btn
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMobile) {
                        setOpenRowId(tx.id);
                      } else {
                        setOpenRowId(isOpen ? null : tx.id);
                      }
                    }}
                    className="p-2 rounded-full hover:bg-slate-100 transition"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    title="Más opciones"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-600" />
                  </button>

                  <div
                    data-actions
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 flex gap-3 items-center transition-opacity duration-150 z-40 ${
                      isOpen && !isMobile ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setOpenRowId(null);
                        onEdit(tx);
                      }}
                      className="h-10 min-w-[140px] px-4 bg-emerald-100 text-emerald-800 rounded-md shadow-sm border border-emerald-50 hover:bg-emerald-200 transition flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> <span className="text-sm font-medium">Editar</span>
                    </button>

                    <button
                      onClick={() => {
                        setOpenRowId(null);
                        if (confirm("¿Eliminar este movimiento?")) onDelete(tx.id);
                      }}
                      className="h-10 min-w-[140px] px-4 bg-rose-50 text-rose-700 rounded-md shadow-sm border border-rose-100 hover:bg-rose-100 transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> <span className="text-sm font-medium">Eliminar</span>
                    </button>
                  </div>

                  {isMobile && openRowId === tx.id && (
                    <div
                      className="fixed inset-0 z-40 flex items-end justify-center"
                      role="dialog"
                      aria-modal="true"
                      onClick={() => setOpenRowId(null)}
                    >
                      <div className="absolute inset-0 bg-black bg-opacity-30" />
                      <div
                        className="relative w-full max-w-md bg-white rounded-t-xl p-4 space-y-3 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-medium">Acciones</div>
                          <button onClick={() => setOpenRowId(null)} className="text-slate-500">Cerrar</button>
                        </div>

                        <button
                          onClick={() => {
                            setOpenRowId(null);
                            onEdit(tx);
                          }}
                          className="w-full px-4 py-3 bg-emerald-100 text-emerald-800 rounded-md shadow-sm border border-emerald-50 flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-5 h-5" /> Editar
                        </button>

                        <button
                          onClick={() => {
                            setOpenRowId(null);
                            if (confirm("¿Eliminar este movimiento?")) onDelete(tx.id);
                          }}
                          className="w-full px-4 py-3 bg-rose-50 text-rose-700 rounded-md shadow-sm border border-rose-100 flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-5 h-5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}