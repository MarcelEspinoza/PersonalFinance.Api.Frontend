import { useRef, useState } from "react";
import {
  apiCallErrorMessage,
  apiCallTitle,
  chatErrorMessage,
  chatService,
  notifyDataChanged,
} from "../services/chatService";
import { notifyRemindersChanged } from "../services/reminderService";
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
  // In-flight api_call keys, kept apart from actionBusy so finishing another action can't re-enable their button.
  const [apiCallsRunning, setApiCallsRunning] = useState<string[]>([]);
  const historyRef = useRef<ChatMessage[]>([]);
  // api_call keys that are running or already done, so a double click never sends them twice.
  const apiCallKeysRef = useRef(new Set<string>());

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

  const markResolved = (messageIndex: number, actionIndex: number) =>
    setMessages((current) =>
      current.map((m, i) => {
        if (i !== messageIndex) return m;
        const resolved = new Set(m.resolvedActions);
        resolved.add(actionIndex);
        return { ...m, resolvedActions: resolved };
      }),
    );

  /** Shows an assistant note and adds it to the history, so the AI knows the outcome on the next turn. */
  const addAssistantNote = (content: string) => {
    setMessages((current) => [...current, { role: "assistant", content }]);
    historyRef.current = [...historyRef.current, { role: "assistant", content }];
  };

  const runApiCall = async (messageIndex: number, actionIndex: number, action: ProposedAction) => {
    const key = `${messageIndex}-${actionIndex}`;
    if (apiCallKeysRef.current.has(key)) return;
    apiCallKeysRef.current.add(key);
    setApiCallsRunning((current) => [...current, key]);
    try {
      const { path } = await chatService.runApiCall(action);
      markResolved(messageIndex, actionIndex);
      const target = action.targetName?.trim();
      addAssistantNote(`Hecho: ${apiCallTitle(action)}${target ? ` «${target}»` : ""}.`);
      notifyRemindersChanged();
      notifyDataChanged(path);
    } catch (err) {
      apiCallKeysRef.current.delete(key);
      addAssistantNote(`No se pudo hacer: ${apiCallErrorMessage(err)}`);
    } finally {
      setApiCallsRunning((current) => current.filter((running) => running !== key));
    }
  };

  const confirmAction = async (messageIndex: number, actionIndex: number, action: ProposedAction) => {
    // Admin API calls never go through /chat/actions/confirm: the browser checks and sends them itself.
    if (action.type === "api_call") {
      await runApiCall(messageIndex, actionIndex, action);
      return;
    }
    const key = `${messageIndex}-${actionIndex}`;
    setActionBusy(key);
    try {
      await chatService.confirmAction(action);
      markResolved(messageIndex, actionIndex);
      // The backend applied it. Reminders with an amount also count in the forecast,
      // so a reminder change refreshes both the bell and the page on screen.
      if (action.type.endsWith("_reminder")) notifyRemindersChanged();
      notifyDataChanged("/chat/actions/confirm");
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: chatErrorMessage(err, "No se ha podido aplicar la acción.") },
      ]);
    } finally {
      setActionBusy(null);
    }
  };

  return { messages, input, setInput, busy, actionBusy, apiCallsRunning, send, confirmAction };
}
