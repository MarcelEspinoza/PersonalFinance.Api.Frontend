// src/services/loansService.ts
import apiClient from "../lib/apiClient";

export const LoansService = {
  // --- LOANS ---
  getLoans: (userId: string) => apiClient.get(`/loans/user/${userId}`),
  createLoan: (data: any) => apiClient.post("/loans", data),
  updateLoan: (id: string, data: any) => apiClient.put(`/loans/${id}`, data),
  deleteLoan: (id: string) => apiClient.delete(`/loans/${id}`),

  // --- PAYMENTS ---
  getPayments: (loanId: string) => apiClient.get(`/loans/${loanId}/payments`),
  createPayment: (loanId: string, data: any) => apiClient.post(`/loans/${loanId}/payments`, data),
};
