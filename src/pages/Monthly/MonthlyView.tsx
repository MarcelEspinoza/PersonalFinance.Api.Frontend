import { useEffect, useMemo, useState } from "react";
import BanksChips from "../../components/Monthly/BanksChips";
import { MonthHeader } from "../../components/Monthly/MonthHeader";
import { MonthlyList } from "../../components/Monthly/MonthlyList";
import MonthlyReconciliation from "../../components/Monthly/MonthlyReconciliation";
import { SummaryCards } from "../../components/Monthly/SummaryCards";
import { useAuth } from "../../contexts/AuthContext";
import bankService from "../../services/bankService";
import { MonthlyService } from "../../services/monthlyService";
import { reconciliationService } from "../../services/reconciliationService";
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

  // banks cache for name lookup (map by id)
  const [banks, setBanks] = useState<Record<string, BankDto>>({});

  // local/manual last reconciled (fallback to localStorage if backend not available)
  const [manualLastReconciled, setManualLastReconciled] = useState<string | null>(
    () => localStorage.getItem("lastReconciledAt") || null
  );
  const [editingLast, setEditingLast] = useState(false);
  const [lastInputValue, setLastInputValue] = useState<string>("");

  // Helper to normalize axios errors
  const normalizeAxiosError = (err: any) =>
    err?.response?.data?.message ?? err?.response?.data ?? err?.message ?? `HTTP ${err?.response?.status ?? "error"}`;

  // year/month derived
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1..12

  // Build displayedRecons from banks: show a chip per bank (existing recon if present, otherwise placeholder)
  const displayedRecons = useMemo(() => {
    const bankArr = Object.values(banks);
    // keep order: existing reconciliations first (by bank order), then banks without reconciliation
    const list: any[] = [];

    // map existing recons by bankId for quick lookup
    const reconsByBank: Record<string, ReconSummary> = {};
    recons.forEach((r) => {
      if (r.year === year && r.month === month) reconsByBank[r.bankId] = r;
    });

    // include banks in defined order
    bankArr.forEach((b) => {
      const existing = reconsByBank[b.id];
      if (existing) {
        list.push({
          ...existing,
          bankName: b.name,
          bankEntity: b.entity ?? "",
          bankColor: b.color ?? "#CBD5E1",
          label: `${b.name}${b.entity ? ` | ${b.entity}` : ""}`,
        });
      } else {
        list.push({
          id: `bank-${b.id}`, // temp id for a placeholder
          bankId: b.id,
          year,
          month,
          closingBalance: 0,
          reconciled: false,
          notes: null,
          createdAt: new Date().toISOString(),
          reconciledAt: null,
          bankName: b.name,
          bankEntity: b.entity ?? "",
          bankColor: b.color ?? "#CBD5E1",
          label: `${b.name}${b.entity ? ` | ${b.entity}` : ""}`,
        });
      }
    });

    return list;
  }, [banks, recons, year, month]);

  // Load month transactions whenever user or date changes
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startStr = startDate.toISOString().split("T")[0];
        const endStr = endDate.toISOString().split("T")[0];

        const res = await MonthlyService.getMonthData(user!.id, startStr, endStr);
        const data = (res && (res.data ?? res)) ?? {};
        const allTransactions: Transaction[] = data.transactions || [];

        // sort desc by date
        allTransactions.sort((a, b) => {
          if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
        });

        if (!mounted) return;
        setTransactions(allTransactions);

        const totalIncome = allTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const totalExpense = allTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

        setSummary({
          income: totalIncome,
          expense: totalExpense,
          balance: totalIncome - totalExpense,
        });
      } catch (err) {
        console.error("Error loading month data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentDate]);

  // Unified loader: load banks and reconciliations together to avoid race conditions
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const loadAll = async () => {
      setRecLoading(true);
      setRecError(null);
      try {
        const [banksRes, reconsRes] = await Promise.all([
          bankService.getAll().then((r: any) => (r && (r.data ?? r)) ?? []),
          reconciliationService.getForMonth(year, month).then((r: any) => (r && (r.data ?? r)) ?? []),
        ]);

        if (!mounted) return;

        // normalize banks to map
        const bankMap: Record<string, BankDto> = {};
        (banksRes || []).forEach((b: any) => {
          bankMap[b.id] = {
            id: b.id,
            name: b.name,
            entity: b.entity ?? null,
            accountNumber: b.accountNumber ?? null,
            color: b.color ?? "#CBD5E1",
          };
        });
        setBanks(bankMap);

        // normalize reconciliations
        const list: ReconSummary[] = (reconsRes || []).map((r: any) => ({
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

        // select initial recon: prefer persisted reconciliation, else first bank placeholder
        if (list.length > 0) {
          setSelectedRecon(list[0]);
          setTimeout(() => fetchSuggestion(list[0].bankId), 50);
        } else {
          const firstBank = Object.values(bankMap)[0];
          if (firstBank) {
            const placeholder: any = {
              id: `bank-${firstBank.id}`,
              bankId: firstBank.id,
              year,
              month,
              closingBalance: 0,
              reconciled: false,
              notes: null,
              createdAt: new Date().toISOString(),
              reconciledAt: null,
              bankName: firstBank.name,
              bankEntity: firstBank.entity ?? "",
              bankColor: firstBank.color ?? "#CBD5E1",
              label: `${firstBank.name}${firstBank.entity ? ` | ${firstBank.entity}` : ""}`,
            };
            setSelectedRecon(placeholder);
            setTimeout(() => fetchSuggestion(firstBank.id), 50);
          } else {
            setSelectedRecon(null);
          }
        }
      } catch (err: any) {
        console.error("Error loading banks/reconciliations:", err);
        setRecError(normalizeAxiosError(err) || "Error cargando datos");
      } finally {
        if (mounted) setRecLoading(false);
      }
    };

    loadAll();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year, month, currentDate]);

  const fetchSuggestion = async (bankId?: string) => {
    const bankParam = bankId ?? selectedRecon?.bankId;
    if (!bankParam) return;
    setRecLoading(true);
    setRecError(null);
    setSuggestion(null);
    try {
      const res = await reconciliationService.suggest(year, month, bankParam);
      const dto = (res && (res.data ?? res)) ?? {};

      const raw = dto.details;
      let detailsArr: any[] = [];
      if (Array.isArray(raw)) {
        detailsArr = raw;
      } else if (raw && typeof raw === "object") {
        // convert to key/value pairs for consistent UI consumption
        detailsArr = Object.entries(raw).map(([k, v]) => ({ key: k, value: v }));
      } else {
        detailsArr = [];
      }

      setSuggestion({
        systemTotal: Number(dto.systemTotal ?? 0),
        closingBalance: Number(dto.closingBalance ?? 0),
        difference: Number(dto.difference ?? 0),
        details: detailsArr,
      });
    } catch (err: any) {
      console.error(err);
      setRecError(normalizeAxiosError(err) || "Error obteniendo sugerencias");
    } finally {
      setRecLoading(false);
    }
  };

  const onSelectRecon = (id: string) => {
    const found = displayedRecons.find((d: any) => d.id === id) ?? null;
    setSelectedRecon(found as ReconSummary | null);
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
      // if it's a placeholder (id starts with bank-), create the reconciliation first
      if (selectedRecon.id.startsWith("bank-")) {
        const payload = {
          bankId: selectedRecon.bankId,
          year: selectedRecon.year,
          month: selectedRecon.month,
          closingBalance: suggestion?.closingBalance ?? 0,
          notes: selectedRecon.notes ?? null,
        };
        await reconciliationService.create(payload);
        // reload reconciliations to get the real id
        await Promise.all([loadBanksAndReconsOnce()]);
      }

      // find the real reconciliaton for this bank/month
      const real = recons.find((r) => r.bankId === selectedRecon.bankId && r.year === selectedRecon.year && r.month === selectedRecon.month);
      const idToMark = real ? real.id : selectedRecon.id;

      await reconciliationService.markReconciled(idToMark);
      // reload data
      await Promise.all([loadBanksAndReconsOnce(), loadMonthDataOnce()]);
      alert("Mes marcado como conciliado");
    } catch (err: any) {
      console.error(err);
      setRecError(normalizeAxiosError(err) || "Error marcando conciliación");
    } finally {
      setMarking(false);
    }
  };

  // helper wrappers to reuse loaders inside actions
  const loadBanksAndReconsOnce = async () => {
    try {
      const [banksRes, reconsRes] = await Promise.all([
        bankService.getAll().then((r: any) => (r && (r.data ?? r)) ?? []),
        reconciliationService.getForMonth(year, month).then((r: any) => (r && (r.data ?? r)) ?? []),
      ]);

      const bankMap: Record<string, BankDto> = {};
      (banksRes || []).forEach((b: any) => {
        bankMap[b.id] = {
          id: b.id,
          name: b.name,
          entity: b.entity ?? null,
          accountNumber: b.accountNumber ?? null,
          color: b.color ?? "#CBD5E1",
        };
      });
      setBanks(bankMap);

      const list: ReconSummary[] = (reconsRes || []).map((r: any) => ({
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
    } catch (err) {
      console.error("Error reloading banks/recons:", err);
    }
  };

  const loadMonthDataOnce = async () => {
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];
      const res = await MonthlyService.getMonthData(user!.id, startStr, endStr);
      const data = (res && (res.data ?? res)) ?? {};
      const allTransactions: Transaction[] = data.transactions || [];

      allTransactions.sort((a, b) => {
        if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });

      setTransactions(allTransactions);

      const totalIncome = allTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const totalExpense = allTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      setSummary({
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
      });
    } catch (err) {
      console.error("Error reloading month data:", err);
    }
  };

  const updateReconClosingBalance = async (id: string, newBalance: number) => {
    if (!id) throw new Error("Missing reconciliation id");
    setRecLoading(true);
    setRecError(null);
    try {
      // determine bank id
      let bankId = id;
      if (id.startsWith("bank-")) bankId = id.replace(/^bank-/, "");
      const payload = {
        bankId,
        year,
        month,
        closingBalance: newBalance,
        notes: null,
      };
      await reconciliationService.create(payload); // backend create acts as upsert
      await loadBanksAndReconsOnce();
      setTimeout(() => fetchSuggestion(bankId), 300);
    } catch (err: any) {
      console.error("Error updating closingBalance:", err);
      setRecError(normalizeAxiosError(err) || "Error actualizando saldo bancario");
      throw err;
    } finally {
      setRecLoading(false);
    }
  };

  const assignLastReconciled = async (iso: string | null) => {
    setManualLastReconciled(iso);
    localStorage.setItem("lastReconciledAt", iso ?? "");
    if (!selectedRecon) return;
    try {
      if (typeof (reconciliationService as any).setLast === "function") {
        await (reconciliationService as any).setLast(selectedRecon.id, iso);
        await loadBanksAndReconsOnce();
      }
    } catch (err) {
      console.debug("No backend endpoint for persisting lastReconciledAt or error calling it", err);
    }
  };

  // ---------- UI helpers ----------
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

  const canMark = suggestion && Math.abs(suggestion.difference) <= 0.01 && !selectedRecon?.reconciled;

  return (
    <div className="space-y-6">
      <MonthHeader monthName={monthName} onChangeMonth={changeMonth} onToday={() => setCurrentDate(new Date())} />

      <div className="flex items-center justify-between gap-4">
        <BanksChips
          recons={displayedRecons as any}
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

          {!editingLast && (
            <>
              <button
                onClick={() => {
                  setLastInputValue(new Date().toISOString().slice(0, 16));
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
          onRefresh={async () => {
            await loadBanksAndReconsOnce();
            await loadMonthDataOnce();
          }}
          onSelectRecon={(id: string) => onSelectRecon(id)}
          onFetchSuggestion={async (bankId?: string) => await fetchSuggestion(bankId)}
          onMarkReconciled={async () => await onMarkReconciled()}
          onUpdateClosingBalance={async (id: string, newBalance: number) => await updateReconClosingBalance(id, newBalance)}
        />
      </div>
    </div>
  );
}