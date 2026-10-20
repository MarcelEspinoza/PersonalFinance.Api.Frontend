import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import type { TourDefinition } from "./tours";
import { findVisible, isTourNode, pageIsLoading } from "./tourDom";

interface TourOverlayProps {
  tour: TourDefinition;
  /** Se llama al terminar o al saltar el recorrido. */
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Layout {
  rect: Rect | null;
  vw: number;
  vh: number;
}

interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface Placement {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const MARGIN = 12;
const GAP = 14;
const PADDING = 6;
const EDGE = 4;
const CARD_MAX_WIDTH = 360;
const ESTIMATED_CARD_HEIGHT = 240;
const MOBILE_BREAKPOINT = 640;
const POLL_MS = 100;
const MIN_WAIT_MS = 350;
const MAX_WAIT_MS = 2000;
const QUIET_MS = 350;
const SHOW_SEARCHING_AFTER_MS = 500;
const SHADE = "rgba(15, 23, 42, 0.55)";
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function readViewport() {
  return {
    vw: document.documentElement.clientWidth || window.innerWidth,
    vh: window.innerHeight || document.documentElement.clientHeight,
  };
}

function measure(element: HTMLElement | null): Layout {
  const { vw, vh } = readViewport();
  if (!element) return { rect: null, vw, vh };
  const r = element.getBoundingClientRect();
  if (r.width <= 0 && r.height <= 0) return { rect: null, vw, vh };
  return { rect: { top: r.top, left: r.left, width: r.width, height: r.height }, vw, vh };
}

function sameLayout(a: Layout, b: Layout): boolean {
  if (a.vw !== b.vw || a.vh !== b.vh) return false;
  if (!a.rect || !b.rect) return a.rect === b.rect;
  return (
    Math.abs(a.rect.top - b.rect.top) < 0.5 &&
    Math.abs(a.rect.left - b.rect.left) < 0.5 &&
    Math.abs(a.rect.width - b.rect.width) < 0.5 &&
    Math.abs(a.rect.height - b.rect.height) < 0.5
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Zona iluminada: el elemento con un pequeño margen, recortada a la pantalla. */
function spotlightBox(rect: Rect | null, vw: number, vh: number): Box | null {
  if (!rect) return null;
  const top = Math.max(rect.top - PADDING, EDGE);
  const left = Math.max(rect.left - PADDING, EDGE);
  const bottom = Math.min(rect.top + rect.height + PADDING, vh - EDGE);
  const right = Math.min(rect.left + rect.width + PADDING, vw - EDGE);
  if (bottom - top < 8 || right - left < 8) return null;
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}

/** Dónde va la tarjeta: debajo, encima, a un lado o abajo del todo; nunca fuera de la pantalla. */
function placeCard(spot: Box | null, vw: number, vh: number, measuredHeight: number): Placement {
  const maxHeight = Math.max(vh - MARGIN * 2, 120);
  const height = Math.min(measuredHeight || ESTIMATED_CARD_HEIGHT, maxHeight);
  const lowestTop = Math.max(vh - MARGIN - height, MARGIN);

  if (vw < MOBILE_BREAKPOINT) {
    const width = Math.max(vw - MARGIN * 2, 200);
    const coveredAtBottom = spot !== null && spot.bottom > lowestTop - GAP / 2;
    const fitsAtTop = spot !== null && spot.top - GAP / 2 >= MARGIN + height;
    return { top: coveredAtBottom && fitsAtTop ? MARGIN : lowestTop, left: MARGIN, width, maxHeight };
  }

  const width = Math.min(CARD_MAX_WIDTH, vw - MARGIN * 2);
  if (!spot) {
    return {
      top: clamp((vh - height) / 2, MARGIN, lowestTop),
      left: clamp((vw - width) / 2, MARGIN, vw - MARGIN - width),
      width,
      maxHeight,
    };
  }

  const alignedLeft = clamp(spot.left + spot.width / 2 - width / 2, MARGIN, vw - MARGIN - width);
  const alignedTop = clamp(spot.top + spot.height / 2 - height / 2, MARGIN, lowestTop);

  if (spot.bottom + GAP + height <= vh - MARGIN) return { top: spot.bottom + GAP, left: alignedLeft, width, maxHeight };
  if (spot.top - GAP - height >= MARGIN) return { top: spot.top - GAP - height, left: alignedLeft, width, maxHeight };
  if (spot.right + GAP + width <= vw - MARGIN) return { top: alignedTop, left: spot.right + GAP, width, maxHeight };
  if (spot.left - GAP - width >= MARGIN) return { top: alignedTop, left: spot.left - GAP - width, width, maxHeight };
  return { top: lowestTop, left: alignedLeft, width, maxHeight };
}

export function TourOverlay({ tour, onClose }: TourOverlayProps) {
  const [index, setIndex] = useState(0);
  /** Paso cuyo elemento ya se buscó (mientras no coincide con `index`, seguimos buscando). */
  const [readyIndex, setReadyIndex] = useState<number | null>(null);
  const [searchingSlowly, setSearchingSlowly] = useState(false);
  const [layout, setLayout] = useState<Layout>(() => measure(null));
  const [cardHeight, setCardHeight] = useState(0);

  const layoutRef = useRef(layout);
  const directionRef = useRef<1 | -1>(1);
  const targetRef = useRef<HTMLElement | null>(null);
  const selectorRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const lastMutationRef = useRef(0);
  const onCloseRef = useRef(onClose);
  const actionsRef = useRef({ next: () => {}, prev: () => {}, skip: () => {} });

  const titleId = useId();
  const bodyId = useId();

  const steps = tour.steps;
  const step = steps[index];
  const isReady = readyIndex === index && step !== undefined;
  const isLast = index === steps.length - 1;

  const commitLayout = (next: Layout) => {
    if (sameLayout(layoutRef.current, next)) return;
    layoutRef.current = next;
    setLayout(next);
  };

  const close = () => onCloseRef.current();

  const next = () => {
    if (!isReady) return;
    if (index >= steps.length - 1) {
      close();
      return;
    }
    directionRef.current = 1;
    setIndex(index + 1);
  };

  const prev = () => {
    if (!isReady || index === 0) return;
    directionRef.current = -1;
    setIndex(index - 1);
  };

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    actionsRef.current = { next, prev, skip: close };
  });

  // Cambios en la página (datos que llegan, pestañas que se abren…): mientras haya, seguimos esperando al elemento.
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (!isTourNode(record.target)) {
          lastMutationRef.current = Date.now();
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  // Buscar el elemento de cada paso (puede tardar en aparecer si la página está cargando).
  useLayoutEffect(() => {
    const current = tour.steps[index];
    targetRef.current = null;
    selectorRef.current = null;
    setReadyIndex(null);
    setSearchingSlowly(false);
    if (!current) {
      onCloseRef.current();
      return;
    }

    let cancelled = false;
    let pollTimer: number | undefined;
    let clicked = false;
    const startedAt = Date.now();
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setSearchingSlowly(true);
    }, SHOW_SEARCHING_AFTER_MS);

    const settle = (element: HTMLElement | null, selector: string | null) => {
      window.clearTimeout(slowTimer);
      targetRef.current = element;
      selectorRef.current = selector;
      if (element) {
        try {
          element.scrollIntoView({ block: "center", inline: "nearest" });
        } catch {
          element.scrollIntoView();
        }
      }
      commitLayout(measure(element));
      setReadyIndex(index);
    };

    const skipStep = () => {
      window.clearTimeout(slowTimer);
      const following = index + directionRef.current;
      if (following >= tour.steps.length) {
        onCloseRef.current();
      } else if (following < 0) {
        directionRef.current = 1;
        setIndex(index + 1);
      } else {
        setIndex(following);
      }
    };

    const attempt = () => {
      if (cancelled) return;
      try {
        if (current.click && !clicked) {
          const clickable = findVisible(current.click);
          if (clickable) {
            clicked = true;
            clickable.click();
          }
        }
        if (!current.target) {
          settle(null, null);
          return;
        }

        let selector = current.target;
        let element = findVisible(selector);
        if (!element && current.fallbackTarget) {
          element = findVisible(current.fallbackTarget);
          if (element) selector = current.fallbackTarget;
        }
        if (element) {
          settle(element, selector);
          return;
        }

        const now = Date.now();
        const elapsed = now - startedAt;
        const pageBusy = pageIsLoading() || now - lastMutationRef.current < QUIET_MS;
        if (elapsed < MIN_WAIT_MS || (elapsed < MAX_WAIT_MS && pageBusy)) {
          pollTimer = window.setTimeout(attempt, POLL_MS);
          return;
        }

        // No apareció: si el paso es opcional se salta; si no, la tarjeta sale centrada.
        if (current.optional) skipStep();
        else settle(null, null);
      } catch (error) {
        console.error("[guía] No se pudo mostrar el paso del recorrido.", error);
        onCloseRef.current();
      }
    };

    attempt();
    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
    };
    // commitLayout solo usa refs y setState, que no cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tour]);

  // Seguir al elemento si la página se mueve (scroll, cambio de tamaño, datos que llegan…).
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      try {
        let element = targetRef.current;
        if (element && !element.isConnected) {
          element = null;
          targetRef.current = null;
        }
        if (!element && selectorRef.current) {
          element = findVisible(selectorRef.current);
          targetRef.current = element;
        }
        commitLayout(measure(element));
      } catch {
        // Un fallo midiendo no debe romper nada: lo intentamos en el siguiente fotograma.
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Medir la tarjeta para colocarla sin que se salga de la pantalla.
  useLayoutEffect(() => {
    const height = cardRef.current?.offsetHeight ?? 0;
    if (height > 0 && Math.abs(height - cardHeight) > 1) setCardHeight(height);
  });

  // Poner el foco en la tarjeta en cada paso.
  useEffect(() => {
    if (!isReady) return;
    try {
      cardRef.current?.focus({ preventScroll: true });
    } catch {
      cardRef.current?.focus();
    }
  }, [isReady, index]);

  // Al cerrar, devolver el foco a donde estaba.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      try {
        if (previous && previous.isConnected) previous.focus({ preventScroll: true });
      } catch {
        // Sin foco que devolver.
      }
    };
  }, []);

  // Teclado: Esc cierra, flechas y Enter avanzan o retroceden, Tab se queda dentro de la tarjeta.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      try {
        const actions = actionsRef.current;
        const card = cardRef.current;
        const focused = document.activeElement;
        const focusInCard = card !== null && focused instanceof Node && card.contains(focused);

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          actions.skip();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          actions.next();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          actions.prev();
        } else if (event.key === "Enter") {
          if (focusInCard && focused instanceof HTMLElement && focused.closest("button, a")) return;
          event.preventDefault();
          event.stopPropagation();
          actions.next();
        } else if (event.key === "Tab") {
          event.preventDefault();
          if (!card) return;
          const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
          if (focusables.length === 0) return;
          const position = focused instanceof HTMLElement ? focusables.indexOf(focused) : -1;
          const target = event.shiftKey
            ? focusables[position <= 0 ? focusables.length - 1 : position - 1]
            : focusables[position < 0 || position >= focusables.length - 1 ? 0 : position + 1];
          target?.focus();
        }
      } catch {
        // El teclado de la página sigue funcionando aunque falle la guía.
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const spot = isReady ? spotlightBox(layout.rect, layout.vw, layout.vh) : null;
  const placement = placeCard(spot, layout.vw, layout.vh, cardHeight);
  const progress = steps.length > 0 ? ((index + 1) / steps.length) * 100 : 100;

  return createPortal(
    <div data-tour-layer="" className="fixed inset-0 z-[9999]">
      {spot ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: `0 0 0 2px hsl(var(--primary)), 0 0 0 4px rgba(255, 255, 255, 0.6), 0 0 0 9999px ${SHADE}`,
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0" style={{ background: SHADE }} />
      )}

      {!isReady && searchingSlowly && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm text-muted-foreground shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando…
          </div>
        </div>
      )}

      {isReady && step && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          tabIndex={-1}
          className="fixed overflow-y-auto rounded-xl border bg-card text-card-foreground shadow-2xl outline-none"
          style={{ top: placement.top, left: placement.left, width: placement.width, maxHeight: placement.maxHeight }}
        >
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Paso {index + 1} de {steps.length}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar el recorrido"
                title="Cerrar el recorrido"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 id={titleId} className="text-base font-semibold leading-snug">
              {step.title}
            </h2>
            <p id={bodyId} className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
            {step.example && (
              <div className="rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed">
                <span className="font-medium">Ejemplo: </span>
                {step.example}
              </div>
            )}

            <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {isLast ? (
                <span />
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  Saltar recorrido
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                {index > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={prev}>
                    Anterior
                  </Button>
                )}
                <Button type="button" size="sm" onClick={next}>
                  {isLast ? "Terminar" : "Siguiente"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
