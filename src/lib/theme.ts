import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const THEME_CHANGED_EVENT = "theme-changed";

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "system" ? stored : "light";
}

function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && prefersDark().matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function setThemePreference(preference: ThemePreference) {
  localStorage.setItem(STORAGE_KEY, preference);
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
}

export function initTheme() {
  applyTheme(getThemePreference());
  prefersDark().addEventListener("change", () => {
    if (getThemePreference() === "system") applyTheme("system");
  });
}

export function useThemePreference() {
  const [preference, setPreference] = useState(getThemePreference);

  useEffect(() => {
    const sync = () => setPreference(getThemePreference());
    window.addEventListener(THEME_CHANGED_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, sync);
  }, []);

  return [preference, setThemePreference] as const;
}
