import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Loader2, MessageCircle, RefreshCw, Send, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  getAdviceNotes,
  getMonthAdvice,
  replyToAdvice,
  type AdviceNote,
  type AdviceSeverity,
  type MonthAdvice,
} from "../../services/dashboardService";

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
  const [notes, setNotes] = useState<AdviceNote[]>([]);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    setAdvice(readCached(year, month));
    setError(null);
    setOpenThread(null);
    setDrafts({});
    setNotes([]);

    let cancelled = false;
    void getAdviceNotes(year, month)
      .then(({ data }) => {
        if (!cancelled) setNotes(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
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

  const send = async (insightTitle: string, insightDetail: string) => {
    const message = (drafts[insightTitle] ?? "").trim();
    if (!message) return;

    setSending(insightTitle);
    setError(null);
    try {
      const { data } = await replyToAdvice({ year, month, insightTitle, insightDetail, message });
      setNotes((current) => [
        ...current.filter((note) => note.insightTitle !== insightTitle),
        ...data.thread,
      ]);
      setDrafts((current) => ({ ...current, [insightTitle]: "" }));
    } catch {
      setError("No se ha podido enviar tu respuesta. Inténtalo de nuevo.");
    } finally {
      setSending(null);
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
                const thread = notes.filter((note) => note.insightTitle === insight.title);
                const open = openThread === insight.title;
                return (
                  <div key={index} className={`rounded-lg border p-3 ${style.box}`}>
                    <p className="flex items-center gap-2 text-sm font-semibold">{style.icon}{insight.title}</p>
                    {insight.detail && <p className="mt-1 text-sm leading-relaxed text-foreground/90">{insight.detail}</p>}

                    {thread.length > 0 && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        {thread.map((note, noteIndex) => (
                          <div key={noteIndex} className="space-y-1">
                            <p className="rounded-md bg-background/70 px-2 py-1 text-xs">
                              <span className="font-medium">Tú: </span>{note.message}
                            </p>
                            <p className="px-2 text-xs leading-relaxed text-muted-foreground">{note.reply}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {open ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={drafts[insight.title] ?? ""}
                          onChange={(event) => setDrafts((current) => ({ ...current, [insight.title]: event.target.value }))}
                          rows={2}
                          autoFocus
                          placeholder="Corrígeme, dime que no aplica o pregúntame algo…"
                          className="w-full rounded-md border bg-background p-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => void send(insight.title, insight.detail)}
                            disabled={sending === insight.title || !(drafts[insight.title] ?? "").trim()}
                          >
                            {sending === insight.title
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Send className="h-4 w-4" />}
                            Enviar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setOpenThread(null)}>
                            Cerrar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenThread(insight.title)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {thread.length > 0 ? "Seguir la conversación" : "Responder a este consejo"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {notes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Tus respuestas se tienen en cuenta la próxima vez que analices el mes.
              </p>
            )}
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
