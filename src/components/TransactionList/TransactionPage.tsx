import { useEffect, useMemo, useState } from "react";
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
type SortBy = "description" | "bank" | "counterparty" | "date" | "amount";
type SortDir = "asc" | "desc";

interface Category { id: number; name: string; }

export function TransactionPage({ mode, service }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("fixed");
  const [allRaw, setAllRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  // search + debounce
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [bankMap, setBankMap] = useState<Record<string, string>>({});

  // sorting state
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // debounce input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    if (user) {
      loadBanks();
      loadData();
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
      setAllRaw(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (error) {
      console.error("Error loading data:", error);
      setAllRaw([]);
    } finally {
      setLoading(false);
    }
  };

  // normalize + filter + search + sort
  const items = useMemo(() => {
    const normalized = (allRaw || []).map((i: any) => {
      const bankId = i.bankId ?? i.BankId ?? null;
      const cpBankId = i.transferCounterpartyBankId ?? i.TransferCounterpartyBankId ?? i.counterpartyBankId ?? null;
      return {
        ...i,
        id: i.id ?? i.Id,
        description: i.description ?? i.name ?? "",
        amount: Number(i.amount ?? i.Amount ?? 0),
        date: i.date ?? i.Date ?? null,
        start_date: i.start_Date ?? i.start_date ?? i.startDate ?? null,
        end_date: i.end_Date ?? i.end_date ?? i.endDate ?? null,
        category: i.categoryName ?? i.category ?? i.CategoryName ?? "",
        frequency: i.frequency ?? i.Frequency ?? null,
        is_active: i.isActive ?? i.is_active ?? null,
        notes: i.notes ?? i.Notes ?? "",
        type: (i.type ?? i.Type ?? i.source ?? i.Source ?? "") as string,
        bankId,
        bankName: i.bankName ?? (i.bank && i.bank.name ? `${i.bank.name}${i.bank.entity ? ` | ${i.bank.entity}` : ""}` : (bankId ? bankMap[bankId] ?? "" : "")),
        counterpartyBankId: cpBankId,
        counterpartyBankName: i.counterpartyBankName ?? (cpBankId ? bankMap[cpBankId] ?? "" : "")
      };
    });

    // tab filtering
    const byTab = normalized.filter((r: any) => {
      const t = String((r.type ?? "").toLowerCase());
      if (activeTab === "fixed") return t === "fixed";
      if (activeTab === "variable") return t === "variable";
      return t === "temporary" || String(r.frequency ?? "").toLowerCase() === "temporary";
    });

    // search
    const q = debouncedSearch;
    const filtered = q
      ? byTab.filter((r: any) => {
          const parts = [
            r.description,
            r.notes,
            r.category,
            r.bankName,
            r.counterpartyBankName,
            r.transferReference ?? r.transferReference ?? "",
            r.date ? new Date(r.date).toLocaleDateString("es-ES") : "",
            String(r.amount),
          ];
          return parts.some((p) => (p ?? "").toString().toLowerCase().includes(q));
        })
      : byTab;

    // sorting
    const sorted = [...filtered].sort((a: any, b: any) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "description") {
        return dir * String(a.description ?? "").localeCompare(String(b.description ?? ""), undefined, { sensitivity: "base" });
      }
      if (sortBy === "bank") {
        return dir * String(a.bankName ?? "").localeCompare(String(b.bankName ?? ""), undefined, { sensitivity: "base" });
      }
      if (sortBy === "counterparty") {
        return dir * String(a.counterpartyBankName ?? "").localeCompare(String(b.counterpartyBankName ?? ""), undefined, { sensitivity: "base" });
      }
      if (sortBy === "amount") {
        return dir * (Number(a.amount ?? 0) - Number(b.amount ?? 0));
      }
      // date
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return dir * (da - db);
    });

    return sorted;
  }, [allRaw, bankMap, activeTab, debouncedSearch, sortBy, sortDir]);

  // CRUD helpers
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
      counterpartyBankId: item.counterpartyBankId ?? item.transferCounterpartyBankId ?? "",
      bankId: item.bankId ?? null,
      source: item.type ?? item.source ?? ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`¿Eliminar este ${mode === "income" ? "ingreso" : "gasto"}?`)) return;
    try {
      await service.delete(id);
      await loadData();
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
      await loadData();
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

  // toggle sort column
  const requestSort = (col: SortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
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

      {/* SEARCH + COUNT */}
      <div className="flex items-center justify-between mt-3">
        <input
          type="text"
          placeholder="Buscar por descripción, notas, categoría, banco, referencia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-2xl px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <div className="ml-3 text-sm text-slate-500">
          {items.length} resultados
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
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
            sortBy={sortBy}
            sortDir={sortDir}
            onRequestSort={requestSort}
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