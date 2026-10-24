import { useEffect, useState } from "react";

/** Screens where assistant panels dock next to the content instead of opening as a bottom sheet. */
export const LARGE_SCREEN_QUERY = "(min-width: 1024px)";

export function isLargeScreen(): boolean {
  return window.matchMedia(LARGE_SCREEN_QUERY).matches;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}
