import apiClient from "../lib/apiClient";
import type { ChatMessage, ChatResponse, ProposedAction } from "../types/chat";

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
};

export function chatErrorMessage(error: unknown, fallback = "Ha ocurrido un error."): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ?? fallback;
}
