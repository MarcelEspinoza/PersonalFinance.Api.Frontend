import { createContext, useContext } from "react";
import type { GoogleCalendarReturnPath, GoogleCalendarState } from "../services/googleCalendarService";

export type GoogleCalendarAction = "connect" | "disconnect" | "retry" | "colors";

export interface GoogleCalendarContextValue {
  state: GoogleCalendarState | null;
  action: GoogleCalendarAction | null;
  error: string | null;
  notice: string | null;
  refresh: () => void;
  connect: (returnPath: GoogleCalendarReturnPath) => Promise<void>;
  disconnect: () => Promise<void>;
  retry: () => Promise<void>;
  saveColors: (zeusColorId: number, pasanacoColorId: number) => Promise<void>;
}

export const GoogleCalendarContext = createContext<GoogleCalendarContextValue | null>(null);

export function useGoogleCalendar() {
  const context = useContext(GoogleCalendarContext);
  if (!context) throw new Error("useGoogleCalendar must be used inside GoogleCalendarProvider.");
  return context;
}
