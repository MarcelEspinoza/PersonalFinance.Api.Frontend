import { useLayoutEffect } from "react";

/**
 * Grows a textarea with its content up to `maxHeight` pixels; past that it scrolls.
 * `visible` re-measures it when it appears again (e.g. after expanding a minimized panel).
 */
export function useAutosizeTextarea(
  ref: { current: HTMLTextAreaElement | null },
  value: string,
  maxHeight: number,
  visible = true,
) {
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const borders = textarea.offsetHeight - textarea.clientHeight;
    const height = Math.min(textarea.scrollHeight + borders, maxHeight);
    textarea.style.height = `${height}px`;
    textarea.style.overflowY = textarea.scrollHeight + borders > maxHeight ? "auto" : "hidden";
  }, [ref, value, maxHeight, visible]);
}
