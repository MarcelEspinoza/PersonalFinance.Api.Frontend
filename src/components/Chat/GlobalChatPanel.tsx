import { useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { useGlobalChatPanel, useSharedGlobalChat } from "../../contexts/globalChatContext";
import { isLargeScreen } from "../../hooks/useMediaQuery";
import { AssistantPanel } from "./AssistantPanel";
import { ChatActionCards } from "./ChatActionCards";
import { GLOBAL_CHAT_EMPTY_HINT } from "./ChatThread";

/**
 * The AI assistant on every screen: a round button that opens a panel docked at the side (a bottom
 * sheet on phones). The conversation stays while you move between screens.
 */
export function GlobalChatPanel() {
  const chat = useSharedGlobalChat();
  const { view, hidden, openPanel, minimizePanel, closePanel } = useGlobalChatPanel();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const focusOnOpenRef = useRef(false);

  // Opened from the round button: ready to type. Not on phones, where the keyboard would cover the panel.
  useEffect(() => {
    if (view !== "open" || !focusOnOpenRef.current) return;
    focusOnOpenRef.current = false;
    if (isLargeScreen()) inputRef.current?.focus();
  }, [view]);

  if (hidden) return null;

  if (view === "closed") {
    return (
      <div
        className="fixed bottom-5 z-50 transition-[right] duration-300 ease-out"
        style={{ right: "calc(1.25rem + var(--right-panel-offset))" }}
      >
        <button
          type="button"
          data-tour="chat-bubble"
          onClick={() => {
            focusOnOpenRef.current = true;
            openPanel();
          }}
          aria-label="Abrir el asistente"
          title="Abrir el asistente"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <AssistantPanel
      title="Asistente"
      messages={chat.messages}
      busy={chat.busy}
      input={chat.input}
      onInputChange={chat.setInput}
      onSend={() => void chat.send(chat.input)}
      emptyState={
        <>
          <p>{GLOBAL_CHAT_EMPTY_HINT}</p>
          <p>Puedes cambiar de pantalla mientras hablamos: la conversación sigue aquí.</p>
        </>
      }
      renderMessageExtras={(index: number) => <ChatActionCards chat={chat} messageIndex={index} className="mt-3" />}
      inputRef={inputRef}
      minimized={view === "minimized"}
      onMinimize={minimizePanel}
      onExpand={openPanel}
      onClose={closePanel}
      className="lg:my-5 lg:mr-5 lg:self-start"
      dataTour="chat-bubble"
    />
  );
}
