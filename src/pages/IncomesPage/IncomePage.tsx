import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { TransactionModal } from "../../components/TransactionModal/TransactionModal";
import { useAuth } from "../../contexts/AuthContext";
import { CategoriesService } from "../../services/categoriesService"; // agregado
import { IncomesService } from "../../services/incomesService";
import {
  FixedIncome,
  IncomeTab,
  TemporaryIncome,
  VariableIncome,
} from "./income.types";
import { getInitialFormData } from "./income.utils";
import { IncomeList } from "./IncomeList";
import { IncomeTabs } from "./IncomeTabs";


export default function IncomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<IncomeTab>("fixed");
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
  const [variableIncomes, setVariableIncomes] = useState<VariableIncome[]>([]);
  const [temporaryIncomes, setTemporaryIncomes] = useState<TemporaryIncome[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [categories, setCategories] = useState<CategoryDto[]>([]); // agregado

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    if (user) loadCategories(); // carga única de categories
  }, [user]);

  const loadCategories = async () => {
    try {
      const { data } = await CategoriesService.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await IncomesService.getAll();

      // Normaliza claves que puedan venir con variantes (end_Date, start_Date, Date, etc.)
      const normalized = (data || []).map((i: any) => {
        return {
          ...i,
          // normaliza date
          date: i.date ?? i.Date ?? null,
          // normaliza start_date
          start_date: i.start_date ?? i.start_Date ?? i.startDate ?? null,
          // normaliza end_date (maneja end_Date con D mayúscula)
          end_date: i.end_date ?? i.end_Date ?? i.endDate ?? null,
        };
      });

      setFixedIncomes(normalized.filter((i: any) => i.type === "Fixed"));
      setVariableIncomes(normalized.filter((i: any) => i.type === "Variable"));
      setTemporaryIncomes(normalized.filter((i: any) => i.type === "Temporary"));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => {
  // Si ya viene en YYYY-MM-DD, úsalo; si no, normaliza
  const date = new Date(d);
  return !isNaN(date.getTime())
    ? date.toISOString().split("T")[0]
    : d; // evita romper si ya está correcto
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validaciones básicas
  const amountNum = parseFloat(formData.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    alert("La cantidad debe ser un número mayor que 0.");
    return;
  }
  if (!formData.name || formData.name.trim().length === 0) {
    alert("El nombre/descripcion es obligatorio.");
    return;
  }
  if (!formData.date) {
    alert("La fecha es obligatoria.");
    return;
  }
  if (!formData.categoryId || formData.categoryId <= 0) {
    alert("Selecciona una categoría válida.");
    return;
  }

  const startDate = formData.start_date ? formatDate(formData.start_date) : null;
  const endDate = formData.isIndefinite
    ? null
    : formData.end_date
    ? formatDate(formData.end_date)
    : null;

  if (startDate && endDate && endDate < startDate) {
    alert("La fecha de fin no puede ser anterior a la fecha de inicio.");
    return;
  }

  const payload = {
    amount: amountNum,
    description: formData.name.trim(),
    date: formatDate(formData.date),
    type:
      activeTab === "fixed"
        ? "Fixed"
        : activeTab === "variable"
        ? "Variable"
        : "Temporary",
    categoryId: formData.categoryId,
    start_date: startDate,          // o elimina si tu API no lo usa
    end_date: endDate,              // null si indefinido
    notes: formData.notes?.trim() || "", // evita null si el backend no lo admite
    };

    // Útil para depurar
    console.log("Payload enviado:", payload);

    try {
      if (editingId) {
        await IncomesService.update(parseInt(editingId, 10), payload);
      } else {
        await IncomesService.create(payload);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(getInitialFormData());
      loadData();
    } catch (error: any) {
      // Muestra detalles del backend si los hay
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Error inesperado";
      console.error("Error saving income:", error);
    }
  };

  const handleEdit = (item: IncomeDto) => {
    setEditingId(String(item.id));

    setFormData({
      ...getInitialFormData(),
      name: item.description || "",
      amount: String(item.amount ?? ""),
      date: item.date ? formatDate(item.date) : "",
      categoryId: item.categoryId ?? 0,
      notes: item.notes ?? "",
      start_date: item.start_date ? formatDate(item.start_date) : "",   // normalizado
      end_date: item.end_date ? formatDate(item.end_date) : "",         // normalizado
      isIndefinite: item.end_date === null,
      frequency: item.frequency ?? "monthly",
    });

    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este ingreso?")) return;
    try {
      await IncomesService.delete(id);
      loadData();
    } catch (error) {
      console.error("Error deleting income:", error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(getInitialFormData());
  };

  const getCurrentList = () => {
    if (activeTab === "fixed") return fixedIncomes;
    if (activeTab === "variable") return variableIncomes;
    return temporaryIncomes;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">
          Gestión de Ingresos
        </h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData(getInitialFormData());
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Ingreso
        </button>
      </div>

      <IncomeTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            Cargando ingresos...
          </div>
        ) : (
          <IncomeList
            activeTab={activeTab}
            items={getCurrentList()}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      <TransactionModal
        type="income"
        showModal={showModal}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        categories={categories} 
        setCategories={setCategories} 
      />
    </div>
  );
}

export interface IncomeDto {
  id: number;
  amount: number;
  description: string;
  date: string;          // ISO string
  type: "Fixed" | "Variable" | "Temporary";
  categoryId: number;
  start_date?: string | null; // normalizado
  end_date?: string | null;   // normalizado
  notes?: string | null;
  frequency?: string;
}

export interface CategoryDto {
  id: number;
  name: string;
}