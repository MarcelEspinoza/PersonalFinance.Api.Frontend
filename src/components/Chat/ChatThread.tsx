import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "../ui/button";
import { useAutosizeTextarea } from "../../hooks/useAutosizeTextarea";
import type { GlobalChat } from "../../hooks/useGlobalChat";
import { ChatActionCards } from "./ChatActionCards";

export const GLOBAL_CHAT_EMPTY_HINT =
  "Pregúntame lo que quieras sobre tus finanzas. También puedo preparar movimientos, categorías, presupuestos, pagos de préstamos, cambios de Pasanaco, clasificaciones de importación y recordatorios; nada se aplica sin tu confirmación.";
const MAX_INPUT_HEIGHT_PX = 160;

interface ChatThreadProps {
  chat: GlobalChat;
  emptyHint?: string;
}

/**
 * Full-page conversation with the global assistant (the «Asistente» screen). It shows the same
 * conversation as the docked panel, which hides on that screen.
 */
export function ChatThread({ chat, emptyHint }: ChatThreadProps) {
  const { messages, input, setInput, busy, send } = chat;
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const renderedCountRef = useRef(0);
  const canSend = !busy && input.trim().length > 0;

  useAutosizeTextarea(inputRef, input, MAX_INPUT_HEIGHT_PX);

  // New user message: show the end (and the "Pensando…" line). New assistant message: show its
  // beginning, so long answers are read from the top instead of from the last line.
  // Scrolls only the message list, not the page.
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
    if (canSend) void send(input);
  };

  // Enter sends; Shift+Enter starts a new line.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) void send(input);
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyHint ?? GLOBAL_CHAT_EMPTY_HINT}</p>
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
            <ChatActionCards chat={chat} messageIndex={messageIndex} className="mr-6" />
          </div>
        ))}
        {busy && (
          <div className="mr-6 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Pensando…
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t p-3">
        <textarea
          ref={inputRef}
          rows={1}
          className="min-h-[2.25rem] flex-1 resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-sm leading-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje para el asistente"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" size="icon" className="shrink-0" disabled={!canSend} title="Enviar" aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
