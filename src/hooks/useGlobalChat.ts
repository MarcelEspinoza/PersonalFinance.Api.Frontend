import { useRef, useState } from "react";
import { chatErrorMessage, chatService } from "../services/chatService";
import type { ChatMessage, ProposedAction } from "../types/chat";

export interface DisplayMessage extends ChatMessage {
  actions?: ProposedAction[];
  resolvedActions?: Set<number>;
}

/**
 * Lógica compartida entre la burbuja flotante y la página dedicada del
 * asistente, para no duplicar el manejo de historial/acciones propuestas.
 */
export function useGlobalChat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const history = historyRef.current;
    const userMessage: DisplayMessage = { role: "user", content: trimmed };
    setMessages((current) => [...current, userMessage]);
    historyRef.current = [...history, { role: "user", content: trimmed }];
    setInput("");
    setBusy(true);
    try {
      const result = await chatService.ask(trimmed, history);
      const assistantMessage: DisplayMessage = {
        role: "assistant",
        content: result.reply,
        actions: result.proposedActions,
        resolvedActions: new Set(),
      };
      setMessages((current) => [...current, assistantMessage]);
      historyRef.current = [...historyRef.current, { role: "assistant", content: result.reply }];
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: chatErrorMessage(err, "No he podido responder ahora mismo.") },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = async (messageIndex: number, actionIndex: number, action: ProposedAction) => {
    const key = `${messageIndex}-${actionIndex}`;
    setActionBusy(key);
    try {
      if (action.type === "create_income") {
        await chatService.confirmIncome(action);
      } else {
        await chatService.confirmExpense(action);
      }
      setMessages((current) =>
        current.map((m, i) => {
          if (i !== messageIndex) return m;
          const resolved = new Set(m.resolvedActions);
          resolved.add(actionIndex);
          return { ...m, resolvedActions: resolved };
        }),
      );
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: chatErrorMessage(err, "No se ha podido aplicar la acción.") },
      ]);
    } finally {
      setActionBusy(null);
    }
  };

  return { messages, input, setInput, busy, actionBusy, send, confirmAction };
}
