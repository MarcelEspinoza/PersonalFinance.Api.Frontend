import apiClient from "../lib/apiClient";

export interface GoogleCalendarState {
  configured: boolean;
  connected: boolean;
  needsReconnect: boolean;
  pendingCount: number;
  lastSyncedAt?: string | null;
  error?: string | null;
  timeZone: string;
}

const endpoint = "/calendar/google";

export const GoogleCalendarService = {
  state: async (signal?: AbortSignal) =>
    (await apiClient.get<GoogleCalendarState>(endpoint, { signal })).data,
  connect: async (returnPath: "/zeus" | "/pasanaco" | "/reminders") =>
    (await apiClient.post<{ authorizationUrl: string }>(`${endpoint}/connect`, { returnPath })).data,
  retry: async () => (await apiClient.post<GoogleCalendarState>(`${endpoint}/retry`)).data,
  disconnect: async () => (await apiClient.delete<GoogleCalendarState>(endpoint)).data,
};
