import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, Loader2, RefreshCw, Unplug } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { chatErrorMessage } from "../services/chatService";
import { GoogleCalendarService, type GoogleCalendarState } from "../services/googleCalendarService";

export function GoogleCalendarConnection({ returnPath }: { returnPath: "/zeus" | "/pasanaco" | "/reminders" }) {
  const [state, setState] = useState<GoogleCalendarState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [params, setParams] = useSearchParams();
  const connected = state?.connected ?? false;

  useEffect(() => {
    const result = params.get("googleCalendar");
    if (!result) return;
    if (result === "connected") setNotice("Google conectado. Se prepararán también los registros pasados.");
    else if (result === "denied") setError("No autorizaste la conexión con Google.");
    else setError("No se pudo completar la conexión con Google. Vuelve a intentarlo.");
    const next = new URLSearchParams(params);
    next.delete("googleCalendar");
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    const controller = new AbortController();
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
    };
    void load();
    const timer = connected ? window.setInterval(() => void load(), 15000) : undefined;
    return () => {
      controller.abort();
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [reload, connected]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const { authorizationUrl } = await GoogleCalendarService.connect(returnPath);
      const url = new URL(authorizationUrl);
      if (url.origin !== "https://accounts.google.com")
        throw new Error("La dirección de autorización de Google no es válida.");
      window.location.assign(url.href);
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo iniciar la conexión con Google."));
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    setError(null);
    try {
      setState(await GoogleCalendarService.retry());
      setNotice("Sincronización solicitada. Los cambios se enviarán en unos segundos.");
      setReload(value => value + 1);
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo solicitar la sincronización."));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("¿Desconectar Google? Los eventos y tareas ya creados se conservarán en Google, pero dejarán de actualizarse.")) return;
    setBusy(true);
    setError(null);
    try {
      setState(await GoogleCalendarService.disconnect());
      setNotice("Google desconectado. Los eventos y tareas existentes se conservan.");
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo desconectar Google."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" />Google Calendar y Tasks</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Horas de Zeus y entregas de pasanaco del día 5 en tu calendario principal.
            Tus recordatorios van a la lista PersonalFinance de Tasks.
            Crear, editar, completar o borrar aquí actualiza su registro en Google. Sin IA.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!state ? (
            <Button variant="outline" onClick={() => setReload(value => value + 1)} disabled={busy}>Consultar conexión</Button>
          ) : !connected ? (
            <Button variant="outline" onClick={() => void connect()} disabled={!state.configured || busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              {state.needsReconnect ? "Volver a conectar Google" : "Conectar Google"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void retry()} disabled={busy || !state.configured}>
              <RefreshCw className="mr-2 h-4 w-4" />Sincronizar
            </Button>
          )}
          {(connected || state?.needsReconnect) && (
            <Button variant="outline" onClick={() => void disconnect()} disabled={busy}>
              <Unplug className="mr-2 h-4 w-4" />Desconectar
            </Button>
          )}
        </div>
      </div>
      {state && <p className="text-xs text-muted-foreground">
        {!state.configured ? "Falta la configuración inicial de Google en el servidor."
          : state.needsReconnect ? "Google necesita una nueva autorización."
          : !connected ? "Todavía no has conectado tu cuenta de Google."
          : state.pendingCount > 0 ? `${state.pendingCount} registro(s) pendientes de sincronizar.`
          : state.lastSyncedAt ? `Última sincronización: ${new Date(state.lastSyncedAt).toLocaleString("es-ES")}.`
          : "Preparando la primera sincronización…"}
        {" "}Las horas de Zeus sin horario son de día completo. Tasks conserva la fecha, no una hora exacta.
        Los cambios hechos en Google no se copian a la app.
      </p>}
      {(error || loadError || state?.error) && <p role="alert" className="text-sm text-negative">{error || loadError || state?.error}</p>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    </Card>
  );
}
