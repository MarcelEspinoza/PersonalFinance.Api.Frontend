import { useId, useState } from "react";
import { CalendarDays, Check, ExternalLink, Loader2, RefreshCw, Unplug } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { useGoogleCalendar } from "../contexts/googleCalendarContext";

const eventColors = [
  { id: 1, name: "Lavanda" },
  { id: 2, name: "Salvia" },
  { id: 3, name: "Uva" },
  { id: 4, name: "Flamenco" },
  { id: 5, name: "Amarillo" },
  { id: 6, name: "Mandarina" },
  { id: 7, name: "Turquesa" },
  { id: 8, name: "Gris" },
  { id: 9, name: "Azul" },
  { id: 10, name: "Verde" },
  { id: 11, name: "Rojo" },
];

export function GoogleCalendarAccountButton() {
  const { state, action, error, notice, refresh, connect, disconnect } = useGoogleCalendar();
  const { pathname } = useLocation();
  const returnPath = pathname === "/pasanaco" || pathname === "/reminders" || pathname === "/settings"
    ? pathname : "/zeus";
  const linked = state?.connected || state?.needsReconnect;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {error && <p role="alert" className="max-w-xl text-sm text-negative">{error}</p>}
      {notice && <p role="status" className="max-w-xl text-sm text-muted-foreground">{notice}</p>}
      {state && !state.configured && <p className="text-xs text-muted-foreground">Falta configurar Google en el servidor.</p>}
      {!state ? (
        <Button variant="outline" onClick={refresh} disabled={!!action}>Consultar Google</Button>
      ) : linked ? (
        <Button variant="outline" onClick={() => void disconnect()} disabled={!!action}>
          {action === "disconnect" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
          Desconectar Google
        </Button>
      ) : (
        <Button variant="outline" onClick={() => void connect(returnPath)} disabled={!!action || !state.configured}>
          {action === "connect" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
          Conectar Google
        </Button>
      )}
    </div>
  );
}

function GoogleCalendarColorsForm({ zeusColorId, pasanacoColorId }: { zeusColorId: number; pasanacoColorId: number }) {
  const { action, saveColors } = useGoogleCalendar();
  const [zeus, setZeus] = useState(zeusColorId);
  const [pasanaco, setPasanaco] = useState(pasanacoColorId);
  const id = useId();
  const changed = zeus !== zeusColorId || pasanaco !== pasanacoColorId;
  const selectClass = "rounded-md border bg-background px-3 py-2 text-sm";

  return (
    <form className="space-y-2 border-t pt-3" onSubmit={event => {
      event.preventDefault();
      void saveColors(zeus, pasanaco);
    }}>
      <p className="text-sm font-medium">Colores en Google Calendar</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-zeus`} className="text-xs text-muted-foreground">Zeus</label>
          <select id={`${id}-zeus`} value={zeus} onChange={event => setZeus(Number(event.target.value))} disabled={!!action} className={selectClass}>
            {eventColors.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-pasanaco`} className="text-xs text-muted-foreground">Pasanaco</label>
          <select id={`${id}-pasanaco`} value={pasanaco} onChange={event => setPasanaco(Number(event.target.value))} disabled={!!action} className={selectClass}>
            {eventColors.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
          </select>
        </div>
        <Button type="submit" variant="outline" disabled={!changed || !!action}>
          {action === "colors" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar colores
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Se aplican también a los eventos ya creados, sin duplicarlos.</p>
    </form>
  );
}

export function GoogleCalendarSyncStatus() {
  const { state, action, error, retry } = useGoogleCalendar();
  const connected = !!state?.connected && state.configured;
  const synchronized = connected && !!state?.lastSyncedAt
    && state.pendingCount === 0 && !error && !action;
  const canRetry = connected && !!error && !action;
  const waiting = (!state && !error) || (connected && (!!action || (!synchronized && !error)));
  const label = !state ? (error ? "No sincronizado" : "Consultando…")
    : !connected ? "No sincronizado"
    : synchronized ? "Sincronizado"
    : waiting ? "Sincronizando…" : "Sincronizar";

  return (
    <div className="flex justify-end">
      <Button
        variant="outline"
        onClick={() => void retry()}
        disabled={!canRetry}
        title={error || (connected ? "Google Calendar y Tasks" : "Configura Google en Configuración → Google.")}
      >
        {synchronized ? <Check className="mr-2 h-4 w-4" />
          : waiting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : canRetry ? <RefreshCw className="mr-2 h-4 w-4" />
          : <CalendarDays className="mr-2 h-4 w-4" />}
        {label}
      </Button>
    </div>
  );
}

export function GoogleCalendarSettingsPanel() {
  const { state, action, connect } = useGoogleCalendar();
  const connected = state?.connected ?? false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Horas de Zeus y entregas de pasanaco del día 5 en tu calendario principal.
          Tus recordatorios van a la lista PersonalFinance de Tasks.
          Crear, editar, completar o borrar en la app actualiza su registro en Google. Sin IA.
        </p>
        <div className="flex flex-wrap gap-2">
          <GoogleCalendarSyncStatus />
          {state?.needsReconnect && (
            <Button variant="outline" onClick={() => void connect("/settings")} disabled={!!action || !state.configured}>
              <ExternalLink className="mr-2 h-4 w-4" />Volver a conectar Google
            </Button>
          )}
        </div>
      </div>
      {state && <p className="text-xs text-muted-foreground">
        {!state.configured ? "Falta la configuración inicial de Google en el servidor."
          : state.needsReconnect ? "Google necesita una nueva autorización."
          : !connected ? "Conecta tu cuenta de Google desde el botón de la cabecera."
          : state.pendingCount > 0 ? `${state.pendingCount} registro(s) pendientes de sincronizar.`
          : state.lastSyncedAt ? `Última sincronización: ${new Date(state.lastSyncedAt).toLocaleString("es-ES")}.`
          : "Preparando la primera sincronización…"}
        {" "}Las horas de Zeus sin horario son de día completo. Tasks conserva la fecha, no una hora exacta.
        Los cambios hechos en Google no se copian a la app.
      </p>}
      {state && state.zeusColorId !== undefined && state.pasanacoColorId !== undefined && (
        <GoogleCalendarColorsForm
          key={`${state.zeusColorId}:${state.pasanacoColorId}`}
          zeusColorId={state.zeusColorId}
          pasanacoColorId={state.pasanacoColorId}
        />
      )}
    </div>
  );
}
