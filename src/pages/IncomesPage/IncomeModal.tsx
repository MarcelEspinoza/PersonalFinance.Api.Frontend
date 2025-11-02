import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoriesService } from "../../services/categoriesService";
import { IncomeTab } from "./income.types";

interface Category {
  id: number;
  name: string;
}

interface Props {
  activeTab: IncomeTab;
  showModal: boolean;
  editingId: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function IncomeModal({
  activeTab,
  showModal,
  editingId,
  formData,
  setFormData,
  onClose,
  onSubmit,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (showModal) loadCategories();
  }, [showModal]);

  const loadCategories = async () => {
    try {
      const { data } = await CategoriesService.getAll();
      setCategories(data);
      if (!formData.categoryId && data.length > 0) {
        setFormData({ ...formData, categoryId: data[0].id });
      }
    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const { data } = await CategoriesService.create({
        name,
        description: "",
        isActive: true,
      });
      setCategories((prev) => [...prev, data]);
      setFormData({ ...formData, categoryId: data.id });
      setNewCategoryName("");
      setShowCategoryForm(false);
    } catch (error) {
      console.error("Error creando categoría:", error);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {editingId ? "Editar" : "Nuevo"} Ingreso
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(v) => setFormData({ ...formData, name: v })}
          />
          <Input
            label="Cantidad"
            type="number"
            value={formData.amount}
            onChange={(v) => setFormData({ ...formData, amount: v })}
          />
          <Input
            label="Fecha"
            type="date"
            value={formData.date}
            onChange={(v) => setFormData({ ...formData, date: v })}
          />

          {/* Categoría con creación inline */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categoría
            </label>
            <div className="flex space-x-2">
              <select
                value={formData.categoryId || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    categoryId: Number(e.target.value),
                  })
                }
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {categories.length === 0 && (
                  <option value="">Sin categorías</option>
                )}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                +
              </button>
            </div>

            {showCategoryForm && (
              <div className="mt-2 space-y-2">
                <Input
                  label="Nueva categoría"
                  value={newCategoryName}
                  onChange={setNewCategoryName}
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Guardar categoría
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryForm(false);
                      setNewCategoryName("");
                    }}
                    className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <Textarea
            label="Notas (opcional)"
            value={formData.notes}
            onChange={(v) => setFormData({ ...formData, notes: v })}
          />

          {/* Frecuencia siempre visible */}
          <Select
            label="Frecuencia"
            value={formData.frequency}
            onChange={(v) => setFormData({ ...formData, frequency: v })}
            options={["monthly", "weekly", "biweekly", "yearly"]}
          />

          {/* Fecha inicio */}
          <Input
            label="Fecha de inicio"
            type="date"
            value={formData.start_date}
            onChange={(v) => setFormData({ ...formData, start_date: v })}
          />

          {/* Checkbox indefinido + Fecha fin */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isIndefinite || false}
              onChange={(e) =>
                setFormData({ ...formData, isIndefinite: e.target.checked })
              }
            />
            <label className="text-sm text-slate-700">
              Sin fecha de fin (indefinido)
            </label>
          </div>

          <Input
            label="Fecha de fin"
            type="date"
            value={formData.end_date}
            onChange={(v) => setFormData({ ...formData, end_date: v })}
            disabled={formData.isIndefinite}
          />

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
            >
              {editingId ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
      />
    </div>
  );
}
