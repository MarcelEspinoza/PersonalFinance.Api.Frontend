import apiClient from '../lib/apiClient';

export const LoansService = {
  getLoans: (userId: string) => apiClient.get(`/api/loans?userId=${userId}`),
  getPayments: (loanId: string) => apiClient.get(`/api/loans/${loanId}/payments`),

  createLoan: (payload: any) => apiClient.post(`/api/loans`, payload),
  updateLoan: (id: string, payload: any) => apiClient.put(`/api/loans/${id}`, payload),
  deleteLoan: (id: string) => apiClient.delete(`/api/loans/${id}`),

  createPayment: (loanId: string, payload: any) =>
    apiClient.post(`/api/loans/${loanId}/payments`, payload)

};
