import apiClient from "../lib/apiClient";


export interface CreateTransferDto {
  date: string;
  amount: number;
  fromBankId: string;
  toBankId: string;
  description?: string;
  notes?: string;
  reference?: string;
  categoryId?: number | null;
}

const createTransfer = async (dto: CreateTransferDto) => {
  const res = await apiClient.post("/transfers", {
    date: dto.date,
    amount: dto.amount,
    fromBankId: dto.fromBankId,
    toBankId: dto.toBankId,
    description: dto.description ?? "",
    notes: dto.notes ?? null,
    reference: dto.reference ?? null,
    categoryId: dto.categoryId ?? undefined
  });
  return res.data;
};

const getByTransferId = async (transferId: string) => {
  const res = await apiClient.get(`/transfers/${encodeURIComponent(transferId)}`);
  return res.data;
};

export default {
  createTransfer,
  getByTransferId
};