import apiClient from '../lib/apiClient';

export const LoansService = {
  getLoans: (userId: string) => apiClient.get('/loans', { params: { userId } }),
  getPayments: (loanId: string) => apiClient.get(`/loans/${loanId}/payments`),

  createLoan: (payload: any) => apiClient.post('/loans', payload),
  updateLoan: (id: string, payload: any) => apiClient.put(`/loans/${id}`, payload),
  deleteLoan: (id: string) => apiClient.delete(`/loans/${id}`),

  createPayment: (loanId: string, payload: any) =>
    apiClient.post(`/loans/${loanId}/payments`, payload)
};