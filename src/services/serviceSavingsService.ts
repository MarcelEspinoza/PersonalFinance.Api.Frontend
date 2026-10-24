import apiClient from "../lib/apiClient";

/** cheaper = same service for less, cancel = could be dropped, switch = better alternative. */
export type ServiceSavingAction = "cheaper" | "cancel" | "switch";

export type ServiceReviewStatus = "running" | "done" | "failed";

export interface ServiceSavingSource {
  title: string;
  url: string;
}

// The API omits null fields, so optional values may be missing or null.
export interface ServiceSavingItem {
  key: string;
  service: string;
  provider?: string | null;
  category?: string | null;
  action: ServiceSavingAction;
  currentMonthly?: number | null;
  proposal?: string | null;
  proposalMonthly?: number | null;
  monthlySaving?: number | null;
  detail?: string | null;
  caution?: string | null;
  sources?: ServiceSavingSource[];
}

export interface ServiceReview {
  id: string;
  status: ServiceReviewStatus;
  startedAt: string;
  completedAt?: string | null;
  summary?: string | null;
  items?: ServiceSavingItem[];
  searchCount?: number;
  error?: string | null;
}

export interface ServiceNote {
  serviceKey: string;
  serviceName: string;
  message?: string | null;
  dismissed: boolean;
  updatedAt: string;
}

export interface ServiceSavingsState {
  /** Latest review; missing when the user never searched. */
  review?: ServiceReview | null;
  notes?: ServiceNote[];
  remainingToday: number;
  dailyLimit: number;
}

export interface SaveServiceNotePayload {
  serviceKey: string;
  serviceName: string;
  message?: string | null;
  dismissed: boolean;
}

export const getState = async (): Promise<ServiceSavingsState> =>
  (await apiClient.get<ServiceSavingsState>("/dashboard/services")).data;

/** Starts a review in the background. Fails with HTTP 429 (and a message) when the daily limit is reached. */
export const analyze = async (): Promise<ServiceSavingsState> =>
  (await apiClient.post<ServiceSavingsState>("/dashboard/services/analyze")).data;

/** Saves a comment and/or the hidden flag; an empty comment that is not hidden deletes the note. */
export const saveNote = async (payload: SaveServiceNotePayload): Promise<ServiceNote[]> =>
  (await apiClient.put<ServiceNote[]>("/dashboard/services/notes", payload)).data;

/** The backend's `{ message }` when there is one, otherwise the fallback. */
export const serviceSavingsError = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
