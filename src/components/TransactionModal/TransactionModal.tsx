// components/TransactionModal.tsx
import { X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { CategoriesService } from "../../services/categoriesService";
import { LoansService } from "../../services/loansService";
import { Input, Select, Textarea } from "./FormFields";

interface Category { id: number; name: string; }
interface LoanItem {
  id: string;
  type: "bank" | "given" | "received";
  name: string;
  outstandingAmount: number;
  status: "active" | "paid" | "overdue";
}

interface Props {
  type: "income" | "expense";
  showModal: boolean;
  editingId: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  categories?: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  userId: string; // 👈 añade userId para cargar préstamos
}

export function TransactionModal({
  type,
  showModal,
  editingId,
  formData,
  setFormData,
  onClose,
  onSubmit,
  categories = [],
  setCategories,
  userId,
}: Props) {
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [loans, setLoans] = useState<LoanItem[]>([]);
  const isLoanCategory = useMemo(
    () => formData.categoryId === 100 || formData.categoryId === 101,
    [formData.categoryId]
  );

  useEffect(() => {
    if (isLoanCategory && type === "expense" && userId) {
      LoansService.getLoans(userId)
        .then(({ data }) => {
          setLoans(data || []);
        })
        .catch(() => setLoans([]));
    } else {
      setLoans([]);
      setFormData({ ...formData, loanId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoanCategory, type, userId]);

  const filteredLoans = useMemo(() => {
    if (!isLoanCategory) return [];
    // Si categoría 101 (bancario) mostramos préstamos bancarios.
    // Si categoría 100 (personal) mostramos personales (given/received).
    if (formData.categoryId === 101) {
      return loans.filter(l => l.type === "bank" && l.status !== "paid");
    }
    if (formData.categoryId === 100) {
      return loans.filter(l => (l.type === "given" || l.type === "received") && l.status !== "paid");
    }
    return [];
  }, [isLoanCategory, loans, formData.categoryId]);

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert("Ya existe una categoría con ese nombre.");
      return;
    }
    try {
      const { data } = await CategoriesService.create({
        name, description: "", isActive: true,
      });
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

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna izquierda */}
          <div className="space-y-4">
            <Input label="Nombre" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} />
            <Input label="Cantidad" type="number" value={formData.amount} onChange={(v) => setFormData({ ...formData, amount: v })} />
            <Input label="Fecha" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
            <Select label="Frecuencia" value={formData.frequency} onChange={(v) => setFormData({ ...formData, frequency: v })} options={["monthly", "weekly", "biweekly", "yearly"]} />
            <Textarea label="Notas (opcional)" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} />
          </div>

          {/* Columna derecha */}
          <div className="space-y-4">
            {/* Categoría con CRUD inline */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
              <div className="flex space-x-2">
                <select
                  value={formData.categoryId || ""}
                  onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {categories.length === 0 && <option value="">Sin categorías</option>}
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowCategoryManager(!showCategoryManager)} className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
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
                    <button type="button" onClick={handleCreateCategory} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
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
                        <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="px-2 py-1 text-red-600 hover:bg-red-100 rounded">
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Input label="Fecha de inicio" type="date" value={formData.start_date} onChange={(v) => setFormData({ ...formData, start_date: v })} />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isIndefinite || false}
                onChange={(e) => setFormData({ ...formData, isIndefinite: e.target.checked })}
              />
              <label className="text-sm text-slate-700">Sin fecha de fin (indefinido)</label>
            </div>

            <Input label="Fecha de fin" type="date" value={formData.end_date} onChange={(v) => setFormData({ ...formData, end_date: v })} disabled={formData.isIndefinite} />

            {/* Selector de préstamo cuando categoría sea préstamo y sea gasto */}
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
                      {(l.type === "bank" ? "Bancario" : "Personal")} — {l.name} — Pendiente: {l.outstandingAmount} €
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Al guardar, se registrará un pago en el préstamo por el importe del gasto.
                </p>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="col-span-1 md:col-span-2 flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition">
              {editingId ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
