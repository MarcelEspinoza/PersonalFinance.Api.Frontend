"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import BanksChips from "../../components/Monthly/BanksChips";
import { MonthHeader } from "../../components/Monthly/MonthHeader";
import MonthlyInsights from "../../components/Monthly/MonthlyInsights";
import MonthlyReconciliation from "../../components/Monthly/MonthlyReconciliation";
import { SummaryCards } from "../../components/Monthly/SummaryCards";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
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

  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const [banks, setBanks] = useState<Record<string, BankDto>>({});
  const [recons, setRecons] = useState<ReconSummary[]>([]);
  const [selectedRecon, setSelectedRecon] = useState<ReconSummary | null>(null);

  const [insights, setInsights] = useState<InsightsDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [kpiLoading, setKpiLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };
  const monthName = currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const pageTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);

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
            color: b.color ?? null,
          };
        });
        setBanks(bankMap);

        const list: ReconSummary[] = (reconsRes || []).map((r: any) => ({
          ...r,
          bankName: bankMap[r.bankId]?.name ?? "",
          bankEntity: bankMap[r.bankId]?.entity ?? "",
          bankColor: bankMap[r.bankId]?.color ?? undefined,
          label: `${bankMap[r.bankId]?.name ?? "Banco"}${bankMap[r.bankId]?.entity ? ` | ${bankMap[r.bankId]?.entity}` : ""}`,
        }));

        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecons(list);

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

  const chips = useMemo(() => {
    return recons.map((r) => ({
      id: r.id,
      label: r.label ?? r.bankName ?? "Banco",
      bankColor: r.bankColor,
      reconciled: r.reconciled,
    }));
  }, [recons]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        actions={<MonthHeader monthName={monthName} onChangeMonth={changeMonth} onToday={() => setCurrentDate(new Date())} />}
      />

      <BanksChips
        recons={chips}
        selectedId={selectedRecon?.id ?? ""}
        onSelect={(id) => setSelectedRecon(recons.find((r) => r.id === id) ?? null)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SummaryCards
            income={insights?.totalIncomes ?? 0}
            expense={insights?.totalExpenses ?? 0}
            balance={insights?.balance ?? 0}
          />

          <Card>
            <CardContent className="p-5">
              {kpiLoading ? (
                <p className="text-sm text-muted-foreground">Cargando insights…</p>
              ) : insights ? (
                <MonthlyInsights
                  year={year}
                  month={month}
                  bankId={selectedRecon?.bankId}
                  endpoint="/analytics/monthly"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{error ?? "Sin datos para este periodo."}</p>
              )}
            </CardContent>
          </Card>
        </div>

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
                  color: b.color ?? null,
                };
              });
              setBanks(bankMap);
              const list: ReconSummary[] = (reconsRes || []).map((r: any) => ({
                ...r,
                bankName: bankMap[r.bankId]?.name ?? "",
                bankEntity: bankMap[r.bankId]?.entity ?? "",
                bankColor: bankMap[r.bankId]?.color ?? undefined,
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
          onSelectRecon={(id: string) => setSelectedRecon(recons.find((r) => r.id === id) ?? null)}
          onFetchSuggestion={() => Promise.resolve()}
          onMarkReconciled={() => Promise.resolve()}
          onUpdateClosingBalance={() => Promise.resolve()}
        />
      </div>
    </div>
  );
}
