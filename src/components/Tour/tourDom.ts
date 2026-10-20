/** Atributo que marca la capa del recorrido, para no confundir sus elementos con los de la página. */
export const TOUR_LAYER_ATTR = "data-tour-layer";

function isInsideTourLayer(element: Element): boolean {
  return element.closest(`[${TOUR_LAYER_ATTR}]`) !== null;
}

function hasSize(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** Primer elemento visible (con tamaño y sin `visibility: hidden`) que cumple el selector. */
export function findVisible(selector: string): HTMLElement | null {
  let nodes: Element[];
  try {
    nodes = Array.from(document.querySelectorAll(selector));
  } catch {
    return null;
  }

  for (const node of nodes) {
    if (!(node instanceof HTMLElement) || isInsideTourLayer(node) || !hasSize(node)) continue;
    if (window.getComputedStyle(node).visibility === "hidden") continue;
    return node;
  }
  return null;
}

/** ¿Hay algún indicador de carga (`animate-spin`) visible en la página? */
export function pageIsLoading(): boolean {
  for (const node of Array.from(document.querySelectorAll(".animate-spin"))) {
    if (!isInsideTourLayer(node) && hasSize(node)) return true;
  }
  return false;
}

/** ¿Hay un diálogo de la app abierto? (No lanzamos recorridos automáticos encima). */
export function hasOpenDialog(): boolean {
  for (const node of Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]'))) {
    if (!isInsideTourLayer(node)) return true;
  }
  return false;
}

/** Comprueba si un nodo pertenece a la capa del recorrido. */
export function isTourNode(node: Node | null): boolean {
  if (!node) return false;
  const element = node instanceof Element ? node : node.parentElement;
  return element ? isInsideTourLayer(element) : false;
}
