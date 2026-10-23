export type ReminderRepeat = "none" | "weekly" | "monthly" | "yearly";

export type ReminderStatusFilter = "active" | "done" | "all";

export type ReminderSource = "manual" | "ai";

/** Recordatorio del usuario. Las fechas son días civiles "yyyy-MM-dd". */
export interface Reminder {
  id: string;
  title: string;
  notes?: string | null;
  dueDate: string;
  amount?: number | null;
  repeat: ReminderRepeat;
  /** Días antes de la fecha en los que empieza a avisar (0 = el mismo día). */
  notifyDaysBefore: number;
  /** Si es true, además del aviso en la app se envía un correo. */
  emailEnabled: boolean;
  isDone: boolean;
  completedAt?: string | null;
  /** Mientras hoy sea anterior a esta fecha, no aparece en la campanita. */
  snoozedUntil?: string | null;
  source: ReminderSource;
  createdAt: string;
}

export interface ReminderInput {
  title: string;
  notes?: string | null;
  dueDate: string;
  amount?: number | null;
  repeat: ReminderRepeat;
  notifyDaysBefore: number;
  emailEnabled: boolean;
  source?: ReminderSource;
}

/** Recordatorios que ya tocan (para la campanita). */
export interface DueReminders {
  count: number;
  items: Reminder[];
}
