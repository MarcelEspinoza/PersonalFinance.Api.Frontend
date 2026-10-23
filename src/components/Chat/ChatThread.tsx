import { useEffect, useRef, type FormEvent } from "react";
import { Bell, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "../ui/button";
import { useGlobalChat } from "../../hooks/useGlobalChat";

interface ChatThreadProps {
  chat: ReturnType<typeof useGlobalChat>;
  emptyHint?: string;
}

/**
 * Lista de mensajes + input + tarjetas de acciones propuestas. Compartido por
 * la burbuja flotante y la página dedicada del asistente para no duplicar
 * la lógica de confirmación de acciones.
 */
export function ChatThread({ chat, emptyHint }: ChatThreadProps) {
  const { messages, input, setInput, busy, actionBusy, send, confirmAction } = chat;
  const listRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const renderedCountRef = useRef(0);

  // New user message: show the end (and the "Pensando…" line). New assistant message: show its
  // beginning, so long answers are read from the top instead of from the last line.
  // Scrolls only the message list (not the page behind the floating bubble).
  useEffect(() => {
    const previousCount = renderedCountRef.current;
    renderedCountRef.current = messages.length;
    const container = listRef.current;
    if (!container || messages.length <= previousCount) return;

    const behavior: ScrollBehavior = previousCount === 0 ? "auto" : "smooth";
    const lastIndex = messages.length - 1;
    const lastElement = messageRefs.current[lastIndex];
    if (messages[lastIndex].role === "assistant" && lastElement) {
      const offset = lastElement.getBoundingClientRect().top - container.getBoundingClientRect().top;
      container.scrollTo({ top: Math.max(0, container.scrollTop + offset - 8), behavior });
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }
  }, [messages]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {emptyHint ??
              "Pregúntame lo que quieras sobre tus finanzas. También puedo preparar movimientos, categorías, presupuestos, pagos de préstamos, cambios de Pasanaco, clasificaciones de importación y recordatorios; nada se aplica sin tu confirmación."}
          </p>
        )}
        {messages.map((entry, messageIndex) => (
          <div
            key={messageIndex}
            ref={(element: HTMLDivElement | null) => {
              messageRefs.current[messageIndex] = element;
            }}
            className="space-y-2"
          >
            <div
              className={`whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm ${
                entry.role === "user" ? "ml-6 bg-primary/10 text-foreground" : "mr-6 bg-muted text-foreground"
              }`}
            >
              {entry.content}
            </div>
            {entry.actions?.map((action, actionIndex) => {
              const resolved = entry.resolvedActions?.has(actionIndex);
              const key = `${messageIndex}-${actionIndex}`;
              const isReminder = action.type === "create_reminder";
              return (
                <div
                  key={actionIndex}
                  className="mr-6 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm"
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
                      <CheckCircle2 className="h-4 w-4" /> {isReminder ? "Recordatorio creado" : "Aplicado"}
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
        ))}
        {busy && (
          <div className="mr-6 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Pensando…
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
        <input
          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
          placeholder="Escribe un mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
