import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Info, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTour } from "./tourContext";
import { TourErrorBoundary } from "./TourErrorBoundary";
import { GENERAL_TOUR_ID } from "./tours";

interface HelpMenuProps {
  /** En pantallas pequeñas solo se ve el icono. */
  compact?: boolean;
  /** Hacia qué lado se abre el menú. */
  align?: "left" | "right";
}

/** Botón «Ayuda» con los recorridos y la guía. Si fallara, desaparece sin afectar a la app. */
export function HelpMenu(props: HelpMenuProps) {
  return (
    <TourErrorBoundary>
      <HelpMenuInner {...props} />
    </TourErrorBoundary>
  );
}

function HelpMenuInner({ compact = false, align = "right" }: HelpMenuProps) {
  const { startTour, currentScreenTour } = useTour();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [screenTour, setScreenTour] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open) setScreenTour(currentScreenTour());
    setOpen(!open);
  };

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-tour="help-button"
        onClick={toggle}
        aria-label="Ayuda"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Ayuda: recorridos y guía"
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          open && "bg-accent text-accent-foreground",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-current text-[11px] font-bold leading-none"
        >
          ?
        </span>
        <span className={compact ? "hidden sm:inline" : undefined}>Ayuda</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Ayuda"
          className={cn(
            "absolute top-full z-50 mt-2 w-64 rounded-lg border bg-card p-1 text-card-foreground shadow-lg",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          {screenTour && (
            <HelpMenuItem icon={Eye} label="Ver el recorrido de esta pantalla" onClick={() => choose(() => startTour(screenTour))} />
          )}
          <HelpMenuItem icon={Sparkles} label="Recorrido general de la app" onClick={() => choose(() => startTour(GENERAL_TOUR_ID))} />
          <HelpMenuItem icon={Info} label="Abrir la guía (Cómo usar la app)" onClick={() => choose(() => navigate("/ayuda"))} />
        </div>
      )}
    </div>
  );
}

interface HelpMenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

function HelpMenuItem({ icon: Icon, label, onClick }: HelpMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {label}
    </button>
  );
}
