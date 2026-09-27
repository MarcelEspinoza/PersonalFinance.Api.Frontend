import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../PageHeader";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { TransactionModal } from "../../components/TransactionModal/TransactionModal";
import { useAuth } from "../../contexts/AuthContext";
import { LedgerService } from "../../services/ledgerService";
import { CategoriesService } from "../../services/categoriesService";
import { formatDate, getInitialFormData } from "./transaction.utils";
import { TransactionList } from "./TransactionList";
import { money, monthLabel, monthName, nextMonth, previousMonth } from "../../utils/civilDate";

interface Props {
  mode: "income" | "expense";
  compact?: boolean;
  service: {
    getAll: (year?: number, month?: number) => Promise<any>;
    getById?: (id: number) => Promise<any>;
    create: (payload: any) => Promise<any>;
    update: (id: number, payload: any) => Promise<any>;
    delete: (id: number) => Promise<any>;
  };
}

type SortBy = "description" | "bank" | "counterparty" | "date" | "amount" | "type";
type SortDir = "asc" | "desc";

interface Category { id: number; name: string; }

export function TransactionPage({ mode, service, compact = false }: Props) {
  const { user } = useAuth();
  const now = new Date();

  const [allRaw, setAllRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

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

  const pageSize = 25;
  const [page, setPage] = useState(1);

  // debounce input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    if (!user) return;
    loadBanks();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedYear, selectedMonth]);

  const loadBanks = async () => {
    try {
      const data = await LedgerService.getAccounts(true);
      const map: Record<string, string> = {};
      const opts: { id: string; label: string }[] = [];
      (data || []).forEach((b: any) => {
        const id = String(b.id);
        const label = `${b.name}${b.entity ? ` | ${b.entity}` : ""}`;
        map[id] = label;
        if (b.isActive) opts.push({ id, label });
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
      const { data } = await service.getAll(selectedYear, selectedMonth);
      setAllRaw(Array.isArray(data) ? data : []);
      setSelectedIds([]);
      setPage(1);
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

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, originFilter, destFilter, categoryFilter, typeFilter, startDateFilter, endDateFilter, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  const monthTotal = allRaw.reduce((sum, item) => sum + Number(item.amount ?? item.Amount ?? 0), 0);
  const monthAverage = allRaw.length > 0 ? monthTotal / allRaw.length : 0;
  const yearOptions = Array.from({ length: 15 }, (_, index) => now.getFullYear() + 2 - index);

  const changeMonth = (direction: "previous" | "next") => {
    const target = direction === "previous"
      ? previousMonth(selectedYear, selectedMonth)
      : nextMonth(selectedYear, selectedMonth);
    setSelectedYear(target.year);
    setSelectedMonth(target.month);
  };

  const goToCurrentMonth = () => {
    const current = new Date();
    setSelectedYear(current.getFullYear());
    setSelectedMonth(current.getMonth() + 1);
  };

  // Modal submit handler: receive normalized payload from modal and call service
  const handleModalSubmit = async (payload: any) => {
    try {
      // Ensure amount is numeric (modal already did but double-check)
      if (payload.amount && typeof payload.amount === "string") {
        payload.amount = Number(String(payload.amount).replace(",", "."));
      }

      if (editingId) {
        // Update existing
        await service.update(parseInt(editingId), payload);
      } else {
        // Create new
        await service.create(payload);
      }

      setShowModal(false);
      setEditingId(null);
      setFormData(getInitialFormData());
      await loadData();
    } catch (error) {
      console.error("Error guardando transacción (modal submit):", error);
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
      // keep source if present, else use type value (source should be shown in modal)
      source: item.source ?? item.type ?? ""
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
    const visibleIds = visibleItems.map((item) => item.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
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

  const allSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.includes(item.id));

  return (
    <div className={compact ? "pb-8" : "py-8"}>
      <div className="mx-auto max-w-[1800px] space-y-6 px-4 sm:px-6">
        <PageHeader
          title={compact ? (mode === "income" ? "Ingresos" : "Gastos") : "Gestión de " + (mode === "income" ? "Ingresos" : "Gastos")}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {selectedIds.length > 0 && (
                <Button type="button" variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
                  {deleting ? "Eliminando..." : "Eliminar (" + selectedIds.length + ")"}
                </Button>
              )}
              <Button type="button" onClick={() => {
                setEditingId(null);
                setFormData(getInitialFormData());
                setShowModal(true);
              }}>
                Nuevo {mode === "income" ? "Ingreso" : "Gasto"}
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
            <Button type="button" variant="outline" size="icon" onClick={() => changeMonth("previous")} aria-label="Mes anterior">
              <ChevronLeft />
            </Button>
            <div className="min-w-44 px-2 text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Periodo</div>
              <div className="text-lg font-semibold capitalize">{monthLabel(selectedYear, selectedMonth)}</div>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => changeMonth("next")} aria-label="Mes siguiente">
              <ChevronRight />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={goToCurrentMonth}>
              Mes actual
            </Button>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="h-9 rounded-md border bg-background px-3 text-sm capitalize"
              aria-label="Seleccionar mes"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>{monthName(month)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              aria-label="Seleccionar año"
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="min-w-28 px-4 py-3">
              <div className="text-xs text-muted-foreground">Movimientos</div>
              <div className="mt-1 text-lg font-semibold">{allRaw.length}</div>
            </div>
            <div className="min-w-32 border-l px-4 py-3">
              <div className="text-xs text-muted-foreground">Total del mes</div>
              <div className={`mt-1 text-lg font-semibold ${mode === "income" ? "text-positive" : "text-negative"}`}>
                {money(monthTotal)}
              </div>
            </div>
            <div className="min-w-32 border-l px-4 py-3">
              <div className="text-xs text-muted-foreground">Media</div>
              <div className="mt-1 text-lg font-semibold">{money(monthAverage)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              type="text"
              placeholder="Buscar por descripción, categoría, banco, referencia, importe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
              <select value={originFilter ?? ""} onChange={(e) => setOriginFilter(e.target.value || null)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">Todos orígenes</option>{bankOptions.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
              <select value={destFilter ?? ""} onChange={(e) => setDestFilter(e.target.value || null)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">Todos destinos</option>{bankOptions.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
              <select value={categoryFilter !== null ? String(categoryFilter) : ""} onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : null)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">Todas categorías</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select value={typeFilter ?? ""} onChange={(e) => setTypeFilter(e.target.value || null)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">Todos tipos</option><option value="fixed">Fixed</option><option value="variable">Variable</option><option value="temporary">Temporary</option></select>
              <input type="date" value={startDateFilter ?? ""} onChange={(e) => setStartDateFilter(e.target.value || null)} className="h-9 rounded-md border bg-background px-3 text-sm" />
              <input type="date" value={endDateFilter ?? ""} onChange={(e) => setEndDateFilter(e.target.value || null)} className="h-9 rounded-md border bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {items.length} {mode === "income" ? "ingresos" : "gastos"} en {monthLabel(selectedYear, selectedMonth)}
            {items.length !== allRaw.length ? ` · ${allRaw.length} antes de aplicar filtros` : ""}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">Cargando {mode === "income" ? "ingresos" : "gastos"}...</div>
          ) : (
            <>
              <TransactionList mode={mode} transactions={visibleItems} onEdit={handleEdit} onDelete={handleDelete} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} allSelected={allSelected} sortBy={sortBy} sortDir={sortDir} onRequestSort={requestSort} highlight={debouncedSearch} />
              {items.length > pageSize && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, items.length)} de {items.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={safePage === 1}
                    >
                      <ChevronLeft /> Anterior
                    </Button>
                    <span className="min-w-24 text-center text-sm">Página {safePage} de {pageCount}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                      disabled={safePage === pageCount}
                    >
                      Siguiente <ChevronRight />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {user && <TransactionModal type={mode} showModal={showModal} editingId={editingId} formData={formData} setFormData={setFormData} onClose={handleCloseModal} onSubmit={handleModalSubmit} onSaved={() => {}} categories={categories} setCategories={setCategories} userId={user.id} />}
    </div>
  );
}