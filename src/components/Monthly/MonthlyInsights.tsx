"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import apiClient from "../../lib/apiClient";

export type MonthlyInsightsResponse = {
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
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    amount: number;
    pct: number;
  }>;
  topExpenses: Array<{
    id: number;
    description: string;
    amount: number;
    date: string;
    categoryName?: string;
  }>;
  topIncomes: Array<{
    id: number;
    description: string;
    amount: number;
    date: string;
    categoryName?: string;
  }>;
  largestIncome?: {
    id: number;
    description: string;
    amount: number;
    date: string;
    categoryName?: string;
  } | null;
};

export type MonthlyInsightsProps = {
  year: number;
  month: number;
  bankId?: string;
  endpoint?: string;
};

const fmtCurrency = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function MonthlyInsights({
  year,
  month,
  bankId,
  endpoint = "/api/analytics/monthly",
}: MonthlyInsightsProps) {
  const [data, setData] = useState<MonthlyInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<MonthlyInsightsResponse>(endpoint, {
          params: { year, month, bankId },
        });
        if (!cancel) setData(res.data);
      } catch (err: any) {
        if (!cancel)
          setError(
            err?.response?.data?.message ??
              err.message ??
              "Error al cargar insights"
          );
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [year, month, bankId, endpoint]);

  const currency = data?.currency ?? "EUR";

  const kpis = useMemo(() => {
    if (!data) return null;
    return [
      { label: "Ingresos del mes", value: fmtCurrency(data.totalIncomes, currency), accent: "text-positive" },
      { label: "Gastos del mes", value: fmtCurrency(data.totalExpenses, currency), accent: "text-negative" },
      {
        label: "Balance del mes",
        value: fmtCurrency(data.balance, currency),
        accent: data.balance >= 0 ? "text-positive" : "text-negative",
      },
      { label: "Tasa de ahorro", value: fmtPct(data.savingsRate || 0) },
      { label: "Movimientos", value: String(data.txCount) },
      { label: "Días con gasto", value: String(data.daysWithSpend) },
      {
        label: "Gasto medio diario",
        value: fmtCurrency(data.avgDailySpend, currency),
        accent: "text-negative",
      },
    ];
  }, [data, currency]);

  return (
    <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-3">
      <section className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {loading && <p className="col-span-full text-sm text-muted-foreground">Cargando insights…</p>}
        {error && <p className="col-span-full text-sm text-negative">{error}</p>}
        {kpis?.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`mt-2 text-xl font-semibold tracking-tight tabular-nums ${k.accent ?? "text-card-foreground"}`}>
                {k.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm">Gasto por categoría</CardTitle>
          <span className="text-xs text-muted-foreground">Top 10</span>
        </CardHeader>
        <CardContent>
          {data?.byCategory?.length ? (
            <ul className="space-y-3">
              {data.byCategory.slice(0, 10).map((c) => (
                <li key={c.categoryId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.categoryName}</p>
                    <p className="text-xs text-muted-foreground">{fmtPct(c.pct)}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-negative tabular-nums">-{fmtCurrency(c.amount, currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm">Top gastos</CardTitle>
          <span className="text-xs text-muted-foreground">Mayor a menor</span>
        </CardHeader>
        <CardContent>
          {data?.topExpenses?.length ? (
            <div className="space-y-3">
              {data.topExpenses.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <p className="truncate text-muted-foreground">{e.description}</p>
                  <p className="shrink-0 font-semibold text-negative tabular-nums">-{fmtCurrency(e.amount, currency)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm">Top ingresos</CardTitle>
          <span className="text-xs text-muted-foreground">Mayor a menor</span>
        </CardHeader>
        <CardContent>
          {data?.topIncomes?.length ? (
            <div className="space-y-3">
              {data.topIncomes.slice(0, 5).map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                  <p className="truncate text-muted-foreground">{i.description}</p>
                  <p className="shrink-0 font-semibold text-positive tabular-nums">{fmtCurrency(i.amount, currency)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin datos</p>
          )}

          {data?.largestIncome && (
            <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
              Mayor ingreso: <span className="font-medium text-card-foreground">{data.largestIncome.description}</span>{" "}
              por <span className="font-semibold text-positive">{fmtCurrency(data.largestIncome.amount, currency)}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
