import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalChat } from "../hooks/useGlobalChat";
import { isLargeScreen } from "../hooks/useMediaQuery";
import { GlobalChatContext, GlobalChatPanelContext, type GlobalChatView } from "./globalChatContext";

const OPEN_STORAGE_KEY = "globalChat.open";

function readInitialView(): GlobalChatView {
  try {
    if (window.localStorage.getItem(OPEN_STORAGE_KEY) !== "1") return "closed";
  } catch {
    return "closed";
  }
  return isLargeScreen() ? "open" : "minimized";
}

function rememberOpen(open: boolean) {
  try {
    if (open) window.localStorage.setItem(OPEN_STORAGE_KEY, "1");
    else window.localStorage.removeItem(OPEN_STORAGE_KEY);
  } catch {
    // Private mode or full storage: the panel just won't reopen by itself.
  }
}

/**
 * One conversation with the AI assistant for every screen, plus the state of its docked panel.
 * Mounted by Layout, so it survives screen changes and is dropped on sign-out.
 */
export function GlobalChatProvider({ children }: { children: ReactNode }) {
  const chat = useGlobalChat();
  const [view, setView] = useState<GlobalChatView>(readInitialView);
  const [hiders, setHiders] = useState(0);
  const { pathname } = useLocation();
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    rememberOpen(view !== "closed");
  }, [view]);

  // On small screens the open panel covers most of the page: going to another screen tucks it into its bar.
  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    if (!isLargeScreen()) setView((current) => (current === "open" ? "minimized" : current));
  }, [pathname]);

  const openPanel = useCallback(() => setView("open"), []);
  const minimizePanel = useCallback(() => setView("minimized"), []);
  const closePanel = useCallback(() => setView("closed"), []);
  const hide = useCallback(() => {
    setHiders((count) => count + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setHiders((count) => count - 1);
    };
  }, []);

  const hidden = hiders > 0;
  const panel = useMemo(
    () => ({ view, hidden, openPanel, minimizePanel, closePanel, hide }),
    [view, hidden, openPanel, minimizePanel, closePanel, hide],
  );

  return (
    <GlobalChatContext.Provider value={chat}>
      <GlobalChatPanelContext.Provider value={panel}>{children}</GlobalChatPanelContext.Provider>
    </GlobalChatContext.Provider>
  );
}
