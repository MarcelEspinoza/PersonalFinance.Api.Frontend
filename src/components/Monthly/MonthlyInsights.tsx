"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  byCategory: Array<{ categoryId: number; categoryName: string; amount: number; pct: number }>;
  topExpenses: Array<{ id: number; description: string; amount: number; date: string; categoryName?: string }>;
  topIncomes: Array<{ id: number; description: string; amount: number; date: string; categoryName?: string }>;
  largestIncome?: { id: number; description: string; amount: number; date: string; categoryName?: string } | null;
};

export type MonthlyInsightsProps = {
  year: number;
  month: number;
  bankId?: string;
  endpoint?: string; // default: "/api/analytics/monthly"
};

// ============================
// Utils
// ============================
const fmtCurrency = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);
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

const PALETTE = [
  "#0ea5e9",
  "#f97316",
  "#22c55e",
  "#eab308",
  "#6366f1",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
  "#84cc16",
  "#f59e0b",
];

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
        if (!cancel) setError(err?.response?.data?.message || err.message || "Error al cargar insights");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [year, month, bankId, endpoint]);

  const currency = data?.currency ?? "EUR";

  // ✅ Formatter con tipo oficial y tolerancia a undefined
  const tooltipCurrencyFormatter = useMemo<Formatter<ValueType, NameType>>(
    () => (value) => fmtCurrency(toNumberAny(value), currency),
    [currency]
  );

  const yAxisCurrencyTick = useMemo(() => {
    return (v: string | number) => fmtCurrency(typeof v === "number" ? v : Number(v) || 0, currency);
  }, [currency]);

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
      { label: "Gasto medio diario", value: fmtCurrency(data.avgDailySpend, currency) },
    ];
  }, [data, currency]);

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* KPI Cards */}
      <section className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {loading && <div className="col-span-full text-sm text-slate-500">Cargando insights…</div>}
        {error && <div className="col-span-full text-sm text-rose-600">{error}</div>}
        {kpis?.map((k) => (
          <article key={k.label} className="rounded-2xl border p-4 bg-white shadow-sm">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`mt-1 text-lg font-semibold ${k.accent ?? "text-slate-900"}`}>{k.value}</div>
          </article>
        ))}
      </section>

      {/* Donut categorías */}
      <section className="rounded-2xl border p-4 bg-white shadow-sm">
        <header className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Gasto por categoría</h4>
          <div className="text-xs text-slate-500">Top 10</div>
        </header>
        <div className="h-64">
          {data?.byCategory?.length ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.byCategory} dataKey="amount" nameKey="categoryName" innerRadius={55} outerRadius={90}>
                  {data.byCategory.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipCurrencyFormatter} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-slate-500">Sin datos</div>
          )}
        </div>
        {data?.byCategory?.length ? (
          <ul className="mt-3 space-y-1 max-h-28 overflow-auto pr-1">
            {data.byCategory.slice(0, 6).map((c) => (
              <li key={c.categoryId} className="text-xs flex justify-between">
                <span className="truncate text-slate-600">{c.categoryName}</span>
                <span className="font-medium">
                  {fmtCurrency(c.amount, currency)}{" "}
                  <span className="text-slate-400">({fmtPct(c.pct)})</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Top 5 gastos */}
      <section className="rounded-2xl border p-4 bg-white shadow-sm">
        <header className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Top 5 gastos</h4>
          <div className="text-xs text-slate-500">Importe absoluto</div>
        </header>
        <div className="h-64">
          {data?.topExpenses?.length ? (
            <ResponsiveContainer>
              <BarChart data={data.topExpenses.slice(0, 5)} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="description" hide />
                <YAxis tickFormatter={yAxisCurrencyTick} />
                <Tooltip
                  formatter={tooltipCurrencyFormatter}
                  labelFormatter={(label: string | number) => String(label)}
                />
                <Bar dataKey="amount" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-slate-500">Sin datos</div>
          )}
        </div>
        <ul className="mt-3 space-y-1">
          {data?.topExpenses?.slice(0, 5).map((e) => (
            <li key={e.id} className="text-xs flex justify-between">
              <span className="truncate text-slate-600">{e.description}</span>
              <span className="font-medium text-rose-600">
                -{fmtCurrency(e.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Top ingresos */}
      <section className="rounded-2xl border p-4 bg-white shadow-sm">
        <header className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Top ingresos</h4>
          <div className="text-xs text-slate-500">Mayor a menor</div>
        </header>
        <div className="space-y-2">
          {data?.topIncomes?.slice(0, 5).map((i) => (
            <div key={i.id} className="flex items-center justify-between text-xs">
              <div className="truncate text-slate-600">{i.description}</div>
              <div className="font-medium text-emerald-600">
                {fmtCurrency(i.amount, currency)}
              </div>
            </div>
          )) || <div className="text-xs text-slate-500">Sin datos</div>}
        </div>
        {data?.largestIncome && (
          <div className="mt-3 text-xs text-slate-500">
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
