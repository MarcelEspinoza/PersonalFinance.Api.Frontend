import { createContext, useContext, useLayoutEffect } from "react";
import type { GlobalChat } from "../hooks/useGlobalChat";

export type GlobalChatView = "closed" | "open" | "minimized";

export interface GlobalChatPanelState {
  view: GlobalChatView;
  /** A screen with its own chat (the «Asistente» page, the import assistant) is hiding the global one. */
  hidden: boolean;
  openPanel: () => void;
  minimizePanel: () => void;
  closePanel: () => void;
  /** Hides the global assistant until the returned function is called. */
  hide: () => () => void;
}

// Two contexts so that typing in the chat doesn't re-render the whole layout.
export const GlobalChatContext = createContext<GlobalChat | null>(null);
export const GlobalChatPanelContext = createContext<GlobalChatPanelState | null>(null);

export function useSharedGlobalChat(): GlobalChat {
  const chat = useContext(GlobalChatContext);
  if (!chat) throw new Error("useSharedGlobalChat must be used inside GlobalChatProvider.");
  return chat;
}

export function useGlobalChatPanel(): GlobalChatPanelState {
  const panel = useContext(GlobalChatPanelContext);
  if (!panel) throw new Error("useGlobalChatPanel must be used inside GlobalChatProvider.");
  return panel;
}

/** While the calling component is on screen, the global assistant stays hidden. */
export function useHideGlobalChat() {
  const hide = useContext(GlobalChatPanelContext)?.hide;
  // Layout effect: the global panel disappears before the browser paints both chats at once.
  useLayoutEffect(() => hide?.(), [hide]);
}
