import { AlertTriangle, ChevronDown, Eye, EyeOff, Loader2, MessageCircle, PiggyBank, RefreshCw, Search, Send } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { cn } from "../../lib/utils";
import {
  analyze,
  getState,
  saveNote,
  serviceSavingsError,
  type ServiceNote,
  type ServiceSavingAction,
  type ServiceSavingItem,
  type ServiceSavingsState,
} from "../../services/serviceSavingsService";
import { money } from "../../utils/civilDate";
import { Button } from "../ui/button";
import { SectionCard } from "./SectionCard";

const POLL_MS = 4000;
const MAX_POLL_MS = 6 * 60 * 1000;
const TOP_ITEMS = 3;

const ACTIONS: Record<ServiceSavingAction, { label: string; className: string }> = {
  cheaper: { label: "Más barato", className: "bg-positive-soft text-positive" },
  cancel: { label: "Dar de baja", className: "bg-negative-soft text-negative" },
  switch: { label: "Mejor opción", className: "bg-primary/10 text-primary" },
};

const WHOLE_EUROS = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const noteKey = (key: string) => key.toLowerCase();

const formatDay = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

/** Only http(s) links are rendered. */
const safeUrl = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const perMonth = (value: number | null | undefined) => (value == null ? null : `${money(value)}/mes`);

function priceLine(item: ServiceSavingItem): string | null {
  const current = perMonth(item.currentMonthly);
  const target = item.action === "cancel" ? perMonth(0) : perMonth(item.proposalMonthly) ?? item.proposal ?? null;
  if (current && target) return `Pagas ${current} → ${target}`;
  if (current) return `Pagas ${current}`;
  return target ? `→ ${target}` : null;
}

