"use client";
import { useEffect, useMemo, useState } from "react";
import BanksChips from "../../components/Monthly/BanksChips";
import { MonthHeader } from "../../components/Monthly/MonthHeader";
import MonthlyInsights from "../../components/Monthly/MonthlyInsights";
import MonthlyReconciliation from "../../components/Monthly/MonthlyReconciliation";
import { SummaryCards } from "../../components/Monthly/SummaryCards";
import { useAuth } from "../../contexts/AuthContext";
import { analyticsService } from "../../services/analyticsService";
import bankService from "../../services/bankService";
import { reconciliationService } from "../../services/reconciliationService";

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

type InsightsDto = {
  year: number;
  month: number;
  currency: string;
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  txCount: number;
  daysWithSpend: number;
  avgDailySpend: number;
  byCategory: Array<{ categoryId: number; categoryName: string; amount: number; pct: number }>;
  topExpenses: Array<{ id: number; description: string; amount: number; date: string; categoryName?: string }>;
  topIncomes: Array<{ id: number; description: string; amount: number; date: string; categoryName?: string }>;
  largestIncome?: { id: number; description: string; amount: number; date: string; categoryName?: string } | null;
};

export function MonthlyView() {
  const { user } = useAuth();

  // Fecha visible en cabecera
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Bancos + conciliaciones
  const [banks, setBanks] = useState<Record<string, BankDto>>({});
  const [recons, setRecons] = useState<ReconSummary[]>([]);
  const [selectedRecon, setSelectedRecon] = useState<ReconSummary | null>(null);

  // KPIs (derivados del backend de analytics)
  const [insights, setInsights] = useState<InsightsDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [kpiLoading, setKpiLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // -------- helpers ----------
  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };
  const monthName = currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  // -------- carga bancos + conciliaciones ----------
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
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

        // Ordena por fecha de creación desc
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecons(list);

        // Selección inicial razonable
        const latestReconciled = list.find((r) => r.reconciled);
        setSelectedRecon(latestReconciled ?? list[0] ?? null);
      } catch (e: any) {
        setError(e?.message ?? "Error cargando bancos/conciliaciones");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, year, month]);

  // -------- carga KPIs (cambia con banco seleccionado) ----------
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setKpiLoading(true);
      try {
        const res = await analyticsService.getMonthly(year, month, selectedRecon?.bankId);
        if (active) setInsights(res.data ?? res);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Error cargando KPIs");
      } finally {
        if (active) setKpiLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, year, month, selectedRecon?.bankId]);

  // -------- chips para BanksChips ----------
  const chips = useMemo(() => {
    return recons.map((r) => ({
      id: r.id,
      label: r.label ?? r.bankName ?? "Banco",
      bankColor: r.bankColor ?? "#CBD5E1",
      reconciled: r.reconciled,
    }));
  }, [recons]);

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

      {/* Chips de bancos (relacionados a las conciliaciones del mes) */}
      <BanksChips
        recons={chips}
        selectedId={selectedRecon?.id ?? ""}
        onSelect={(id) => setSelectedRecon(recons.find((r) => r.id === id) ?? null)}
      />

      <div className="grid lg:grid-cols-3 gap-6 mt-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Summary cards usan los KPIs (no las transacciones) */}
          <SummaryCards
            income={insights?.totalIncomes ?? 0}
            expense={insights?.totalExpenses ?? 0}
            balance={insights?.balance ?? 0}
          />

          {/* KPI Dashboard (donut + top gastos + top ingresos) */}
          <div className="rounded-2xl border bg-white p-4">
            {kpiLoading ? (
              <div className="text-sm text-slate-500">Cargando insights…</div>
            ) : insights ? (
              <MonthlyInsights
                year={year}
                month={month}
                bankId={selectedRecon?.bankId}
                endpoint="/api/analytics/monthly"
              />
            ) : (
              <div className="text-sm text-slate-500">{error ?? "Sin datos para este periodo."}</div>
            )}
          </div>
        </div>

        {/* Panel de conciliación (igual que antes) */}
        <MonthlyReconciliation
          year={year}
          month={month}
          recons={recons}
          selectedRecon={selectedRecon}
          recLoading={false}
          recError={error}
          suggestion={null}
          marking={false}
          onRefresh={async () => {
            // recargar bancos/conciliaciones
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
                ...r,
                bankName: bankMap[r.bankId]?.name ?? "",
                bankEntity: bankMap[r.bankId]?.entity ?? "",
                bankColor: bankMap[r.bankId]?.color ?? "#CBD5E1",
                label: `${bankMap[r.bankId]?.name ?? "Banco"}${bankMap[r.bankId]?.entity ? ` | ${bankMap[r.bankId]?.entity}` : ""}`,
              }));
              list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setRecons(list);
              if (selectedRecon) {
                const updated = list.find((r) => r.bankId === selectedRecon.bankId);
                setSelectedRecon(updated ?? list[0] ?? null);
              } else {
                setSelectedRecon(list[0] ?? null);
              }
            } catch (e) {
              console.error(e);
            }
          }}
          onSelectRecon={(id: string) =>
            setSelectedRecon(recons.find((r) => r.id === id) ?? null)
          }
          onFetchSuggestion={() => Promise.resolve()}
          onMarkReconciled={() => Promise.resolve()}
          onUpdateClosingBalance={() => Promise.resolve()}
        />
      </div>
    </div>
  );
}
