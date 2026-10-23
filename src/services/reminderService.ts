import apiClient from "../lib/apiClient";
import type { DueReminders, Reminder, ReminderInput, ReminderStatusFilter } from "../types/reminder";

/** Evento de window que avisa de que los recordatorios cambiaron (refresca la campanita). */
export const REMINDERS_CHANGED_EVENT = "reminders:changed";

export const notifyRemindersChanged = () => window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT));

export const ReminderService = {
  list: async (status: ReminderStatusFilter = "active"): Promise<Reminder[]> => {
    const { data } = await apiClient.get<Reminder[]>("/reminders", { params: { status } });
    return data;
  },

  due: async (): Promise<DueReminders> => {
    const { data } = await apiClient.get<DueReminders>("/reminders/due");
    return data;
  },

  create: async (input: ReminderInput): Promise<Reminder> => {
    const { data } = await apiClient.post<Reminder>("/reminders", input);
    notifyRemindersChanged();
    return data;
  },

  update: async (id: string, input: ReminderInput): Promise<Reminder> => {
    const { data } = await apiClient.put<Reminder>(`/reminders/${id}`, input);
    notifyRemindersChanged();
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/reminders/${id}`);
    notifyRemindersChanged();
  },

  /** Único: lo marca como hecho. Repetido: lo pasa a la siguiente fecha. */
  complete: async (id: string): Promise<Reminder> => {
    const { data } = await apiClient.post<Reminder>(`/reminders/${id}/complete`);
    notifyRemindersChanged();
    return data;
  },

  /** Lo oculta de la campanita durante unos días sin cambiar su fecha. */
  snooze: async (id: string, days: number): Promise<Reminder> => {
    const { data } = await apiClient.post<Reminder>(`/reminders/${id}/snooze`, { days });
    notifyRemindersChanged();
    return data;
  },
};
