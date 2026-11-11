import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { chatErrorMessage, DATA_CHANGED_EVENT } from "../services/chatService";
import { GoogleCalendarService, type GoogleCalendarReturnPath, type GoogleCalendarState } from "../services/googleCalendarService";
import { GoogleCalendarContext, type GoogleCalendarAction } from "./googleCalendarContext";

export function GoogleCalendarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GoogleCalendarState | null>(null);
  const [action, setAction] = useState<GoogleCalendarAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [params, setParams] = useSearchParams();
  const connected = state?.connected ?? false;

  const refresh = useCallback(() => {
    setError(null);
    setReload(value => value + 1);
  }, []);

  useEffect(() => {
    const result = params.get("googleCalendar");
    if (!result) return;
    if (result === "connected") {
      setError(null);
      setNotice("Google conectado. Se prepararán también los registros pasados.");
    } else {
      setError(result === "denied"
        ? "No autorizaste la conexión con Google."
        : "No se pudo completar la conexión con Google. Vuelve a intentarlo.");
    }
    const next = new URLSearchParams(params);
    next.delete("googleCalendar");
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (action) return;
    const controller = new AbortController();
    let timer: number | undefined;
    const load = async () => {
      try {
        const data = await GoogleCalendarService.state(controller.signal);
        if (!controller.signal.aborted) {
          setState(data);
          setLoadError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setLoadError(chatErrorMessage(err, "No se pudo consultar la conexión con Google."));
      }
      if (!controller.signal.aborted)
        timer = window.setTimeout(() => void load(), connected ? 15000 : 30000);
    };
    void load();
    return () => {
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [reload, connected, action]);

  useEffect(() => {
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const perform = async (name: GoogleCalendarAction, operation: () => Promise<void>, fallback: string) => {
    setAction(name);
    setError(null);
    setNotice(null);
    try {
      await operation();
    } catch (err) {
      setError(chatErrorMessage(err, fallback));
    } finally {
      setAction(null);
    }
  };

  const connect = (returnPath: GoogleCalendarReturnPath) => perform("connect", async () => {
    const { authorizationUrl } = await GoogleCalendarService.connect(returnPath);
    const url = new URL(authorizationUrl);
    if (url.origin !== "https://accounts.google.com" || url.username || url.password)
      throw new Error("La dirección de autorización de Google no es válida.");
    window.location.assign(url.href);
  }, "No se pudo iniciar la conexión con Google.");

  const disconnect = async () => {
    if (!window.confirm("¿Desconectar Google? Los eventos y tareas ya creados se conservarán en Google, pero dejarán de actualizarse.")) return;
    await perform("disconnect", async () => {
      setState(await GoogleCalendarService.disconnect());
      setNotice("Google desconectado. Los eventos y tareas existentes se conservan.");
    }, "No se pudo desconectar Google.");
  };

  const retry = () => perform("retry", async () => {
    setState(await GoogleCalendarService.retry());
    setNotice("Sincronización solicitada. Los cambios se enviarán en unos segundos.");
  }, "No se pudo solicitar la sincronización.");

  const saveColors = (zeusColorId: number, pasanacoColorId: number) => perform("colors", async () => {
    const data = await GoogleCalendarService.updateColors(zeusColorId, pasanacoColorId);
    setState(data);
    setNotice(data.connected
      ? "Colores guardados. Se actualizarán también los eventos existentes."
      : "Colores guardados. Se usarán al conectar Google.");
  }, "No se pudieron guardar los colores de Google Calendar.");

  return (
    <GoogleCalendarContext.Provider value={{
      state, action, error: error || loadError || state?.error || null, notice,
      refresh, connect, disconnect, retry, saveColors,
    }}>
      {children}
    </GoogleCalendarContext.Provider>
  );
}
