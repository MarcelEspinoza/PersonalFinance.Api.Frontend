"use client";
import { useEffect, useMemo, useState } from "react";
import BanksChips from "../../components/Monthly/BanksChips";
import { MonthHeader } from "../../components/Monthly/MonthHeader";
import { MonthlyList } from "../../components/Monthly/MonthlyList";
import MonthlyReconciliation from "../../components/Monthly/MonthlyReconciliation";
import { SummaryCards } from "../../components/Monthly/SummaryCards";

import MonthlyInsights from "../../components/Monthly/MonthlyInsights";
import { useAuth } from "../../contexts/AuthContext";
import { analyticsService } from "../../services/analyticsService"; // ✅ nuevo servicio
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

  // KPIs mensuales
  const [insights, setInsights] = useState<any | null>(null);

  // Conciliaciones
  const [recons, setRecons] = useState<ReconSummary[]>([]);
  const [selectedRecon, setSelectedRecon] = useState<ReconSummary | null>(null);

  // Bancos
  const [banks, setBanks] = useState<Record<string, BankDto>>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const normalizeRawTransaction = (raw: any): Transaction => ({
  id: Number(raw.id ?? raw.Id ?? 0),
  name: raw.name ?? raw.description ?? raw.Description ?? "",
  amount: Number(raw.amount ?? raw.Amount ?? 0),
  date: raw.date ?? raw.Date ?? "",
  categoryId: Number(raw.categoryId ?? raw.CategoryId ?? 0),
  categoryName: raw.categoryName ?? raw.Category ?? "",
  type: (raw.type ?? raw.Type ?? (Number(raw.amount) < 0 ? "expense" : "income")) as "income" | "expense",
  source: (raw.source ?? raw.Source ?? raw.frequency ?? "temporary") as "fixed" | "variable" | "temporary",
  frequency: raw.frequency ?? raw.Frequency ?? "",
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
  transferCounterpartyBankId:
    raw.transferCounterpartyBankId ??
    raw.TransferCounterpartyBankId ??
    raw.counterpartyBankId ??
    null,
  transferReference: raw.transferReference ?? raw.TransferReference ?? null,
});


  // ✅ Cargar insights mensuales desde backend
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const res = await analyticsService.getMonthly(year, month);
        if (active) setInsights(res.data ?? res);
      } catch (err) {
        console.error("Error cargando insights:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, year, month]);

  // ✅ Cargar transacciones del mes
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startStr = startDate.toISOString().split("T")[0];
        const endStr = endDate.toISOString().split("T")[0];
        const res = await MonthlyService.getMonthData(user!.id, startStr, endStr);
        const data = (res && (res.data ?? res)) ?? {};
        const rawTransactions: any[] = data.transactions || [];
        const all = rawTransactions.map(normalizeRawTransaction);
        all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (mounted) setTransactions(all);
      } catch (err) {
        console.error("Error loading month data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, currentDate]);

  // ✅ Cargar bancos y conciliaciones
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const [banksRes, reconsRes] = await Promise.all([
          bankService.getAll().then((r: any) => (r && (r.data ?? r)) ?? []),
          reconciliationService.getForMonth(year, month).then((r: any) => (r && (r.data ?? r)) ?? []),
        ]);
        if (!mounted) return;

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
          ...r,
          bankName: bankMap[r.bankId]?.name ?? "",
          bankEntity: bankMap[r.bankId]?.entity ?? "",
          bankColor: bankMap[r.bankId]?.color ?? "#CBD5E1",
          label: `${bankMap[r.bankId]?.name ?? "Banco"}${bankMap[r.bankId]?.entity ? ` | ${bankMap[r.bankId]?.entity}` : ""}`,
        }));
        setRecons(list);
      } catch (err) {
        console.error("Error loading banks/recons:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, year, month]);

  // ✅ Transformar conciliaciones → chips para BanksChips
  const chips = useMemo(() => {
    return recons.map((r) => ({
      id: r.id,
      label: r.label ?? r.bankName ?? "Banco",
      bankColor: r.bankColor ?? "#CBD5E1",
      reconciled: r.reconciled,
    }));
  }, [recons]);

  // ✅ Calcular resumen rápido
  useEffect(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    setSummary({ income, expense, balance: income - expense });
  }, [transactions]);

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

  return (
    <div className="space-y-6">
      <MonthHeader monthName={monthName} onChangeMonth={changeMonth} onToday={() => setCurrentDate(new Date())} />

      {/* ✅ Ahora los chips funcionan bien */}
      <BanksChips recons={chips} selectedId={selectedRecon?.id ?? ""} onSelect={(id) => {
        const found = recons.find((r) => r.id === id);
        setSelectedRecon(found ?? null);
      }} />

      <div className="grid lg:grid-cols-3 gap-6 mt-3">
        <div className="lg:col-span-2 space-y-6">
          <SummaryCards income={summary.income} expense={summary.expense} balance={summary.balance} />

          {/* ✅ KPI Dashboard */}
          {insights && (
            <MonthlyInsights
              year={year}
              month={month}
              bankId={selectedRecon?.bankId}
              endpoint="/api/analytics/monthly"
            />
          )}

          <MonthlyList transactions={transactions} />
        </div>

        {/* ✅ Panel conciliación (sin cambios) */}
        <MonthlyReconciliation
          year={year}
          month={month}
          recons={recons}
          selectedRecon={selectedRecon}
          recLoading={false}
          recError={null}
          suggestion={null}
          marking={false}
          onRefresh={() => Promise.resolve()}
          onSelectRecon={(id) => setSelectedRecon(recons.find((r) => r.id === id) ?? null)}
          onFetchSuggestion={() => Promise.resolve()}
          onMarkReconciled={() => Promise.resolve()}
          onUpdateClosingBalance={() => Promise.resolve()}
        />
      </div>
    </div>
  );
}
