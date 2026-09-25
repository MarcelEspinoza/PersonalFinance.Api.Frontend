import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useGlobalChat } from "../../hooks/useGlobalChat";
import { ChatThread } from "./ChatThread";

/**
 * Widget flotante visible en toda la app (montado una vez en Layout). Usa el
 * mismo hook que la página dedicada del asistente, así que ambos comparten
 * historial de acciones propuestas dentro de la misma sesión de navegador
 * sólo si se monta el mismo componente; aquí cada uno mantiene su propio hilo
 * por simplicidad (abrir la burbuja no continúa la conversación de la página).
 */
export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const chat = useGlobalChat();

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Asistente</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatThread chat={chat} />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
