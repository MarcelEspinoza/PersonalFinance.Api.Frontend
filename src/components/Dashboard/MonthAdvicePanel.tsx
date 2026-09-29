import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { getMonthAdvice, type AdviceSeverity, type MonthAdvice } from "../../services/dashboardService";

type Props = {
  year: number;
  month: number;
  monthName: string;
};

const storageKey = (year: number, month: number) => `month-advice:${year}-${month}`;

const readCached = (year: number, month: number): MonthAdvice | null => {
  try {
    const raw = localStorage.getItem(storageKey(year, month));
    return raw ? (JSON.parse(raw) as MonthAdvice) : null;
  } catch {
    return null;
  }
};

const severityStyle: Record<AdviceSeverity, { box: string; icon: ReactNode }> = {
  danger: { box: "border-negative/30 bg-negative-soft/40", icon: <AlertOctagon className="h-4 w-4 text-negative" /> },
  warning: { box: "border-warning/30 bg-warning-soft/40", icon: <AlertTriangle className="h-4 w-4 text-warning" /> },
  info: { box: "border-primary/20 bg-primary/5", icon: <Info className="h-4 w-4 text-primary" /> },
  good: { box: "border-positive/30 bg-positive-soft/40", icon: <CheckCircle2 className="h-4 w-4 text-positive" /> },
};

export function MonthAdvicePanel({ year, month, monthName }: Props) {
  const [advice, setAdvice] = useState<MonthAdvice | null>(() => readCached(year, month));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAdvice(readCached(year, month));
    setError(null);
  }, [year, month]);

  const analyse = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getMonthAdvice(year, month);
      setAdvice(data);
      if (data.available) localStorage.setItem(storageKey(year, month), JSON.stringify(data));
    } catch {
      setError("No se ha podido obtener el análisis. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Consejos de la IA para {monthName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lee tu previsión de este mes y los dos siguientes y te explica qué va a pasar y qué hacer.
            </p>
          </div>
          <Button onClick={() => void analyse()} disabled={loading} variant={advice ? "outline" : "default"}>
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : advice ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analizando…" : advice ? "Volver a analizar" : "Analizar mi mes"}
          </Button>
        </div>

        {error && <p className="rounded-lg bg-negative-soft p-3 text-sm text-negative">{error}</p>}

        {advice && (
          <div className="space-y-3">
            {advice.summary && <p className="text-sm leading-relaxed">{advice.summary}</p>}
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {advice.insights.map((insight, index) => {
                const style = severityStyle[insight.severity] ?? severityStyle.info;
                return (
                  <div key={index} className={`rounded-lg border p-3 ${style.box}`}>
                    <p className="flex items-center gap-2 text-sm font-semibold">{style.icon}{insight.title}</p>
                    {insight.detail && <p className="mt-1 text-sm leading-relaxed text-foreground/90">{insight.detail}</p>}
                  </div>
                );
              })}
            </div>
            {advice.available && (
              <p className="text-xs text-muted-foreground">
                Análisis del {new Date(advice.generatedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.
                Si cambias pagos o cobros, vuelve a analizar.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
