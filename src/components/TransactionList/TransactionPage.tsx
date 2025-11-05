
import { AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { ExportButton } from "../../components/TransactionImportExport/ExportButton";
import { ImportModal } from "../../components/TransactionImportExport/ImportModal";
import { TransactionModal } from "../../components/TransactionModal/TransactionModal";
import { useAuth } from "../../contexts/AuthContext";
import { CategoriesService } from "../../services/categoriesService";
import { TransactionList } from "./TransactionList";
import { TransactionTabs } from "./TransactionTabs";
import { getInitialFormData } from "./transaction.utils";

interface Props {
  mode: "income" | "expense";
  service: {
    getAll: () => Promise<AxiosResponse<any[]>>;
    getById?: (id: number) => Promise<AxiosResponse<any>>;
    create: (payload: any) => Promise<AxiosResponse<any>>;
    update: (id: number, payload: any) => Promise<AxiosResponse<any>>;
    delete: (id: number) => Promise<AxiosResponse<any>>;
  };
}

type Tab = "fixed" | "variable" | "temporary";

export function TransactionPage({ mode, service }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("fixed");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [categories, setCategories] = useState<any[]>([]);

  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const loadCategories = async () => {
    try {
      const { data } = await CategoriesService.getAll();
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await service.getAll();
      const filtered = (data || []).filter((i: any) =>
        activeTab === "fixed"
          ? i.type === "Fixed"
          : activeTab === "variable"
          ? i.type === "Variable"
          : i.type === "Temporary"
      );
      setItems(filtered);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      amount: parseFloat(formData.amount),
      description: formData.name,
      date: formData.date,
      type:
        activeTab === "fixed"
          ? "Fixed"
          : activeTab === "variable"
          ? "Variable"
          : "Temporary",
      start_date: formData.start_date,
      end_date: formData.isIndefinite ? null : formData.end_date,
      notes: formData.notes || null,
      categoryId: formData.categoryId,
      loanId:
        mode === "expense" &&
        (formData.categoryId === 100 || formData.categoryId === 101)
          ? formData.loanId
          : null,
    };

    try {
      if (editingId) {
        await service.update(parseInt(editingId), payload);
      } else {
        await service.create(payload);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(getInitialFormData());
      loadData();
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(String(item.id));
    setFormData({
      ...getInitialFormData(),
      name: item.description || item.name,
      amount: String(item.amount),
      date: item.date,
      categoryId: item.categoryId ?? 0,
      notes: item.notes ?? "",
      start_date: item.start_date ?? "",
      end_date: item.end_date ?? "",
      isIndefinite: !item.end_date,
      frequency: item.frequency ?? "monthly",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`¿Estás seguro de eliminar este ${mode === "income" ? "ingreso" : "gasto"}?`)) return;
    try {
      await service.delete(id);
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(getInitialFormData());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">
          Gestión de {mode === "income" ? "Ingresos" : "Gastos"}
        </h1>
        <div className="flex items-center space-x-2">
          <ExportButton mode={mode} />
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
          >
            Importar plantilla
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData(getInitialFormData());
              setShowModal(true);
            }}
            className={`flex items-center px-4 py-2 ${
              mode === "income"
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-red-500 hover:bg-red-600"
            } text-white rounded-lg transition`}
          >
            Nuevo {mode === "income" ? "Ingreso" : "Gasto"}
          </button>
        </div>
      </div>

      <TransactionTabs activeTab={activeTab} setActiveTab={setActiveTab} mode={mode} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            Cargando {mode === "income" ? "ingresos" : "gastos"}...
          </div>
        ) : (
          <TransactionList
            activeTab={activeTab}
            mode={mode}
            transactions={items}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {user && (
      <TransactionModal
        type={mode}
        showModal={showModal}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        categories={categories}
        setCategories={setCategories}
        userId={user.id}
      />
    )}

      {user && (
        <ImportModal
          mode={mode}
          show={showImportModal}
          onClose={() => setShowImportModal(false)}
          userId={user.id} // 👈 pasa el userId real
        />
      )}
    </div>
  );
}
