import apiClient from "../lib/apiClient";
import type { ApiCallMethod, ChatMessage, ChatResponse, ProposedAction } from "../types/chat";

/** Window event fired after a confirmed assistant action changes data; `detail.path` is the API path that was called. */
export const DATA_CHANGED_EVENT = "pf:data-changed";

export const notifyDataChanged = (path: string) =>
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { path } }));

export interface ApiCallRequest {
  method: ApiCallMethod;
  path: string;
  body?: Record<string, unknown>;
}

/** The `api_call` proposal failed the safety checks, so nothing was sent. */
class InvalidApiCallError extends Error {}

const API_CALL_METHODS: readonly string[] = ["POST", "PUT", "PATCH", "DELETE"];
// ":" is allowed only in the query (date-time values such as 2026-03-31T10:00:00Z); "://" is still rejected below.
const API_CALL_PATH = /^\/[A-Za-z0-9\-._~/%]+(\?[A-Za-z0-9\-._~%=&:]*)?$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

// Only paths relative to the API base: an absolute or protocol-relative URL would send the session token to another site.
const isSafeApiPath = (path: string) =>
  path.startsWith("/") &&
  !path.startsWith("//") &&
  !path.includes("://") &&
  !path.includes("\\") &&
  !path.includes("..") &&
  !/%2e/i.test(path) && // browsers resolve "%2e%2e" like ".."
  !/\s/.test(path) &&
  API_CALL_PATH.test(path);

function toApiCallRequest(action: ProposedAction): ApiCallRequest {
  const { method, path, body } = action;
  if (typeof method !== "string" || !API_CALL_METHODS.includes(method)) {
    throw new InvalidApiCallError("la propuesta usa un tipo de operación no permitido.");
  }
  if (typeof path !== "string" || !isSafeApiPath(path)) {
    throw new InvalidApiCallError("la propuesta trae una ruta no válida, así que no se envió por seguridad.");
  }
  if (body != null && !isPlainObject(body)) {
    throw new InvalidApiCallError("la propuesta trae datos con un formato no válido.");
  }
  return { method, path, body: body ?? undefined };
}

/**
 * Chat global: puede leer resúmenes de todos los módulos y proponer acciones
 * (crear gasto/ingreso), pero nunca las aplica solo. La confirmación real
 * pasa por confirmExpense/confirmIncome, que el usuario dispara a mano.
 */
export const chatService = {
  ask: async (message: string, history: ChatMessage[]): Promise<ChatResponse> => {
    const { data } = await apiClient.post<ChatResponse>("/chat", { message, history });
    return data;
  },

  confirmExpense: async (action: ProposedAction): Promise<{ id: number }> => {
    const { data } = await apiClient.post<{ id: number }>("/chat/actions/expense", {
      amount: action.amount,
      description: action.description,
      date: action.date,
      categoryId: action.categoryId,
      expenseType: action.expenseType,
    });
    return data;
  },

  confirmIncome: async (action: ProposedAction): Promise<{ id: number }> => {
    const { data } = await apiClient.post<{ id: number }>("/chat/actions/income", {
      amount: action.amount,
      description: action.description,
      date: action.date,
      categoryId: action.categoryId,
      expenseType: action.expenseType,
    });
    return data;
  },

  confirmAction: async (action: ProposedAction): Promise<void> => {
    await apiClient.post("/chat/actions/confirm", action);
  },

  /**
   * Admin-only `api_call`: checks the proposal and sends it with the user's own session.
   * Unsafe proposals are rejected without sending anything.
   */
  runApiCall: async (action: ProposedAction): Promise<ApiCallRequest> => {
    const request = toApiCallRequest(action);
    await apiClient.request({
      method: request.method,
      url: request.path,
      data: request.body,
      allowAbsoluteUrls: false,
    });
    return request;
  },
};

export function chatErrorMessage(error: unknown, fallback = "Ha ocurrido un error."): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ?? fallback;
}

const collectTexts = (value: unknown): string[] => {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectTexts);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectTexts);
  return [];
};

/** Why an `api_call` failed: the safety check, the server `message`, ProblemDetails `title`/`errors` or a plain-text body. */
export function apiCallErrorMessage(error: unknown): string {
  if (error instanceof InvalidApiCallError) return error.message;
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  const data = response?.data;
  if (typeof data === "string") {
    const text = data.trim();
    // Skip HTML error pages from proxies.
    if (text && !text.startsWith("<")) return text.slice(0, 300);
  } else if (data && typeof data === "object") {
    const { message, title, errors } = data as { message?: unknown; title?: unknown; errors?: unknown };
    if (typeof message === "string" && message.trim()) return message.trim();
    const texts = [...collectTexts(title), ...collectTexts(errors)];
    if (texts.length > 0) return texts.join(" ");
  }
  return response?.status
    ? `El servidor respondió con un error (${response.status}).`
    : "No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo.";
}

export const apiCallTitle = (action: ProposedAction) => action.label?.trim() || "Acción de administrador";