/** «Ahorra en tus servicios»: the AI looks for cheaper offers for the user's recurring payments. */
export function ServiceSavingsCard() {
  const [state, setState] = useState<ServiceSavingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pollRound, setPollRound] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<{ key: string; message: string } | null>(null);
  const mounted = useRef(true);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getState();
      if (mounted.current) setState(data);
    } catch (error) {
      if (mounted.current) setLoadError(serviceSavingsError(error, "No se ha podido cargar esta sección."));
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, []);

  const review = state?.review ?? null;
  const runningId = review?.status === "running" ? review.id : null;

  // While a review runs in the background, poll until it finishes (or for ~6 minutes).
  useEffect(() => {
    if (!runningId) return;
    let cancelled = false;
    let timer: number | undefined;
    const deadline = Date.now() + MAX_POLL_MS;
    setPollTimedOut(false);

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() > deadline) {
        setPollTimedOut(true);
        return;
      }
      try {
        const data = await getState();
        if (cancelled) return;
        setState(data);
        if (data.review?.status === "running" && data.review.id === runningId) {
          timer = window.setTimeout(tick, POLL_MS);
        }
      } catch {
        if (!cancelled) timer = window.setTimeout(tick, POLL_MS);
      }
    };

    timer = window.setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [runningId, pollRound]);

  const checkAgain = async () => {
    setPollRound((round) => round + 1);
    try {
      const data = await getState();
      if (mounted.current) setState(data);
    } catch {
      // Polling goes on.
    }
  };

  const startAnalysis = async () => {
    setStarting(true);
    setActionError(null);
    try {
      const data = await analyze();
      if (!mounted.current) return;
      setState(data);
      setShowAll(false);
      setShowHidden(false);
      setOpenKey(null);
    } catch (error) {
      if (mounted.current) {
        setActionError(serviceSavingsError(error, "No se ha podido iniciar la búsqueda. Inténtalo de nuevo."));
      }
    } finally {
      if (mounted.current) setStarting(false);
    }
  };

  const notes = state?.notes ?? [];
  const notesByKey = new Map(notes.map((note) => [noteKey(note.serviceKey), note] as const));
  const noteFor = (item: ServiceSavingItem) => notesByKey.get(noteKey(item.key));

  const persistNote = async (item: ServiceSavingItem, change: { message?: string | null; dismissed?: boolean }) => {
    const current = noteFor(item);
    setBusyKey(item.key);
    setNoteError(null);
    try {
      const saved = await saveNote({
        serviceKey: item.key,
        serviceName: item.service,
        message: change.message !== undefined ? change.message : current?.message ?? null,
        dismissed: change.dismissed ?? current?.dismissed ?? false,
      });
      if (mounted.current) setState((previous) => (previous ? { ...previous, notes: saved } : previous));
      return true;
    } catch (error) {
      if (mounted.current) {
        setNoteError({ key: item.key, message: serviceSavingsError(error, "No se ha podido guardar. Inténtalo de nuevo.") });
      }
      return false;
    } finally {
      if (mounted.current) setBusyKey(null);
    }
  };

  const items = review?.status === "done" ? review.items ?? [] : [];
  const visibleItems = items.filter((item) => !noteFor(item)?.dismissed);
  const hiddenItems = items.filter((item) => !!noteFor(item)?.dismissed);
  const shownItems = showAll ? visibleItems : visibleItems.slice(0, TOP_ITEMS);
  const totalSaving = visibleItems.reduce((sum, item) => sum + Math.max(0, item.monthlySaving ?? 0), 0);
  const limitReached = !!state && state.remainingToday <= 0;
  const reviewDate = review ? formatDay(review.completedAt ?? review.startedAt) : null;

  const renderRow = (item: ServiceSavingItem) => (
    <SavingRow
      key={item.key}
      item={item}
      note={noteFor(item)}
      open={openKey === item.key}
      busy={busyKey === item.key}
      error={noteError?.key === item.key ? noteError.message : null}
      onToggle={() => setOpenKey((current) => (current === item.key ? null : item.key))}
      onSaveComment={(message) => persistNote(item, { message: message || null })}
      onSetHidden={(hidden) => void persistNote(item, { dismissed: hidden })}
    />
  );

  const limitHint = limitReached && <p className="text-xs text-muted-foreground">Podrás volver a buscar mañana.</p>;
  const actionErrorText = actionError && <p className="text-xs text-negative">{actionError}</p>;

  let body;
  if (loading && !state) {
    body = (
      <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando…
      </p>
    );
  } else if (!state) {
    body = (
      <div className="space-y-3 p-5">
        <p className="text-sm text-negative">{loadError ?? "No se ha podido cargar esta sección."}</p>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  } else if (!review) {
    body = (
      <div className="space-y-3 p-5">
        <p className="text-sm text-muted-foreground">
          La IA revisa tus recibos, suscripciones y préstamos y te dice dónde podrías pagar menos.
        </p>
        <Button size="sm" onClick={() => void startAnalysis()} disabled={starting || limitReached}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar ofertas
        </Button>
        <p className="text-xs text-muted-foreground">La IA busca precios actuales en internet. Tarda 1-2 minutos.</p>
        {limitHint}
        {actionErrorText}
      </div>
    );
  } else if (review.status === "running") {
    body = (
      <div className="space-y-2 p-5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          Buscando ofertas… puede tardar 1-2 minutos
        </p>
        <p className="text-xs text-muted-foreground">Puedes seguir usando la app; el resultado aparecerá aquí.</p>
        {pollTimedOut && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Está tardando más de lo normal.
            <Button size="sm" variant="outline" onClick={() => void checkAgain()}>
              <RefreshCw className="h-4 w-4" />
              Comprobar
            </Button>
          </div>
        )}
      </div>
    );
  } else if (review.status === "failed") {
    body = (
      <div className="space-y-3 p-5">
        <p className="flex items-start gap-2 rounded-lg bg-negative-soft p-3 text-sm text-negative">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {review.error || "No se ha podido completar la búsqueda."}
        </p>
        <Button size="sm" variant="outline" onClick={() => void startAnalysis()} disabled={starting || limitReached}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Reintentar
        </Button>
        {limitHint}
        {actionErrorText}
      </div>
    );
  } else {
    body = (
      <>
        <div className="space-y-1 px-5 pb-3 pt-4">
          <p className="text-sm font-semibold">
            {totalSaving > 0 ? (
              <>
                Podrías ahorrar unos <span className="text-positive">{WHOLE_EUROS.format(totalSaving)}/mes</span>
              </>
            ) : visibleItems.length > 0 ? (
              "No hay ahorros claros, pero tienes alguna opción que mirar"
            ) : hiddenItems.length > 0 ? (
              "Has ocultado todas las sugerencias"
            ) : (
              "No hemos encontrado mejoras claras. ¡Bien hecho!"
            )}
          </p>
          {review.summary && (
            <p className="line-clamp-2 text-xs text-muted-foreground" title={review.summary}>
              {review.summary}
            </p>
          )}
        </div>

        {shownItems.length > 0 && <ul className="divide-y border-t">{shownItems.map(renderRow)}</ul>}

        {(visibleItems.length > TOP_ITEMS || hiddenItems.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2 text-xs font-medium">
            {visibleItems.length > TOP_ITEMS ? (
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {showAll ? "Ver menos" : `Ver todas (${visibleItems.length})`}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-180")} />
              </button>
            ) : (
              <span />
            )}
            {hiddenItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHidden((value) => !value)}
                className="text-muted-foreground hover:text-foreground"
              >
                {hiddenItems.length} {hiddenItems.length === 1 ? "oculta" : "ocultas"} · {showHidden ? "No mostrar" : "Mostrar"}
              </button>
            )}
          </div>
        )}

        {showHidden && hiddenItems.length > 0 && (
          <ul className="divide-y border-t bg-muted/30">{hiddenItems.map(renderRow)}</ul>
        )}

        <div className="space-y-2 border-t px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void startAnalysis()} disabled={starting || limitReached}>
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Volver a buscar
            </Button>
            {limitReached && <span className="text-xs text-muted-foreground">Podrás volver a buscar mañana</span>}
          </div>
          {actionErrorText}
          <p className="text-[11px] leading-snug text-muted-foreground">
            Precios encontrados en internet el {reviewDate}. Compruébalos antes de cambiar.
          </p>
        </div>
      </>
    );
  }

  return (
    <SectionCard
      icon={<PiggyBank className="h-5 w-5 text-primary" />}
      title="Ahorra en tus servicios"
      subtitle={review?.status === "done" && reviewDate ? `Última búsqueda: ${reviewDate}` : undefined}
      bodyClassName="p-0"
    >
      {body}
    </SectionCard>
  );
}

