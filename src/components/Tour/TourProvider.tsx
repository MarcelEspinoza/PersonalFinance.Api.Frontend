import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { TourContext, type TourContextValue } from "./tourContext";
import { TourErrorBoundary } from "./TourErrorBoundary";
import { TourOverlay } from "./TourOverlay";
import { hasOpenDialog } from "./tourDom";
import { GENERAL_TOUR_ID, getTour, isTourDone, markTourDone, normalizePath, pageTourFor, screenTourFor } from "./tours";

interface ActiveTour {
  tourId: string;
  /** Pantalla (ruta normalizada) en la que se muestra el recorrido. */
  path: string;
  /** Cambia en cada arranque para empezar siempre desde el paso 1. */
  session: number;
}

/** Espera antes de lanzar un recorrido automático, para que la pantalla termine de cargar. */
const AUTO_START_DELAY_MS = 1200;

export function TourProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = normalizePath(location.pathname);

  const [active, setActive] = useState<ActiveTour | null>(null);
  const activeRef = useRef<ActiveTour | null>(null);
  const sessionRef = useRef(0);
  /** Última pantalla en la que ya se decidió si lanzar un recorrido automático. */
  const autoHandledForRef = useRef<string | null>(null);

  const changeActive = useCallback((next: ActiveTour | null) => {
    activeRef.current = next;
    setActive(next);
  }, []);

  const begin = useCallback(
    (tourId: string, tourPath: string) => {
      sessionRef.current += 1;
      changeActive({ tourId, path: tourPath, session: sessionRef.current });
    },
    [changeActive],
  );

  const startTour = useCallback(
    (tourId: string) => {
      const tour = getTour(tourId);
      if (!tour) return;
      const tourPath = tour.route ? normalizePath(tour.route) : path;
      autoHandledForRef.current = tourPath;
      if (tour.route && tourPath !== path) navigate(tour.route);
      begin(tourId, tourPath);
    },
    [begin, navigate, path],
  );

  /** Al terminar o saltar el recorrido, se recuerda para no volver a lanzarlo solo. */
  const closeTour = useCallback(() => {
    const current = activeRef.current;
    if (current) markTourDone(current.tourId);
    changeActive(null);
  }, [changeActive]);

  // Si cambias de pantalla en mitad de un recorrido, se cierra (sin marcarlo como visto).
  useEffect(() => {
    const current = activeRef.current;
    if (current && current.path !== path) {
      autoHandledForRef.current = path;
      changeActive(null);
    }
  }, [path, changeActive]);

  // Recorridos automáticos: el general la primera vez que usas la app, y el de cada pantalla la primera vez que entras.
  useEffect(() => {
    if (loading || !user || active) return;
    if (autoHandledForRef.current === path) return;

    const timer = window.setTimeout(() => {
      try {
        autoHandledForRef.current = path;
        if (activeRef.current || hasOpenDialog()) return;

        let candidate: string | null = null;
        if (!isTourDone(GENERAL_TOUR_ID)) {
          candidate = GENERAL_TOUR_ID;
        } else {
          const pageTour = pageTourFor(path);
          if (pageTour && !isTourDone(pageTour)) candidate = pageTour;
        }
        if (candidate) begin(candidate, path);
      } catch (error) {
        console.error("[guía] No se pudo lanzar el recorrido automático.", error);
      }
    }, AUTO_START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [active, begin, loading, path, user]);

  const currentScreenTour = useCallback(() => {
    try {
      return screenTourFor(path);
    } catch {
      return null;
    }
  }, [path]);

  const value = useMemo<TourContextValue>(
    () => ({
      startTour,
      pageTourId: pageTourFor(path),
      activeTourId: active ? active.tourId : null,
      currentScreenTour,
    }),
    [active, currentScreenTour, path, startTour],
  );

  const tour = active ? getTour(active.tourId) : undefined;

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && tour && active.path === path && (
        <TourErrorBoundary key={active.session} onError={closeTour}>
          <TourOverlay tour={tour} onClose={closeTour} />
        </TourErrorBoundary>
      )}
    </TourContext.Provider>
  );
}
