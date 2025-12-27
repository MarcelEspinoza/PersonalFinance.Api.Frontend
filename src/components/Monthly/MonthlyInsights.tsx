"use client";
import { useEffect, useMemo, useState } from "react";
import type {
  Formatter,
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import apiClient from "../../lib/apiClient";

// ============================
// Types
// ============================
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

// ============================
// Utils
// ============================
const fmtCurrency = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const toNumberAny = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  if (Array.isArray(v) && v.length) {
    const x = v[0] as unknown;
    if (typeof x === "number") return x;
    if (typeof x === "string") return Number(x) || 0;
  }
  return 0;
};

// ============================
// Component
// ============================
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

  // formatter seguro (por si algún día lo reutilizas)
  const tooltipCurrencyFormatter = useMemo<
    Formatter<ValueType, NameType>
  >(
    () => (value) => fmtCurrency(toNumberAny(value), currency),
    [currency]
  );

  const kpis = useMemo(() => {
    if (!data) return null;
    return [
      { label: "Ingresos del mes", value: fmtCurrency(data.totalIncomes, currency) },
      { label: "Gastos del mes", value: fmtCurrency(data.totalExpenses, currency) },
      {
        label: "Balance del mes",
        value: fmtCurrency(data.balance, currency),
        accent: data.balance >= 0 ? "text-emerald-600" : "text-rose-600",
      },
      { label: "Tasa de ahorro", value: fmtPct(data.savingsRate || 0) },
      { label: "Movimientos", value: String(data.txCount) },
      { label: "Días con gasto", value: String(data.daysWithSpend) },
      {
        label: "Gasto medio diario",
        value: fmtCurrency(data.avgDailySpend, currency),
      },
    ];
  }, [data, currency]);

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* KPIs */}
      <section className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {loading && (
          <div className="col-span-full text-sm text-slate-500">
            Cargando insights…
          </div>
        )}
        {error && (
          <div className="col-span-full text-sm text-rose-600">
            {error}
          </div>
        )}
        {kpis?.map((k) => (
          <article
            key={k.label}
            className="rounded-2xl border bg-white shadow-sm px-4 py-5 flex flex-col items-center justify-center text-center"
          >
            <div className="text-xs text-slate-500">{k.label}</div>
            <div
              className={`mt-2 text-xl font-semibold tracking-tight ${
                k.accent ?? "text-slate-900"
              }`}
            >
              {k.value}
            </div>
          </article>
        ))}
      </section>

      {/* Gasto por categoría */}
      <section className="rounded-2xl border p-4 bg-white shadow-sm">
        <header className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold">Gasto por categoría</h4>
          <span className="text-xs text-slate-500">Top 10</span>
        </header>

        {data?.byCategory?.length ? (
          <ul className="space-y-3">
            {data.byCategory.slice(0, 10).map((c) => (
              <li
                key={c.categoryId}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-700">
                    {c.categoryName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {fmtPct(c.pct)}
                  </span>
                </div>
                <span className="font-semibold text-rose-600 tabular-nums">
                  -{fmtCurrency(c.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-slate-500">Sin datos</div>
        )}
      </section>

      {/* Top gastos */}
      <section className="rounded-2xl border p-4 bg-white shadow-sm">
        <header className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold">Top gastos</h4>
          <span className="text-xs text-slate-500">Mayor a menor</span>
        </header>

        {data?.topExpenses?.length ? (
          <div className="space-y-3">
            {data.topExpenses.slice(0, 5).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="truncate text-slate-600">
                  {e.description}
                </div>
                <div className="font-semibold text-rose-600 tabular-nums">
                  -{fmtCurrency(e.amount, currency)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Sin datos</div>
        )}
      </section>

      {/* Top ingresos */}
      <section className="rounded-2xl border p-4 bg-white shadow-sm">
        <header className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold">Top ingresos</h4>
          <span className="text-xs text-slate-500">Mayor a menor</span>
        </header>

        {data?.topIncomes?.length ? (
          <div className="space-y-3">
            {data.topIncomes.slice(0, 5).map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="truncate text-slate-600">
                  {i.description}
                </div>
                <div className="font-semibold text-emerald-600 tabular-nums">
                  {fmtCurrency(i.amount, currency)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Sin datos</div>
        )}

        {data?.largestIncome && (
          <div className="mt-4 text-xs text-slate-500">
            Mayor ingreso:{" "}
            <span className="font-medium text-slate-700">
              {data.largestIncome.description}
            </span>{" "}
            por{" "}
            <span className="font-semibold text-emerald-600">
              {fmtCurrency(data.largestIncome.amount, currency)}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
