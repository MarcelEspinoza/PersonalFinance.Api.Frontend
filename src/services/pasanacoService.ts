// src/services/pasanacoService.ts
import apiClient from "../lib/apiClient";

export interface Pasanaco {
  id: string;
  name: string;
  monthly_amount: number;
  total_participants: number;
  current_round: number;
  is_active: boolean;
}

export interface Participant {
  id: string;
  pasanaco_id: string;
  name: string;
  position: number;
  has_received: boolean;
  received_date?: string;
}

export const pasanacoService = {
  getAll: () => apiClient.get<Pasanaco[]>("/pasanacos"),
  getParticipants: (id: string) =>
    apiClient.get<Participant[]>(`/pasanacos/${id}/participants`),
  create: (data: Partial<Pasanaco>) => apiClient.post("/pasanacos", data),
  update: (id: string, data: Partial<Pasanaco>) =>
    apiClient.put(`/pasanacos/${id}`, data),
  remove: (id: string) => apiClient.delete(`/pasanacos/${id}`),

  addParticipant: (id: string, data: Partial<Participant>) =>
    apiClient.post(`/pasanacos/${id}/participants`, data),
  deleteParticipant: (id: string, participantId: string) =>
    apiClient.delete(`/pasanacos/${id}/participants/${participantId}`),
};
