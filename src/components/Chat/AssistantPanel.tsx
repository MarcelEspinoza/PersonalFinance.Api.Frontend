import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowDown, ChevronDown, ChevronUp, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useAutosizeTextarea } from "../../hooks/useAutosizeTextarea";
import { LARGE_SCREEN_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";

const OFFSET_VARIABLE = "--right-panel-offset";
/** Gap between the docked panel and the floating buttons it pushes aside. */
const FLOATING_GAP_PX = 16;
const NEAR_BOTTOM_PX = 32;
const MAX_INPUT_HEIGHT_PX = 160;

// Space each docked panel takes on the right. The CSS variable keeps the largest one, so a panel
// that closes never resets it while another one is still docked.
const dockedOffsets = new Map<symbol, number>();

function applyDockedOffset() {
  const largest = Math.max(0, ...dockedOffsets.values());
  document.documentElement.style.setProperty(OFFSET_VARIABLE, `${largest}px`);
}

export interface AssistantPanelMessage {
  role: "user" | "assistant";
  content: string;
}

function lastAssistantIndex(messages: readonly AssistantPanelMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") return index;
  }
  return -1;
}

function isNearBottom(container: HTMLElement): boolean {
  return container.scrollHeight - container.scrollTop - container.clientHeight <= NEAR_BOTTOM_PX;
}

function scrollToBottom(container: HTMLElement, behavior: ScrollBehavior) {
  container.scrollTo({ top: container.scrollHeight, behavior });
}

/** Puts the start of a message at the top of the container, so long answers are read from the beginning. */
function scrollToMessageStart(container: HTMLElement, message: HTMLElement, behavior: ScrollBehavior) {
  const offset = message.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTo({ top: Math.max(0, container.scrollTop + offset - 8), behavior });
}

export interface AssistantPanelProps {
  title: string;
  messages: readonly AssistantPanelMessage[];
  busy: boolean;
  /** The conversation stays readable but nothing can be sent. */
  disabled?: boolean;
  disabledPlaceholder?: string;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  /** Shown while there are no messages yet. */
  emptyState?: ReactNode;
  /** Extra content under a message, e.g. the proposed changes waiting for confirmation. */
  renderMessageExtras?: (index: number) => ReactNode;
  inputRef: { current: HTMLTextAreaElement | null };
  /** Small screens only: the bottom sheet is collapsed to a slim bar. */
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onClose: () => void;
  /** Extra classes for the docked column, e.g. its margins. */
  className?: string;
  dataTour?: string;
}

/**
 * Non-modal assistant: a sticky column next to the content on large screens and a bottom sheet
 * that can be minimized on small ones, so the user can keep browsing while chatting.
 */
