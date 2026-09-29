import apiClient from "../lib/apiClient";

export type SettlementLineKind = "Charge" | "Deduction" | "Payment";
export type SettlementStatus = "Draft" | "Sent" | "Closed";

export interface SettlementPerson {
  id: string;
  name: string;
  phoneNumber: string | null;
  openSettlements: number;
}

export interface SettlementLine {
  id: string;
  kind: SettlementLineKind;
  description: string;
  amount: number;
  fullAmount: number | null;
  ledgerEntryId: string | null;
  sortOrder: number;
}

export interface SettlementTotals {
  charges: number;
  deductions: number;
  payments: number;
  carriedOver: number;
  pending: number;
}

export interface SettlementSummary {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: SettlementStatus;
  pending: number;
  lineCount: number;
  sentAt: string | null;
}

export interface SettlementDetail {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  phoneNumber: string | null;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: SettlementStatus;
  closingNote: string | null;
  carriedOverAmount: number;
  sentAt: string | null;
  totals: SettlementTotals;
  lines: SettlementLine[];
  message: string;
  whatsAppUrl: string | null;
}

export interface SettlementCandidate {
  ledgerEntryId: string;
  date: string;
  description: string;
  conceptName: string;
  amount: number;
  direction: "In" | "Out";
  alreadyAdded: boolean;
}

const base = "/settlements";

export const settlementService = {
  async getPeople(): Promise<SettlementPerson[]> {
    const { data } = await apiClient.get<SettlementPerson[]>(`${base}/people`);
    return data;
  },

  async createPerson(name: string, phoneNumber: string | null): Promise<SettlementPerson> {
    const { data } = await apiClient.post<SettlementPerson>(`${base}/people`, { name, phoneNumber });
    return data;
  },

  async updatePerson(id: string, name: string, phoneNumber: string | null): Promise<SettlementPerson> {
    const { data } = await apiClient.put<SettlementPerson>(`${base}/people/${id}`, { name, phoneNumber });
    return data;
  },

  async list(): Promise<SettlementSummary[]> {
    const { data } = await apiClient.get<SettlementSummary[]>(base);
    return data;
  },

  async get(id: string): Promise<SettlementDetail> {
    const { data } = await apiClient.get<SettlementDetail>(`${base}/${id}`);
    return data;
  },

  async create(payload: {
    counterpartyId: string;
    title?: string | null;
    periodStart: string;
    periodEnd: string;
    carriedOverAmount?: number | null;
    closingNote?: string | null;
  }): Promise<SettlementDetail> {
    const { data } = await apiClient.post<SettlementDetail>(base, payload);
    return data;
  },

  async update(id: string, payload: {
    title?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    carriedOverAmount?: number | null;
    closingNote?: string | null;
  }): Promise<SettlementDetail> {
    const { data } = await apiClient.put<SettlementDetail>(`${base}/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${base}/${id}`);
  },

  async getCandidates(id: string): Promise<SettlementCandidate[]> {
    const { data } = await apiClient.get<SettlementCandidate[]>(`${base}/${id}/candidates`);
    return data;
  },

  async addLine(id: string, payload: {
    kind: SettlementLineKind;
    description: string;
    amount: number;
    fullAmount?: number | null;
    ledgerEntryId?: string | null;
  }): Promise<SettlementDetail> {
    const { data } = await apiClient.post<SettlementDetail>(`${base}/${id}/lines`, payload);
    return data;
  },

  async updateLine(id: string, lineId: string, payload: {
    kind: SettlementLineKind;
    description: string;
    amount: number;
    fullAmount?: number | null;
    ledgerEntryId?: string | null;
  }): Promise<SettlementDetail> {
    const { data } = await apiClient.put<SettlementDetail>(`${base}/${id}/lines/${lineId}`, payload);
    return data;
  },

  async deleteLine(id: string, lineId: string): Promise<SettlementDetail> {
    const { data } = await apiClient.delete<SettlementDetail>(`${base}/${id}/lines/${lineId}`);
    return data;
  },

  async addFromEntry(id: string, payload: {
    ledgerEntryId: string;
    kind?: SettlementLineKind | null;
    sharePercent?: number | null;
    amount?: number | null;
  }): Promise<SettlementDetail> {
    const { data } = await apiClient.post<SettlementDetail>(`${base}/${id}/lines/from-entry`, payload);
    return data;
  },

  /** Atajo desde el listado de movimientos: "esto es de mamá". */
  async assignEntry(payload: {
    counterpartyId: string;
    ledgerEntryId: string;
    kind?: SettlementLineKind | null;
    sharePercent?: number | null;
    amount?: number | null;
  }): Promise<SettlementDetail> {
    const { data } = await apiClient.post<SettlementDetail>(`${base}/assign-entry`, payload);
    return data;
  },

  async markSent(id: string): Promise<SettlementDetail> {
    const { data } = await apiClient.post<SettlementDetail>(`${base}/${id}/sent`);
    return data;
  },

  async reopen(id: string): Promise<SettlementDetail> {
    const { data } = await apiClient.post<SettlementDetail>(`${base}/${id}/reopen`);
    return data;
  },
};

export default settlementService;
