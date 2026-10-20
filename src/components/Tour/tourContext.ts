import { createContext, useContext } from "react";

export interface TourContextValue {
  /** Lanza un recorrido por su id (si hace falta, va antes a su pantalla). */
  startTour: (tourId: string) => void;
  /** Recorrido de la pantalla actual, o null si no tiene. */
  pageTourId: string | null;
  /** Recorrido que se está mostrando ahora, o null. */
  activeTourId: string | null;
  /** Recorrido de lo que se ve ahora mismo (en Configuración depende de la pestaña abierta). */
  currentScreenTour: () => string | null;
}

const noop = () => undefined;

export const TourContext = createContext<TourContextValue>({
  startTour: noop,
  pageTourId: null,
  activeTourId: null,
  currentScreenTour: () => null,
});

export function useTour(): TourContextValue {
  return useContext(TourContext);
}
