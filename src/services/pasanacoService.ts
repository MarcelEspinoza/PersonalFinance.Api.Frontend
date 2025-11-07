import apiClient from "../lib/apiClient";

export interface Pasanaco {
  id: string;
  name: string;
  monthlyAmount: number;
  totalParticipants: number;
  currentRound: number;
  startMonth: number; // 1–12
  startYear: number;
  userId?: string;
}

export interface Participant {
  id: string;
  name: string;
  assignedNumber: number; // número del sorteo
  hasReceived: boolean;
}

export interface PasanacoPayment {
  id: string;
  pasanacoId: string;
  participantId: string;
  month: number;
  year: number;
  paid: boolean;
  paymentDate?: string | null;
  transactionId?: number | null;
  paidByLoanId?: string | null;
}

// Servicio para consumir el backend (devuelve axios response objects)
export const pasanacoService = {
  // Pasanacos
  getAll: () => apiClient.get<Pasanaco[]>("/pasanacos"),
  getById: (id: string) => apiClient.get<Pasanaco>(`/pasanacos/${id}`),
  create: (data: Partial<Pasanaco>) => apiClient.post("/pasanacos", data),
  update: (id: string, data: Partial<Pasanaco>) =>
    apiClient.put(`/pasanacos/${id}`, data),
  remove: (id: string) => apiClient.delete(`/pasanacos/${id}`),

  // Participantes
  getParticipants: (id: string) =>
    apiClient.get<Participant[]>(`/pasanacos/${id}/participants`),
  addParticipant: (id: string, data: { name: string; assignedNumber: number }) =>
    apiClient.post(`/pasanacos/${id}/participants`, data),
  deleteParticipant: (id: string, participantId: string) =>
    apiClient.delete(`/pasanacos/${id}/participants/${participantId}`),

  // Pagos
  getPayments: (id: string, month: number, year: number) =>
    apiClient.get<PasanacoPayment[]>(`/pasanacos/${id}/payments`, {
      params: { month, year },
    }),

  markPaymentAsPaid: (paymentId: string, transactionId?: number) =>
    apiClient.post(`/pasanacos/payments/${paymentId}/mark-paid`, { transactionId }),

  // Avanzar / retroceder ronda (createLoans pasa como query param)
  advance: (id: string, createLoans = false) =>
    apiClient.post(`/pasanacos/${id}/advance`, null, { params: { createLoans } }),
  retreat: (id: string) => apiClient.post(`/pasanacos/${id}/retreat`),

  // Crear préstamo manual para un participante
  createLoanForParticipant: (pasanacoId: string, participantId: string, data: { amount: number; note?: string }) =>
    apiClient.post(`/pasanacos/${pasanacoId}/participants/${participantId}/loan`, data),
};

export default pasanacoService;