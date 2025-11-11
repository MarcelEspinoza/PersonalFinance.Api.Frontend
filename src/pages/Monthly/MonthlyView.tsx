import { useEffect, useMemo, useState } from "react";
import BanksChips from "../../components/Monthly/BanksChips";
import { MonthHeader } from "../../components/Monthly/MonthHeader";
import { MonthlyList } from "../../components/Monthly/MonthlyList";
import MonthlyReconciliation from "../../components/Monthly/MonthlyReconciliation";
import { SummaryCards } from "../../components/Monthly/SummaryCards";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../lib/apiClient";
import { MonthlyService } from "../../services/monthlyService";
import { Transaction } from "../../types/Transaction";

type ReconSummary = {
  id: string;
  bankId: string;
  year: number;
  month: number;
  closingBalance: number;
  reconciled: boolean;
  notes?: string | null;
  createdAt: string;
  reconciledAt?: string | null;
};

type SuggestionDto = {
  systemTotal: number;
  closingBalance: number;
  difference: number;
  details?: any[];
};

type BankDto = {
  id: string;
  name: string;
  entity?: string | null;
  accountNumber?: string | null;
  color?: string | null;
};

export function MonthlyView() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

  // reconciliation state
  const [recons, setRecons] = useState<ReconSummary[]>([]);
  const [selectedRecon, setSelectedRecon] = useState<ReconSummary | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionDto | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  // banks cache for name lookup
  const [banks, setBanks] = useState<Record<string, BankDto>>({});

  // local/manual last reconciled (fallback to localStorage if backend not available)
  const [manualLastReconciled, setManualLastReconciled] = useState<string | null>(
    () => localStorage.getItem("lastReconciledAt") || null
  );
  const [editingLast, setEditingLast] = useState(false);
  const [lastInputValue, setLastInputValue] = useState<string>("");

  // centralized GET helper that uses apiClient (axios) and returns data
  const apiGet = async (url: string) => {
    try {
      const res = await apiClient.get(url);
      return res.data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data ??
        err?.message ??
        `HTTP ${err?.response?.status ?? "error"}`;
      throw new Error(msg);
    }
  };

  // displayedRecons with labels and bank color — keep useMemo before returns
  const displayedRecons = useMemo(
    () =>
      recons.map(r => ({
        ...r,
        bankName: banks[r.bankId]?.name ?? r.bankId,
        bankEntity: banks[r.bankId]?.entity ?? "",
        bankColor: banks[r.bankId]?.color ?? "#CBD5E1",
        label: `${banks[r.bankId]?.name ?? r.bankId}${banks[r.bankId]?.entity ? ` | ${banks[r.bankId]?.entity}` : ""}`,
      })),
    [recons, banks]
  );

  useEffect(() => {
    if (user) loadMonthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentDate]);

  useEffect(() => {
    if (user) {
      loadReconciliations();
      loadBanks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentDate]);

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      const { data } = await MonthlyService.getMonthData(user!.id, startStr, endStr);
      const allTransactions: Transaction[] = data.transactions || [];

      // Ordenar por fecha descendente
      allTransactions.sort((a, b) => {
        if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });

      setTransactions(allTransactions);

      const totalIncome = allTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = allTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

      setSummary({
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
      });
    } catch (error) {
      console.error("Error loading month data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      // apiClient baseURL should include the API base (see apiClient config)
      const arr: BankDto[] = await apiGet("/banks");
      const map: Record<string, BankDto> = {};
      arr.forEach(b => (map[b.id] = b));
      setBanks(map);
    } catch (err) {
      console.debug("Could not load banks:", err);
    }
  };

  const loadReconciliations = async () => {
    setRecLoading(true);
    setRecError(null);
    setSuggestion(null);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await apiGet(`/reconciliations?year=${year}&month=${month}`);
      const list: ReconSummary[] = (data || []).map((r: any) => ({
        id: r.id,
        bankId: r.bankId,
        year: r.year,
        month: r.month,
        closingBalance: Number(r.closingBalance),
        reconciled: !!r.reconciled,
        notes: r.notes,
        createdAt: r.createdAt,
        reconciledAt: r.reconciledAt ?? null,
      }));
      setRecons(list);
      setSelectedRecon(list.length ? list[0] : null);
    } catch (err: any) {
      console.error(err);
      setRecError(err?.message || "Error cargando conciliaciones");
    } finally {
      setRecLoading(false);
    }
  };

  const fetchSuggestion = async (bankId?: string) => {
    if (!selectedRecon && !bankId) return;
    setRecLoading(true);
    setRecError(null);
    setSuggestion(null);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const bankParam = bankId ?? selectedRecon?.bankId;
      const q = `?year=${year}&month=${month}${bankParam ? `&bankId=${bankParam}` : ""}`;
      const dto = await apiGet(`/reconciliations/suggest${q}`);
      setSuggestion({
        systemTotal: Number(dto.systemTotal ?? 0),
        closingBalance: Number(dto.closingBalance ?? 0),
        difference: Number(dto.difference ?? 0),
        details: dto.details ?? null,
      });
    } catch (err: any) {
      console.error(err);
      setRecError(err?.message || "Error obteniendo sugerencias");
    } finally {
      setRecLoading(false);
    }
  };

  const onSelectRecon = (id: string) => {
    const found = recons.find(r => r.id === id) ?? null;
    setSelectedRecon(found);
    setSuggestion(null);
    setTimeout(() => fetchSuggestion(found?.bankId), 50);
  };

  const onMarkReconciled = async () => {
    if (!selectedRecon) return;
    if (!suggestion || Math.abs(suggestion.difference) > 0.01) {
      setRecError("No se puede marcar: la diferencia no está a 0. Revisa las sugerencias o corrige partidas.");
      return;
    }

    setMarking(true);
    setRecError(null);
    try {
      await apiClient.post(`/reconciliations/${selectedRecon.id}/mark`);
      await loadReconciliations();
      await loadMonthData();
      alert("Mes marcado como conciliado");
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message ?? err?.message ?? "Error marcando conciliación";
      setRecError(msg);
    } finally {
      setMarking(false);
    }
  };

  // Persist closingBalance via POST /api/reconciliations (CreateAsync updates existing if present)
  const updateReconClosingBalance = async (id: string, newBalance: number) => {
    if (!id) throw new Error("Missing reconciliation id");
    const recon = recons.find(r => r.id === id);
    if (!recon) throw new Error("Reconciliation not found");
    setRecLoading(true);
    setRecError(null);
    try {
      const payload = {
        bankId: recon.bankId,
        year: recon.year,
        month: recon.month,
        closingBalance: newBalance,
        notes: recon.notes ?? null,
      };

      await apiClient.post(`/reconciliations`, payload);
      // reload reconciliations and suggestions for selected recon
      await loadReconciliations();
      setTimeout(() => fetchSuggestion(recon.bankId), 300);
    } catch (err: any) {
      console.error("Error updating closingBalance:", err);
      const msg = err?.response?.data?.message ?? err?.message ?? "Error actualizando saldo bancario";
      setRecError(msg);
      throw err;
    } finally {
      setRecLoading(false);
    }
  };

  // Assign manual last reconciled (tries server endpoint, falls back to localStorage)
  const assignLastReconciled = async (iso: string | null) => {
    // iso = null clears
    setManualLastReconciled(iso);
    localStorage.setItem("lastReconciledAt", iso ?? "");
    // Try server endpoint if selectedRecon exists and API supports it:
    if (!selectedRecon) return;
    try {
      await apiClient.put(`/reconciliations/${selectedRecon.id}/set-last`, { reconciledAt: iso });
      await loadReconciliations();
    } catch (err) {
      // ignore network errors, fallback local storage is already set
      console.debug("No backend endpoint for persisting lastReconciledAt or error calling it", err);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const monthName = currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1..12

  const canMark = suggestion && Math.abs(suggestion.difference) <= 0.01 && !selectedRecon?.reconciled;

  return (
    <div className="space-y-6">
      <MonthHeader monthName={monthName} onChangeMonth={changeMonth} onToday={() => setCurrentDate(new Date())} />

      {/* Top row: banks chips + last reconciled (manual) */}
      <div className="flex items-center justify-between gap-4">
        <BanksChips
          recons={displayedRecons}
          selectedId={selectedRecon?.id ?? ""}
          onSelect={(id: string) => onSelectRecon(id)}
        />

        <div className="text-sm text-slate-500 flex items-center gap-3">
          <div>
            Última conciliación:
            <span className="font-medium text-slate-700 ml-2">
              {manualLastReconciled ? new Date(manualLastReconciled).toLocaleString() : "—"}
            </span>
          </div>

          {/* controls to set/clear manual last reconciled */}
          {!editingLast && (
            <>
              <button
                onClick={() => {
                  setLastInputValue(new Date().toISOString().slice(0, 16)); // default to now (local datetime-local value)
                  setEditingLast(true);
                }}
                className="text-sm text-slate-600 underline"
              >
                Asignar fecha
              </button>
              {manualLastReconciled && (
                <button
                  onClick={() => assignLastReconciled(null)}
                  className="text-sm text-rose-600 underline"
                >
                  Borrar
                </button>
              )}
            </>
          )}

          {editingLast && (
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={lastInputValue}
                onChange={(e) => setLastInputValue(e.target.value)}
                className="border px-2 py-1 rounded text-sm"
              />
              <button
                onClick={() => {
                  const iso = new Date(lastInputValue).toISOString();
                  assignLastReconciled(iso);
                  setEditingLast(false);
                }}
                className="bg-emerald-600 text-white px-3 py-1 rounded text-sm"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditingLast(false)}
                className="text-sm text-slate-600 underline"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-3">
        <div className="lg:col-span-2 space-y-6">
          <SummaryCards income={summary.income} expense={summary.expense} balance={summary.balance} />
          <MonthlyList transactions={transactions} />
        </div>

        <MonthlyReconciliation
          year={year}
          month={month}
          recons={displayedRecons as any}
          selectedRecon={selectedRecon as any}
          recLoading={recLoading}
          recError={recError}
          suggestion={suggestion}
          marking={marking}
          onRefresh={async () => await loadReconciliations()}
          onSelectRecon={(id: string) => onSelectRecon(id)}
          onFetchSuggestion={async (bankId?: string) => await fetchSuggestion(bankId)}
          onMarkReconciled={async () => await onMarkReconciled()}
          onUpdateClosingBalance={async (id: string, newBalance: number) => await updateReconClosingBalance(id, newBalance)}
        />
      </div>
    </div>
  );
}