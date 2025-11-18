import { X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import bankService from "../../services/bankService";
import { CategoriesService } from "../../services/categoriesService";
import { LoansService } from "../../services/loansService";
import { formatDate } from "../../utils/date";
import { Input, Select, Textarea } from "./FormFields";

interface Category { id: number; name: string; }
interface LoanItem {
  id: string;
  type: "bank" | "given" | "received";
  name: string;
  outstandingAmount: number;
  status: "active" | "paid" | "overdue";
}

interface BankItem {
  id: string;
  name: string;
  entity?: string;
}

interface Props {
  type: "income" | "expense";
  showModal: boolean;
  editingId: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onClose: () => void;
  onSubmit: ((payload: any) => Promise<void> | void) | ((e: React.FormEvent) => Promise<void> | void);
  onSaved?: () => void;
  categories?: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  userId: string;
}

export function TransactionModal({
  type,
  showModal,
  editingId,
  formData,
  setFormData,
  onClose,
  onSubmit,
  onSaved,
  categories = [],
  setCategories,
  userId,
}: Props) {
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [banks, setBanks] = useState<BankItem[]>([]);

  const isLoanCategory = useMemo(
    () => formData.categoryId === 100 || formData.categoryId === 101,
    [formData.categoryId]
  );

  const makeIsoUtcFromDateString = (d?: string | null) => {
    if (!d) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return new Date(`${d}T00:00:00Z`).toISOString();
    }
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return dt.toISOString();
    } catch {
      return null;
    }
  };

  // Load loans (if needed) and banks
  useEffect(() => {
    if (isLoanCategory && type === "expense" && userId) {
      LoansService.getLoans(userId)
        .then(({ data }) => setLoans(data || []))
        .catch(() => setLoans([]));
    } else {
      setLoans([]);
      if (formData.loanId) {
        setFormData((prev: any) => ({ ...prev, loanId: null }));
      }
    }

    (async () => {
      try {
        const { data } = await bankService.getAll();
        setBanks(data || []);
      } catch (err) {
        console.error("Error loading banks", err);
        setBanks([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoanCategory, type, userId]);

  // When opening the modal in edit mode, normalize fields for the form
  useEffect(() => {
    if (editingId && showModal && formData) {
      setFormData((prev: any) => ({
        ...prev,
        date: formatDate(prev.date),
        start_Date: formatDate(prev.start_Date ?? prev.start_date ?? null),
        end_Date: formatDate(prev.end_Date ?? prev.end_date ?? null),
        isTransfer: prev.isTransfer ?? false,
        transferReference: prev.transferReference ?? "",
        counterpartyBankId: prev.transferCounterpartyBankId ?? prev.counterpartyBankId ?? "",
        // Ensure source is available: prefer stored source, fall back to type or default
        source: prev.source ?? prev.type ?? (type === "income" ? "fixed" : "variable"),
        // normalize bankId to string or null
        bankId: prev.bankId ?? null,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, showModal]);

  // Filter loans to present valid options
  const filteredLoans = useMemo(() => {
    if (!isLoanCategory) return [];
    if (formData.categoryId === 101) {
      return loans.filter(l => l.type === "bank" && l.status !== "paid");
    }
    if (formData.categoryId === 100) {
      return loans.filter(l => (l.type === "given" || l.type === "received") && l.status !== "paid");
    }
    return [];
  }, [isLoanCategory, loans, formData.categoryId]);

  // Category manager actions
  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert("Ya existe una categoría con ese nombre.");
      return;
    }
    try {
      const { data } = await CategoriesService.create({ name, description: "", isActive: true });
      setCategories((prev) => [...prev, data]);
      setFormData({ ...formData, categoryId: data.id });
      setNewCategoryName("");
    } catch (error) {
      console.error("Error creando categoría:", error);
    }
  };

  const handleUpdateCategory = async (id: number, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    try {
      await CategoriesService.update(id, { name: clean });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: clean } : c))
      );
    } catch (error) {
      console.error("Error actualizando categoría:", error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await CategoriesService.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (formData.categoryId === id) {
        const first = categories.find((c) => c.id !== id);
        setFormData({ ...formData, categoryId: first ? first.id : 0, loanId: null });
      }
    } catch (error) {
      console.error("Error eliminando categoría:", error);
    }
  };

  if (!showModal) return null;

  // Submit handler: build payload normalized for backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawAmount = formData.amount ?? formData.amount === 0 ? formData.amount : "";
    const amountNum = Number(String(rawAmount).replace(",", "."));
    if (isNaN(amountNum)) {
      alert("Introduce una cantidad válida.");
      return;
    }

    const dateIso = makeIsoUtcFromDateString(formData.date ?? formData.start_Date);
    const startIso = makeIsoUtcFromDateString(formData.start_Date);
    const endIso = makeIsoUtcFromDateString(formData.end_Date);

    if (!dateIso) {
      alert("La fecha es obligatoria y debe ser válida.");
      return;
    }

    const categoryIdNum = formData.categoryId ? Number(formData.categoryId) : undefined;
    const loanId = formData.loanId ? formData.loanId : null;
    // Normalize bankId: empty -> null, otherwise string GUID
    const bankId = formData.bankId ? formData.bankId : null;
    const transferReference = formData.transferReference ? String(formData.transferReference).trim() : null;
    const transferCounterpartyBankId = formData.counterpartyBankId ? formData.counterpartyBankId : null;

    // The backend expects the "Type" field to hold the source (fixed|variable|temporary).
    // Use formData.source for that purpose and ensure a sensible default.
    const sourceType = formData.source ?? (type === "income" ? "fixed" : "variable");

    const payload: any = {
      description: formData.description ?? "",
      amount: amountNum,
      date: dateIso,
      start_Date: startIso,
      end_Date: endIso,
      // Send the movement's source in the "type" field (what backend uses)
      type: sourceType,
      // keep 'source' too for compatibility with older endpoints (no harm)
      source: sourceType,
      categoryId: categoryIdNum,
      notes: formData.notes ?? null,
      loanId,
      isIndefinite: !!formData.isIndefinite,
      bankId,
      isTransfer: !!formData.isTransfer,
      transferReference,
      transferCounterpartyBankId,
    };

    // Clean up undefined values
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    try {
      const result = (onSubmit as (p: any) => any)(payload);
      if (result && typeof (result as Promise<any>).then === "function") await result;
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (msg.includes("preventDefault is not a function") || msg.includes("ae.preventDefault is not a function")) {
        try {
          const result2 = (onSubmit as (e: React.FormEvent) => any)(e);
          if (result2 && typeof (result2 as Promise<any>).then === "function") await result2;
        } catch (err2: any) {
          console.error("Error calling fallback event-style onSubmit:", err2);
          alert(err2?.response?.data?.error ?? err2?.message ?? "Error guardando transacción");
          return;
        }
      } else {
        console.error("Error in submit handler:", err);
        alert(err?.response?.data?.error ?? err?.message ?? "Error guardando transacción");
        return;
      }
    }

    try {
      if (onSaved) onSaved();
    } catch { }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {editingId ? "Editar" : "Nuevo"} {type === "income" ? "Ingreso" : "Gasto"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input label="Nombre" value={formData.description || ""} onChange={(v) => setFormData({ ...formData, description: v })} />
            <Input label="Cantidad" type="number" value={formData.amount ?? ""} onChange={(v) => setFormData({ ...formData, amount: v })} />
            <Input label="Fecha" type="date" value={formData.date ?? ""} onChange={(v) => setFormData({ ...formData, date: v })} />
            <Select
              label="Tipo"
              value={formData.source ?? ""}
              onChange={(v) => setFormData({ ...formData, source: v })}
              options={["fixed", "variable", "temporary"]}
            />
            <Textarea label="Notas (opcional)" value={formData.notes ?? ""} onChange={(v) => setFormData({ ...formData, notes: v })} />
          </div>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
              <div className="flex space-x-2">
                <select
                  value={formData.categoryId ?? ""}
                  onChange={(e) => {
                    const newCategoryId = Number(e.target.value);
                    const isLoan = newCategoryId === 100 || newCategoryId === 101;
                    setFormData({
                      ...formData,
                      categoryId: newCategoryId,
                      loanId: isLoan ? formData.loanId : null,
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {categories.length === 0 && <option value="">Sin categorías</option>}
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                >
                  ⚙️
                </button>
              </div>

              {showCategoryManager && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Nueva categoría"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Añadir
                    </button>
                  </div>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <input
                          type="text"
                          defaultValue={cat.name}
                          onBlur={(e) => handleUpdateCategory(cat.id, e.target.value)}
                          className="flex-1 px-2 py-1 border rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bank */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Banco</label>
              <select
                value={formData.bankId || ""}
                onChange={(e) => setFormData({ ...formData, bankId: e.target.value || null })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Selecciona banco</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.entity ? `| ${b.entity}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer */}
            <div className="flex items-center gap-3">
              <input
                id="isTransfer"
                type="checkbox"
                checked={!!formData.isTransfer}
                onChange={(e) => setFormData({ ...formData, isTransfer: e.target.checked })}
              />
              <label htmlFor="isTransfer" className="text-sm text-slate-700">Es traspaso</label>
            </div>

            {formData.isTransfer && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {Number(formData.amount) < 0 ? "Banco destino" : "Banco origen"}
                  </label>
                  <select
                    value={formData.counterpartyBankId || ""}
                    onChange={(e) => setFormData({ ...formData, counterpartyBankId: e.target.value || null })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">
                      {Number(formData.amount) < 0 ? "Selecciona banco destino" : "Selecciona banco origen"}
                    </option>
                    {banks.filter(b => b.id !== formData.bankId).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.entity ? `| ${b.entity}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Referencia del traspaso"
                  value={formData.transferReference || ""}
                  onChange={(v) => setFormData({ ...formData, transferReference: v })}
                />
              </>
            )}

            <Input
              label="Fecha de inicio"
              type="date"
              value={formData.start_Date ?? ""}
              onChange={(v) => setFormData({ ...formData, start_Date: v })}
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isIndefinite || false}
                onChange={(e) => setFormData({ ...formData, isIndefinite: e.target.checked })}
              />
              <label className="text-sm text-slate-700">Sin fecha de fin (indefinido)</label>
            </div>

            <Input
              label="Fecha de fin"
              type="date"
              value={formData.end_Date ?? ""}
              onChange={(v) => setFormData({ ...formData, end_Date: v })}
              disabled={formData.isIndefinite}
            />

            {type === "expense" && isLoanCategory && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vincular a préstamo</label>
                <select
                  value={formData.loanId || ""}
                  onChange={(e) => setFormData({ ...formData, loanId: e.target.value || null })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                >
                  <option value="">Selecciona préstamo</option>
                  {filteredLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {(l.type === "bank" ? "Bancario" : l.type === "given" ? "Prestado" : "Recibido")}: {l.name} | ${l.outstandingAmount}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}