export function AssistantPanel({
  title,
  messages,
  busy,
  disabled = false,
  disabledPlaceholder,
  input,
  onInputChange,
  onSend,
  emptyState,
  renderMessageExtras,
  inputRef,
  minimized,
  onMinimize,
  onExpand,
  onClose,
  className,
  dataTour,
}: AssistantPanelProps) {
  const isLarge = useMediaQuery(LARGE_SCREEN_QUERY);
  const collapsed = minimized && !isLarge;
  const panelRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const latestAssistantRef = useRef<HTMLDivElement | null>(null);
  const seenCountRef = useRef<number | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [countWhenMinimized, setCountWhenMinimized] = useState(messages.length);

  const messageCount = messages.length;
  const lastRole = messageCount > 0 ? messages[messageCount - 1].role : null;
  const latestAssistant = lastAssistantIndex(messages);
  const hasNewReply = collapsed && lastRole === "assistant" && messageCount > countWhenMinimized;
  const canSend = !disabled && !busy && input.trim().length > 0;

  // The docked column has no minimized state.
  useEffect(() => {
    if (isLarge && minimized) onExpand();
  }, [isLarge, minimized, onExpand]);

  // While docked, floating buttons (assistant launcher, scroll) move left so they don't cover the panel.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!isLarge || !panel) return;

    const id = Symbol("docked-panel");
    const update = () => {
      const offset = Math.round(document.documentElement.clientWidth - panel.getBoundingClientRect().left + FLOATING_GAP_PX);
      dockedOffsets.set(id, Math.max(0, offset));
      applyDockedOffset();
    };
    update();
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(panel);
    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
      dockedOffsets.delete(id);
      applyDockedOffset();
    };
  }, [isLarge]);

  // New assistant reply: show its start. New user message: go to the bottom.
  useLayoutEffect(() => {
    if (collapsed) {
      seenCountRef.current = null;
      return;
    }
    const container = scrollRef.current;
    if (!container) return;

    const previous = seenCountRef.current;
    seenCountRef.current = messageCount;
    if (previous !== null && messageCount <= previous) return;

    const behavior: ScrollBehavior = previous === null ? "auto" : "smooth";
    const latestAssistantMessage = latestAssistantRef.current;
    if (lastRole === "assistant" && latestAssistantMessage) {
      scrollToMessageStart(container, latestAssistantMessage, behavior);
    } else {
      scrollToBottom(container, behavior);
    }
  }, [messageCount, lastRole, collapsed]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) setAtBottom(isNearBottom(container));
  }, [messages, busy, collapsed]);

  useAutosizeTextarea(inputRef, input, MAX_INPUT_HEIGHT_PX, !collapsed);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (container) setAtBottom(isNearBottom(container));
  };

  const goToEnd = () => {
    const container = scrollRef.current;
    if (container) scrollToBottom(container, "smooth");
  };

  const minimize = () => {
    setCountWhenMinimized(messageCount);
    onMinimize();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) onSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) onSend();
  };

  if (collapsed) {
    return (
      <div
        data-tour={dataTour}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:left-64 lg:hidden"
      >
        <div className="flex h-12 items-center gap-1 px-2">
          <button
            type="button"
            onClick={onExpand}
            aria-expanded={false}
            title="Abrir el asistente"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{title}</span>
            {busy ? (
              <span className="flex min-w-0 items-center gap-1 text-xs font-normal text-muted-foreground">
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                <span className="truncate">Pensando…</span>
              </span>
            ) : hasNewReply ? (
              <span className="truncate rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                Nueva respuesta
              </span>
            ) : null}
            <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar el asistente"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <aside
      ref={panelRef}
      data-tour={dataTour}
      aria-label={title}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex h-[65vh] flex-col overflow-hidden rounded-t-xl border-t bg-card shadow-2xl md:left-64 lg:sticky lg:inset-auto lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-[360px] lg:shrink-0 lg:rounded-xl lg:border lg:shadow-sm xl:w-[420px]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={minimize}
          title="Minimizar"
          aria-label="Minimizar el asistente"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
          title="Cerrar"
          aria-label="Cerrar el asistente"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="log"
          aria-label="Conversación con el asistente"
          className="h-full space-y-3 overflow-y-auto overscroll-contain p-4"
        >
          {messages.length === 0 && emptyState && (
            <div className="space-y-2 text-sm text-muted-foreground">{emptyState}</div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              ref={index === latestAssistant ? latestAssistantRef : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm text-foreground",
                message.role === "user" ? "ml-8 bg-primary/10" : "mr-2 bg-muted",
              )}
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
              {renderMessageExtras?.(index)}
            </div>
          ))}
          {busy && (
            <div className="mr-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Pensando…
            </div>
          )}
        </div>
        {!atBottom && (
          <button
            type="button"
            onClick={goToEnd}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-md hover:bg-accent"
          >
            <ArrowDown className="h-3.5 w-3.5" /> Ir al final
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-3">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? disabledPlaceholder ?? "No se pueden enviar mensajes." : "Escribe tu pregunta…"}
          aria-label="Mensaje para el asistente"
          className="min-h-[2.25rem] flex-1 resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-sm leading-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button type="submit" size="icon" className="shrink-0" disabled={!canSend} title="Enviar" aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </aside>
  );
}