type SavingRowProps = {
  item: ServiceSavingItem;
  note?: ServiceNote;
  open: boolean;
  busy: boolean;
  error: string | null;
  onToggle: () => void;
  onSaveComment: (message: string) => Promise<boolean>;
  onSetHidden: (hidden: boolean) => void;
};

function SavingRow({ item, note, open, busy, error, onToggle, onSaveComment, onSetHidden }: SavingRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.message ?? "");
  const action = ACTIONS[item.action] ?? ACTIONS.switch;
  const saving = Math.max(0, item.monthlySaving ?? 0);
  const hidden = !!note?.dismissed;
  const price = priceLine(item);
  const links = (item.sources ?? [])
    .map((source) => ({ title: source.title, url: safeUrl(source.url) }))
    .filter((source): source is { title: string; url: string } => source.url !== null);

  const save = async () => {
    if (await onSaveComment(draft.trim())) setEditing(false);
  };

  return (
    <li className={cn(hidden && "opacity-70")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-2 px-5 py-2.5 text-left hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none", action.className)}>
              {action.label}
            </span>
            <span className="truncate text-sm font-medium">
              {item.service}
              {item.provider && <span className="font-normal text-muted-foreground"> · {item.provider}</span>}
            </span>
          </div>
          {price && <p className="mt-0.5 truncate text-xs text-muted-foreground">{price}</p>}
          {saving > 0 && <p className="text-xs font-semibold text-positive">Ahorras {money(saving)}/mes</p>}
        </div>
        <ChevronDown
          className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-2 px-5 pb-3 text-xs leading-relaxed">
          {item.proposal && (
            <p>
              <span className="font-medium">Propuesta: </span>
              {item.proposal}
            </p>
          )}
          {item.detail && <p className="text-foreground/90">{item.detail}</p>}
          {item.caution && (
            <p className="flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning-soft/40 p-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              {item.caution}
            </p>
          )}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.title}
                  className="font-medium text-primary hover:underline"
                >
                  Ver oferta ↗ <span className="font-normal text-muted-foreground">{hostOf(link.url)}</span>
                </a>
              ))}
            </div>
          )}

          {note?.message && !editing && (
            <p className="rounded-md bg-muted/50 px-2 py-1">
              <span className="font-medium">Tu comentario: </span>
              {note.message}
            </p>
          )}

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)}
                rows={2}
                maxLength={1000}
                autoFocus
                placeholder="Ej.: tengo permanencia hasta marzo"
                className="w-full rounded-md border bg-background p-2 text-xs"
              />
              <p className="text-muted-foreground">La IA lo tendrá en cuenta la próxima vez que busques.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void save()} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setDraft(note?.message ?? "");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraft(note?.message ?? "");
                  setEditing(true);
                }}
                className="flex items-center gap-1 font-medium text-primary"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {note?.message ? "Editar comentario" : "Comentar"}
              </button>
              <button
                type="button"
                onClick={() => onSetHidden(!hidden)}
                disabled={busy}
                className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : hidden ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                {hidden ? "Mostrar" : "Ocultar"}
              </button>
            </div>
          )}
          {!editing && !note?.message && (
            <p className="text-muted-foreground">Si comentas algo (por ejemplo, una permanencia), la IA lo tendrá en cuenta la próxima vez.</p>
          )}
          {error && <p className="text-negative">{error}</p>}
        </div>
      )}
    </li>
  );
}
