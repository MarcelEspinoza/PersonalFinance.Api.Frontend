import { Bell, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import type { GlobalChat } from "../../hooks/useGlobalChat";
import { ApiCallActionCard } from "./ApiCallActionCard";

interface ChatActionCardsProps {
  chat: GlobalChat;
  messageIndex: number;
  className?: string;
}

/** Changes the assistant proposed in one message; each one waits for the user's «Confirmar». */
export function ChatActionCards({ chat, messageIndex, className }: ChatActionCardsProps) {
  const { messages, actionBusy, apiCallsRunning, confirmAction } = chat;
  const entry = messages[messageIndex];
  const actions = entry?.actions ?? [];
  if (actions.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {actions.map((action, actionIndex) => {
        const resolved = entry.resolvedActions?.has(actionIndex);
        const key = `${messageIndex}-${actionIndex}`;
        if (action.type === "api_call") {
          return (
            <ApiCallActionCard
              key={actionIndex}
              action={action}
              resolved={Boolean(resolved)}
              busy={apiCallsRunning.includes(key)}
              onConfirm={() => void confirmAction(messageIndex, actionIndex, action)}
            />
          );
        }
        const isReminder = action.type.endsWith("_reminder");
        const doneLabel =
          action.type === "create_reminder"
            ? "Recordatorio creado"
            : action.type === "complete_reminder"
              ? "Hecho"
              : action.type === "delete_reminder"
                ? "Borrado"
                : "Aplicado";
        return (
          <div
            key={actionIndex}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm"
          >
            {isReminder ? (
              <span className="flex min-w-0 items-start gap-2">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span className="min-w-0 break-words">{action.summary}</span>
              </span>
            ) : (
              <span className="min-w-0 break-words">{action.summary}</span>
            )}
            {resolved ? (
              <span className="flex items-center gap-1 text-positive">
                <CheckCircle2 className="h-4 w-4" /> {doneLabel}
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={actionBusy === key}
                onClick={() => void confirmAction(messageIndex, actionIndex, action)}
              >
                {actionBusy === key ? "Aplicando…" : "Confirmar"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
