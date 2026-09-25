import { FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
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

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {emptyHint ??
              "Pregúntame lo que quieras sobre tus finanzas: gastos, presupuestos, préstamos, ahorro, pasanaco… También puedo registrar un gasto o ingreso si me lo pides."}
          </p>
        )}
        {messages.map((entry, messageIndex) => (
          <div key={messageIndex} className="space-y-2">
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                entry.role === "user" ? "ml-6 bg-primary/10 text-foreground" : "mr-6 bg-muted text-foreground"
              }`}
            >
              {entry.content}
            </div>
            {entry.actions?.map((action, actionIndex) => {
              const resolved = entry.resolvedActions?.has(actionIndex);
              const key = `${messageIndex}-${actionIndex}`;
              return (
                <div
                  key={actionIndex}
                  className="mr-6 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm"
                >
                  <span>{action.summary}</span>
                  {resolved ? (
                    <span className="flex items-center gap-1 text-positive">
                      <CheckCircle2 className="h-4 w-4" /> Aplicado
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
