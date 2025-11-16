import { useEffect, useState } from "react";
import { ExportButton } from "../../components/TransactionImportExport/ExportButton";
import { ImportModal } from "../../components/TransactionImportExport/ImportModal";
import { TransactionModal } from "../../components/TransactionModal/TransactionModal";
import { useAuth } from "../../contexts/AuthContext";
import { CategoriesService } from "../../services/categoriesService";
import transferService from "../../services/transferService";
import { TransactionList } from "./TransactionList";
import { TransactionTabs } from "./TransactionTabs";
import { formatDate, getInitialFormData } from "./transaction.utils";

interface Props {
  mode: "income" | "expense";
  service: {
    getAll: () => Promise<any>;
    getById?: (id: number) => Promise<any>;
    create: (payload: any) => Promise<any>;
    update: (id: number, payload: any) => Promise<any>;
    delete: (id: number) => Promise<any>;
  };
}

type Tab = "fixed" | "variable" | "temporary";
interface Category { id: number; name: string; }

export function TransactionPage({ mode, service }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("fixed");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      loadCategories();
    }
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
      setSelectedIds([]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Limpio y delegado
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (formData.isTransfer) {
        await transferService.createTransfer({
          date: formData.date,
          amount: parseFloat(formData.amount),
          fromBankId: parseFloat(formData.amount) < 0 ? formData.bankId : formData.counterpartyBankId,
          toBankId: parseFloat(formData.amount) < 0 ? formData.counterpartyBankId : formData.bankId,
          description: formData.description,
          notes: formData.notes,
          reference: formData.transferReference,
          categoryId: formData.categoryId
        });
      } else if (editingId) {
        await service.update(parseInt(editingId), formData);
      } else {
        await service.create(formData);
      }

      setShowModal(false);
      setEditingId(null);
      setFormData(getInitialFormData());
      loadData();
    } catch (error) {
      console.error("Error guardando transacción:", error);
      alert("Ocurrió un error al guardar. Revisa la consola.");
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(String(item.id));
    setFormData({
      ...getInitialFormData(),
      description: item.description,
      amount: String(item.amount),
      date: formatDate(item.date),
      categoryId: item.categoryId ?? 0,
      notes: item.notes ?? "",
      start_Date: formatDate(item.start_Date ?? item.start_date ?? null),
      end_Date: formatDate(item.end_Date ?? item.end_date ?? null),
      isIndefinite: item.isIndefinite ?? !item.end_date,
      frequency: item.frequency ?? "monthly",
      loanId: item.loanId ?? null,
      userId: item.userId ?? "",
      isTransfer: item.isTransfer ?? false,
      transferReference: item.transferReference ?? "",
      counterpartyBankId:
        item.transferCounterpartyBankId ?? item.counterpartyBankId ?? "",
      bankId: item.bankId ?? "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`¿Eliminar este ${mode === "income" ? "ingreso" : "gasto"}?`)) return;
    try {
      await service.delete(id);
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === items.length ? [] : items.map((i) => i.id));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.length} ${mode === "income" ? "ingresos" : "gastos"}?`)) return;

    try {
      setDeleting(true);
      await Promise.all(selectedIds.map((id) => service.delete(id)));
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error("Error eliminando múltiples:", error);
    } finally {
      setDeleting(false);
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
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
            >
              {deleting && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              )}
              {deleting ? "Eliminando..." : `Eliminar seleccionados (${selectedIds.length})`}
            </button>
          )}
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

      {items.length > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleSelectAll}
            className="text-xs px-3 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-100 transition"
          >
            {selectedIds.length === items.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
        </div>
      )}

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
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
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
          userId={user.id}
        />
      )}
    </div>
  );
}
