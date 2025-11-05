import axios from "axios";

export const LoansService = {
  getLoans: (userId: string) => axios.get(`/api/loans?userId=${userId}`),
  getPayments: (loanId: string) => axios.get(`/api/loans/${loanId}/payments`),

  createLoan: (payload: any) => axios.post(`/api/loans`, payload),
  updateLoan: (id: string, payload: any) => axios.put(`/api/loans/${id}`, payload),
  deleteLoan: (id: string) => axios.delete(`/api/loans/${id}`),

  createPayment: (loanId: string, payload: any) =>
    axios.post(`/api/loans/${loanId}/payments`, payload)

};
