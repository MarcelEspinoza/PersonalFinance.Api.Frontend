import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ExportButton } from "../../components/TransactionImportExport/ExportButton";
import { ImportModal } from "../../components/TransactionImportExport/ImportModal";
import { TransactionModal } from "../../components/TransactionModal/TransactionModal";
import { useAuth } from "../../contexts/AuthContext";
import bankService from "../../services/bankService";
import { CategoriesService } from "../../services/categoriesService";
import transferService from "../../services/transferService";
import { formatDate, getInitialFormData } from "./transaction.utils";
import { TransactionList } from "./TransactionList";

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

type SortBy = "description" | "bank" | "counterparty" | "date" | "amount" | "type";
type SortDir = "asc" | "desc";

interface Category { id: number; name: string; }

export function TransactionPage({ mode, service }: Props) {
  const { user } = useAuth();

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
  const [bankOptions, setBankOptions] = useState<{ id: string; label: string }[]>([]);

  // filters
  const [originFilter, setOriginFilter] = useState<string | null>(null);
  const [destFilter, setDestFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<string | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<string | null>(null);

  // sorting
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // pagination/infinite scroll (client-side)
  const pageSize = 20;
  const [visibleCount, setVisibleCount] = useState<number>(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // debounce input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    if (!user) return;
    loadBanks();
    loadData();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadBanks = async () => {
    try {
      const { data } = await bankService.getAll();
      const map: Record<string, string> = {};
      const opts: { id: string; label: string }[] = [];
      (data || []).forEach((b: any) => {
        const label = `${b.name}${b.entity ? ` | ${b.entity}` : ""}`;
        map[String(b.id)] = label;
        opts.push({ id: String(b.id), label });
      });
      setBankMap(map);
      setBankOptions(opts);
    } catch (error) {
      console.error("Error loading banks:", error);
      setBankMap({});
      setBankOptions([]);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await CategoriesService.getAll();
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await service.getAll();
      setAllRaw(Array.isArray(data) ? data : []);
      setSelectedIds([]);
      setVisibleCount(pageSize);
    } catch (error) {
      console.error("Error loading data:", error);
      setAllRaw([]);
    } finally {
      setLoading(false);
    }
  };

  // normalize + apply filters + search + sort
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
        category: i.categoryName ?? i.category ?? i.CategoryName ?? "",
        categoryId: i.categoryId ?? i.CategoryId ?? 0,
        frequency: i.frequency ?? i.Frequency ?? null,
        is_active: i.isActive ?? i.is_active ?? null,
        type: (i.type ?? i.Type ?? i.source ?? i.Source ?? "") as string,
        bankId: bankId !== null ? String(bankId) : null,
        bankName: i.bankName ?? (i.bank && i.bank.name ? `${i.bank.name}${i.bank.entity ? ` | ${i.bank.entity}` : ""}` : (bankId ? bankMap[String(bankId)] ?? "" : "")),
        counterpartyBankId: cpBankId !== null ? String(cpBankId) : null,
        counterpartyBankName: i.counterpartyBankName ?? (cpBankId ? bankMap[String(cpBankId)] ?? "" : ""),
        transferReference: i.transferReference ?? i.TransferReference ?? ""
      };
    });

    // apply filters
    let filtered = normalized;
    if (originFilter) filtered = filtered.filter((r: any) => (r.bankId ?? "") === originFilter);
    if (destFilter) filtered = filtered.filter((r: any) => (r.counterpartyBankId ?? "") === destFilter);
    if (categoryFilter !== null) filtered = filtered.filter((r: any) => Number(r.categoryId) === Number(categoryFilter));
    if (typeFilter) filtered = filtered.filter((r: any) => String(r.type ?? "").toLowerCase() === String(typeFilter).toLowerCase());
    if (startDateFilter) {
      filtered = filtered.filter((r: any) => {
        if (!r.date) return false;
        return new Date(r.date) >= new Date(startDateFilter as string);
      });
    }
    if (endDateFilter) {
      filtered = filtered.filter((r: any) => {
        if (!r.date) return false;
        const end = new Date(endDateFilter as string);
        end.setHours(23, 59, 59, 999);
        return new Date(r.date) <= end;
      });
    }

    // search
    const q = debouncedSearch;
    const searched = q
      ? filtered.filter((r: any) => {
          const parts = [
            r.description,
            r.category,
            r.bankName,
            r.counterpartyBankName,
            r.transferReference ?? "",
            r.date ? new Date(r.date).toLocaleDateString("es-ES") : "",
            String(r.amount),
            r.type
          ];
          return parts.some((p) => (p ?? "").toString().toLowerCase().includes(q));
        })
      : filtered;

    // sort
    const sorted = [...searched].sort((a: any, b: any) => {
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
      if (sortBy === "type") {
        return dir * String(a.type ?? "").localeCompare(String(b.type ?? ""), undefined, { sensitivity: "base" });
      }
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return dir * (da - db);
    });

    return sorted;
  }, [allRaw, bankMap, debouncedSearch, originFilter, destFilter, categoryFilter, typeFilter, startDateFilter, endDateFilter, sortBy, sortDir]);

  // infinite scroll: observe sentinel and increase visibleCount
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setTimeout(() => {
            setVisibleCount((v) => Math.min(items.length, v + pageSize));
            loadingMoreRef.current = false;
          }, 200);
        }
      });
    }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [items.length]);

  // reset visibleCount when filters/search change
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [debouncedSearch, originFilter, destFilter, categoryFilter, typeFilter, startDateFilter, endDateFilter, sortBy, sortDir]);

  const visibleItems = items.slice(0, visibleCount);

  // Export visible/current view to Excel (.xlsx) using SheetJS, with numeric formatting and summary sheet
  const exportVisibleToExcel = () => {
    try {
      // Map visible items to simple objects for SheetJS
      const rows = visibleItems.map((r) => ({
        Id: r.id,
        Description: r.description ?? "",
        Bank: r.bankName ?? "",
        Counterparty: r.counterpartyBankName ?? "",
        Date: r.date ? new Date(r.date).toISOString() : "",
        Category: r.category ?? "",
        Type: r.type ?? "",
        Amount: r.amount ?? 0,
        Reference: r.transferReference ?? "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows, { dateNF: "yyyy-mm-dd" });
      // Ensure Amount is numeric by converting column cells
      for (let R = 2; R <= rows.length + 1; ++R) {
        const cell = ws[`H${R}`]; // Amount column (H)
        if (cell && typeof cell.v === "string") {
          const num = Number(cell.v);
          if (!Number.isNaN(num)) cell.v = num;
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");

      // Summary sheet: totals by category and by bank
      const totalsByCategory: Record<string, number> = {};
      const totalsByBank: Record<string, number> = {};
      visibleItems.forEach((r) => {
        const cat = r.category || "Sin categoría";
        totalsByCategory[cat] = (totalsByCategory[cat] || 0) + (Number(r.amount) || 0);
        const bank = r.bankName || "Sin banco";
        totalsByBank[bank] = (totalsByBank[bank] || 0) + (Number(r.amount) || 0);
      });

      const catRows: Array<[string, number] | [string, string]> = [["Category", "Total"]];
      Object.entries(totalsByCategory).forEach(([k, v]) => catRows.push([k, v]));
      const bankRows: Array<[string, number] | [string, string]> = [["Bank", "Total"]];
      Object.entries(totalsByBank).forEach(([k, v]) => bankRows.push([k, v]));

      const wsCat = XLSX.utils.aoa_to_sheet(catRows);
      const wsBank = XLSX.utils.aoa_to_sheet(bankRows);
      XLSX.utils.book_append_sheet(wb, wsCat, "TotalsByCategory");
      XLSX.utils.book_append_sheet(wb, wsBank, "TotalsByBank");

      // Column widths for Transactions sheet
      const wscols = [
        { wch: 8 },   // Id
        { wch: 60 },  // Description
        { wch: 20 },  // Bank
        { wch: 20 },  // Counterparty
        { wch: 14 },  // Date
        { wch: 20 },  // Category
        { wch: 12 },  // Type
        { wch: 12 },  // Amount
        { wch: 30 },  // Reference
      ];
      (ws as any)["!cols"] = wscols;

      const filename = `transactions_view_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Error exporting to Excel", err);
      alert("Error exportando a Excel");
    }
  };

  // CRUD handlers (create/update/delete)
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
    setSelectedIds(selectedIds.length === visibleItems.length ? [] : visibleItems.map((i) => i.id));
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

  const requestSort = (col: SortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-[1800px] mx-auto px-6 space-y-4">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-slate-800">
            Gestión de {mode === "income" ? "Ingresos" : "Gastos"}
          </h1>

          {/* BUTTON ROW (moved up so filters align under it) */}
          <div className="flex items-center gap-3">
            <button
              onClick={exportVisibleToExcel}
              className="px-4 h-10 py-2 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-50 hover:bg-emerald-200 transition"
            >
              Exportar vista (Excel)
            </button>

            <ExportButton mode={mode} />

            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 h-10 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
            >
              Importar plantilla
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex items-center gap-2 px-4 h-10 py-2 bg-rove-500 hover:bg-rose-600 text-white rounded-lg transition disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : `Eliminar (${selectedIds.length})`}
              </button>
            )}

            <button
              onClick={() => {
                setEditingId(null);
                setFormData(getInitialFormData());
                setShowModal(true);
              }}
              className={`flex items-center px-4 h-10 py-2 ${
                mode === "income" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
              } text-white rounded-lg transition`}
            >
              Nuevo {mode === "income" ? "Ingreso" : "Gasto"}
            </button>
          </div>
        </div>

        {/* SEARCH + FILTERS (incluye filtro de fecha) */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4">
          <input
            type="text"
            placeholder="Buscar por descripción, categoría, banco, referencia, importe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />

          <div className="flex items-center gap-3">
            <select
              value={originFilter ?? ""}
              onChange={(e) => setOriginFilter(e.target.value || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Todos orígenes</option>
              {bankOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>

            <select
              value={destFilter ?? ""}
              onChange={(e) => setDestFilter(e.target.value || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Todos destinos</option>
              {bankOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>

            <select
              value={categoryFilter !== null ? String(categoryFilter) : ""}
              onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Todas categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>

            <select
              value={typeFilter ?? ""}
              onChange={(e) => setTypeFilter(e.target.value || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Todos tipos</option>
              <option value="fixed">Fixed</option>
              <option value="variable">Variable</option>
              <option value="temporary">Temporary</option>
            </select>

            {/* Date range */}
            <input
              type="date"
              value={startDateFilter ?? ""}
              onChange={(e) => setStartDateFilter(e.target.value || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="date"
              value={endDateFilter ?? ""}
              onChange={(e) => setEndDateFilter(e.target.value || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="ml-auto text-sm text-slate-500">
            {visibleItems.length} visibles · {items.length} filtrados / {allRaw.length} totales
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Cargando {mode === "income" ? "ingresos" : "gastos"}...
            </div>
          ) : (
            <>
              <TransactionList
                mode={mode}
                transactions={visibleItems}
                onEdit={handleEdit}
                onDelete={handleDelete}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                sortBy={sortBy}
                sortDir={sortDir}
                onRequestSort={requestSort}
                highlight={debouncedSearch}
              />

              <div ref={sentinelRef} className="h-6" />

              {visibleCount < items.length && (
                <div className="p-4 text-center text-slate-500">Cargando más...</div>
              )}
            </>
          )}
        </div>
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