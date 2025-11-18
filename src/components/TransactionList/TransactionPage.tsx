import { useEffect, useState } from "react";
import { ExportButton } from "../../components/TransactionImportExport/ExportButton";
import { ImportModal } from "../../components/TransactionImportExport/ImportModal";
import { TransactionModal } from "../../components/TransactionModal/TransactionModal";
import { useAuth } from "../../contexts/AuthContext";
import bankService from "../../services/bankService";
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

  // New: searchTerm and bank map
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [bankMap, setBankMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadBanks(); // load bank names first or concurrently
      loadData();
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const loadBanks = async () => {
    try {
      const { data } = await bankService.getAll();
      const map: Record<string, string> = {};
      (data || []).forEach((b: any) => {
        map[b.id] = `${b.name}${b.entity ? ` | ${b.entity}` : ""}`;
      });
      setBankMap(map);
    } catch (error) {
      console.error("Error loading banks:", error);
      setBankMap({});
    }
  };

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
      const all = (data || []).map((i: any) => {
        // normalize property names to expected shape for the list
        return {
          ...i,
          bankName: i.bankName ?? i.bank?.name ?? bankMap[i.bankId] ?? "",
          // sometimes payload uses different names:
          start_date: i.start_Date ?? i.start_date ?? i.startDate ?? null,
          end_date: i.end_Date ?? i.end_date ?? i.endDate ?? null,
          date: i.date ?? i.Date ?? null,
          category: i.categoryName ?? i.category ?? i.CategoryName ?? null,
          // ensure type/source present
          type: (i.type ?? i.Type ?? i.source ?? i.Source ?? "") as string,
        };
      });

      // first filter by active tab (Fixed/Variable/Temporary). Keep original behavior:
      const filteredByTab = all.filter((i: any) =>
        activeTab === "fixed"
          ? (String(i.type).toLowerCase() === "fixed" || String(i.type).toLowerCase() === "fixed")
          : activeTab === "variable"
          ? (String(i.type).toLowerCase() === "variable" || String(i.type).toLowerCase() === "variable")
          : (String(i.type).toLowerCase() === "temporary" || String(i.type).toLowerCase() === "temporary" || String(i.frequency ?? "").toLowerCase() === "temporary")
      );

      // apply search filter over visible fields
      const q = searchTerm.trim().toLowerCase();
      const final = q
        ? filteredByTab.filter((i: any) => {
            const parts = [
              i.description,
              i.name,
              i.notes,
              i.category,
              i.bankName,
              i.transferReference,
              i.date,
              String(i.amount),
            ];
            return parts.some((p) => (p ?? "").toString().toLowerCase().includes(q));
          })
        : filteredByTab;

      setItems(final);
      setSelectedIds([]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Limpio y delegado (create/update flows use same handler)
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
      await loadData();
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
      start_Date: formatDate(item.start_date ?? item.start_Date ?? null),
      end_Date: formatDate(item.end_date ?? item.end_Date ?? null),
      isIndefinite: item.isIndefinite ?? !item.end_date,
      frequency: item.frequency ?? "monthly",
      loanId: item.loanId ?? null,
      userId: item.userId ?? "",
      isTransfer: item.isTransfer ?? false,
      transferReference: item.transferReference ?? "",
      counterpartyBankId: item.transferCounterpartyBankId ?? item.counterpartyBankId ?? "",
      bankId: item.bankId ?? null,
      source: item.type ?? item.source ?? ""
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

      {/* Search bar (visible under tabs) */}
      <div className="flex items-center justify-between mt-3">
        <input
          type="text"
          placeholder="Buscar por descripción, notas, categoría, banco, referencia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-2xl px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <div className="ml-3 text-sm text-slate-500">{items.length} resultados</div>
      </div>

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