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
  bankName?: string;
  bankEntity?: string;
  bankColor?: string;
  label?: string;
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

  // Normalize raw transaction objects from backend to the canonical Transaction shape
  const normalizeRawTransaction = (raw: any): Transaction => {
    const transferCounterpartyBankId =
      raw.transferCounterpartyBankId ??
      raw.TransferCounterpartyBankId ??
      raw.transferCounterparty ??
      raw.counterpartyBankId ??
      raw.counterpartyBank ??
      null;

    return {
      id: Number(raw.id ?? raw.Id ?? 0),
      name: raw.name ?? raw.description ?? raw.Description ?? "",
      amount: Number(raw.amount ?? raw.Amount ?? 0),
      date: raw.date ?? raw.Date ?? "",
      categoryId: Number(raw.categoryId ?? raw.CategoryId ?? 0),
      categoryName: raw.categoryName ?? raw.Category ?? "",
      type: (raw.type ?? raw.Type ?? (raw.amount < 0 ? "expense" : "income")) as "income" | "expense",
      source: (raw.source ?? raw.Source ?? raw.frequency ?? "temporary") as "fixed" | "variable" | "temporary",
      frequency: raw.frequency ?? raw.Frequency,
      start_Date: raw.start_Date ?? raw.startDate ?? null,
      end_Date: raw.end_Date ?? raw.endDate ?? null,
      isIndefinite: !!(raw.isIndefinite ?? raw.IsIndefinite),
      notes: raw.notes ?? raw.Notes ?? null,
      loanId: raw.loanId ?? raw.LoanId ?? null,
      userId: raw.userId ?? raw.UserId ?? "",
      bankId: raw.bankId ?? raw.BankId ?? null,
      bankName: raw.bankName ?? raw.BankName ?? null,
      isTransfer: !!(raw.isTransfer ?? raw.IsTransfer),
      transferId: raw.transferId ?? raw.TransferId ?? null,
      transferCounterpartyBankId: transferCounterpartyBankId ?? null,
      transferReference: raw.transferReference ?? raw.TransferReference ?? null,
    } as Transaction;
  };

  // Build displayedRecons for UI
  // Preference: show reconciled entry if exists for that bank; otherwise the latest one (createdAt desc)
  const displayedRecons = useMemo(() => {
    const bankArr = Object.values(banks);
    const result: any[] = [];

    // Group recons by bankId for current month/year
    const grouped: Record<string, ReconSummary[]> = {};
    recons.forEach((r) => {
      if (r.year === year && r.month === month) {
        grouped[r.bankId] = grouped[r.bankId] || [];
        grouped[r.bankId].push(r);
      }
    });

    bankArr.forEach((b) => {
      const group = (grouped[b.id] || []).slice().sort((a, b2) => {
        return new Date(b2.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // choose: latest reconciled if exists, else latest overall
      let chosen: ReconSummary | null = null;
      if (group.length > 0) {
        const latestReconciled = group.find((x) => !!x.reconciled);
        chosen = latestReconciled ?? group[0];
      }

      if (chosen) {
        result.push({
          ...chosen,
          bankName: b.name,
          bankEntity: b.entity ?? "",
          bankColor: b.color ?? "#CBD5E1",
          label: `${b.name}${b.entity ? ` | ${b.entity}` : ""}`,
        });
      } else {
        result.push({
          id: `bank-${b.id}`, // placeholder id
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

    return result;
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
        const rawTransactions: any[] = data.transactions || [];

        // normalize shape so we always have transferCounterpartyBankId/isTransfer
        const allTransactions: Transaction[] = rawTransactions.map(normalizeRawTransaction);

        // sort desc by date
        allTransactions.sort((a, b) => {
          if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
        });

        if (!mounted) return;
        setTransactions(allTransactions);
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

  // Recompute summary whenever transactions or banks change.
  // Exclude internal transfers: transactions with isTransfer=true and transferCounterpartyBankId belongs to user's banks
  useEffect(() => {
    const userBankIds = new Set(Object.keys(banks));

    const isInternalTransfer = (t: Transaction) => {
      if (!t || !t.isTransfer) return false;
      const cp = t.transferCounterpartyBankId ?? null;
      if (!cp) return false;
      return userBankIds.has(cp);
    };

    const totalIncome = transactions
      .filter((t) => t.type === "income" && !isInternalTransfer(t))
      .reduce((s, t) => s + (t.amount ?? 0), 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense" && !isInternalTransfer(t))
      .reduce((s, t) => s + (t.amount ?? 0), 0);

    setSummary({
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    });
  }, [transactions, banks]);

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

        // normalize reconciliations, ensure createdAt present and convert types
        const sortedRecons = (reconsRes || []).slice().sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const list: ReconSummary[] = sortedRecons.map((r: any) => ({
          id: r.id,
          bankId: r.bankId,
          year: r.year,
          month: r.month,
          closingBalance: Number(r.closingBalance),
          reconciled: !!r.reconciled,
          notes: r.notes,
          createdAt: r.createdAt,
          reconciledAt: r.reconciledAt ?? null,
          bankName: (bankMap[r.bankId] && bankMap[r.bankId].name) ?? undefined,
          bankEntity: (bankMap[r.bankId] && bankMap[r.bankId].entity) ?? undefined,
          bankColor: (bankMap[r.bankId] && bankMap[r.bankId].color) ?? undefined,
        }));
        setRecons(list);

        // Select initial recon:
        // 1) If previously selectedRecon exists, try to preserve it (pick latest for that bank)
        if (selectedRecon) {
          const foundPrev = list.find((r) => r.bankId === selectedRecon.bankId && r.year === selectedRecon.year && r.month === selectedRecon.month);
          if (foundPrev) {
            setSelectedRecon(foundPrev);
            setTimeout(() => fetchSuggestion(foundPrev.bankId), 50);
            return;
          }
        }

        // 2) Prefer any reconciliation that is marked reconciled (latest reconciled)
        const latestReconciled = list.find((r) => r.reconciled);
        if (latestReconciled) {
          setSelectedRecon(latestReconciled);
          setTimeout(() => fetchSuggestion(latestReconciled.bankId), 50);
          return;
        }

        // 3) Else pick latest reconciliation for the first bank in bankMap
        const firstBank = Object.values(bankMap)[0];
        if (firstBank) {
          const latestForFirstBank = list.find((r) => r.bankId === firstBank.id);
          if (latestForFirstBank) {
            setSelectedRecon(latestForFirstBank);
            setTimeout(() => fetchSuggestion(latestForFirstBank.bankId), 50);
            return;
          }
        }

        // fallback: pick first element of list
        if (list.length > 0) {
          setSelectedRecon(list[0]);
          setTimeout(() => fetchSuggestion(list[0].bankId), 50);
        } else {
          // no reconciliations: pick first bank placeholder
          const fb = Object.values(bankMap)[0];
          if (fb) {
            const placeholder: any = {
              id: `bank-${fb.id}`,
              bankId: fb.id,
              year,
              month,
              closingBalance: 0,
              reconciled: false,
              notes: null,
              createdAt: new Date().toISOString(),
              reconciledAt: null,
              bankName: fb.name,
              bankEntity: fb.entity ?? "",
              bankColor: fb.color ?? "#CBD5E1",
              label: `${fb.name}${fb.entity ? ` | ${fb.entity}` : ""}`,
            };
            setSelectedRecon(placeholder);
            setTimeout(() => fetchSuggestion(fb.id), 50);
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
  }, [user, year, month]);

  const fetchSuggestion = async (bankId?: string) => {
    const bankParam = bankId ?? selectedRecon?.bankId;
    if (!bankParam) return;
    setRecLoading(true);
    setRecError(null);
    setSuggestion(null);
    try {
      const res = await reconciliationService.suggest(year, month, bankParam);
      const dto = (res && (res.data ?? res)) ?? {};

      let detailsArr: any[] = [];
      if (Array.isArray(dto.details)) {
        detailsArr = dto.details.map((d: any) => ({
          raw: d,
          type: d.type ?? d.Type ?? d.reason ?? d.Reason ?? "",
          description: d.description ?? d.Description ?? d.Reason ?? d.reason ?? "Transacción candidata",
          amount: Number(d.amount ?? d.Amount ?? d.Value ?? d.value ?? 0),
          transactionId: d.transactionId ?? d.TransactionId ?? null,
          date: d.date ?? d.Date ?? null,
          category: d.category ?? d.Category ?? null,
        }));
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

  // Accept an optional reconciledAt ISO date (frontend will pass manualLastReconciled if present)
  const onMarkReconciled = async (reconciledAtIso?: string | null) => {
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
        await loadBanksAndReconsOnce();
      }

      // find the real reconciliation for this bank/month
      const real = recons.find((r) => r.bankId === selectedRecon.bankId && r.year === selectedRecon.year && r.month === selectedRecon.month);
      const idToMark = real ? real.id : selectedRecon.id;

      // Pass reconciledAtIso (may be null)
      await reconciliationService.markReconciled(idToMark, reconciledAtIso);
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

      // ensure recons ordered latest-first
      const sortedRecons = (reconsRes || []).slice().sort((a: any, b: any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const list: ReconSummary[] = sortedRecons.map((r: any) => ({
        id: r.id,
        bankId: r.bankId,
        year: r.year,
        month: r.month,
        closingBalance: Number(r.closingBalance),
        reconciled: !!r.reconciled,
        notes: r.notes,
        createdAt: r.createdAt,
        reconciledAt: r.reconciledAt ?? null,
        bankName: (bankMap[r.bankId] && bankMap[r.bankId].name) ?? undefined,
        bankEntity: (bankMap[r.bankId] && bankMap[r.bankId].entity) ?? undefined,
        bankColor: (bankMap[r.bankId] && bankMap[r.bankId].color) ?? undefined,
        label: `${(bankMap[r.bankId] && bankMap[r.bankId].name) ?? r.bankId}${(bankMap[r.bankId] && bankMap[r.bankId].entity) ? ` | ${bankMap[r.bankId].entity}` : ""}`
      }));
      setRecons(list);

      // If a recon was previously selected, update selectedRecon to the latest for that bank/year/month
      if (selectedRecon) {
        const found = list.find((rr) => rr.bankId === selectedRecon.bankId && rr.year === selectedRecon.year && rr.month === selectedRecon.month);
        if (found) {
          setSelectedRecon(found);
        }
      }

      return list;
    } catch (err) {
      console.error("Error reloading banks/recons:", err);
      throw err;
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
      const rawTransactions: any[] = data.transactions || [];

      const allTransactions: Transaction[] = rawTransactions.map(normalizeRawTransaction);

      allTransactions.sort((a, b) => {
        if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });

      setTransactions(allTransactions);
    } catch (err) {
      console.error("Error reloading month data:", err);
    }
  };

  const updateReconClosingBalance = async (id: string, newBalance: number) => {
    if (!id) throw new Error("Missing reconciliation id");
    setRecLoading(true);
    setRecError(null);
    try {
      let bankId = id;
      if (id.startsWith("bank-")) bankId = id.replace(/^bank-/, "");
      const payload = {
        bankId,
        year,
        month,
        closingBalance: newBalance,
        notes: null,
      };

      // Use the response so we can locate the created/updated reconciliation
      const res = await reconciliationService.create(payload);
      const createdRec = (res && (res.data ?? res)) ?? null;

      // reload list of recons (ensures state is in sync)
      const list = await loadBanksAndReconsOnce();

      // Prefer the createdRec from the API response if present
      let found: ReconSummary | undefined;
      if (createdRec && createdRec.id) {
        found = list.find((r) => r.id === createdRec.id);
      }
      // fallback: find latest for bank/year/month
      if (!found) {
        found = list.find((r) => r.bankId === bankId && r.year === year && r.month === month);
      }
      if (found) {
        setSelectedRecon(found);
        // refresh suggestion for this bank
        setTimeout(() => fetchSuggestion(found!.bankId), 200);
      }
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
      console.debug("No backend endpoint for persisting lastReconciledAt or error", err);
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
          onSelect={onSelectRecon}
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
          onSelectRecon={onSelectRecon}
          onFetchSuggestion={fetchSuggestion}
          onMarkReconciled={async () => await onMarkReconciled(manualLastReconciled)}
          onUpdateClosingBalance={updateReconClosingBalance}
        />
      </div>
    </div>
  );
}