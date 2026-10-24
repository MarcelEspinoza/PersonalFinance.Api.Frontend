import { AlertTriangle, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import { apiCallTitle } from "../../services/chatService";
import type { ProposedAction } from "../../types/chat";

interface ApiCallActionCardProps {
  action: ProposedAction;
  resolved: boolean;
  busy: boolean;
  onConfirm: () => void;
}

const formatBody = (body: unknown): string | null => {
  if (body == null) return null;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
};

/** Admin-only proposal: a write request against the API that only runs after the user confirms it. */
export function ApiCallActionCard({ action, resolved, busy, onConfirm }: ApiCallActionCardProps) {
  const isDelete = action.method === "DELETE";
  // A DELETE is treated as dangerous even if the server didn't flag it.
  const danger = action.danger === true || isDelete;
  const targetName = action.targetName?.trim();
  const aiSummary = action.summary?.trim();
  const body = formatBody(action.body);

  return (
    <div
      className={`mr-6 space-y-2 rounded-md border px-3 py-2 text-sm ${
        danger ? "border-destructive/40 bg-destructive/5" : "border-primary/25 bg-primary/5"
      }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <ShieldCheck
          className={`mt-0.5 h-4 w-4 shrink-0 ${danger ? "text-destructive" : "text-primary"}`}
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-0.5">
          <p className="break-words font-medium">{apiCallTitle(action)}</p>
          {targetName && <p className="break-words">{targetName}</p>}
          {aiSummary && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{aiSummary}</p>}
        </div>
      </div>
      {danger && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Ojo: esta acción puede borrar o cambiar datos importantes.{isDelete && " No se puede deshacer."}
          </span>
        </p>
      )}
      <details className="group text-xs">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
          Ver detalles técnicos
        </summary>
        <div className="mt-1 space-y-1 rounded-md border bg-background p-2 font-mono">
          <p className="break-all">
            <span className="font-semibold">{action.method ?? "—"}</span> {action.path ?? "—"}
          </p>
          {body && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words">{body}</pre>}
        </div>
      </details>
      <div className="flex justify-end">
        {resolved ? (
          <span className="flex items-center gap-1 text-positive">
            <CheckCircle2 className="h-4 w-4" /> Hecho
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={danger ? "destructive" : "default"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Aplicando…" : danger ? "Sí, hacerlo" : "Confirmar"}
          </Button>
        )}
      </div>
    </div>
  );
}
