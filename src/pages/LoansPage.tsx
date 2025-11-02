import { Calendar, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoansService } from '../services/loansService';

interface Loan {
  id: string;
  type: string;
  name: string;
  principal_amount: number;
  outstanding_amount: number;
  interest_rate: number;
  start_date: string;
  due_date?: string;
  status: string;
}

interface LoanPayment {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
}

export function LoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loanForm, setLoanForm] = useState({
    type: 'given',
    name: '',
    principal_amount: '',
    outstanding_amount: '',
    interest_rate: '0',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'active',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadLoans();
    }
  }, [user]);

  useEffect(() => {
    if (selectedLoan) {
      loadPayments(selectedLoan);
    }
  }, [selectedLoan]);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const { data } = await LoansService.getLoans(user!.id);
      setLoans(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading loans:', error);
      setLoading(false);
    }
  };

  const loadPayments = async (loanId: string) => {
    try {
      const { data } = await LoansService.getPayments(loanId);
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        user_id: user!.id,
        type: loanForm.type,
        name: loanForm.name,
        principal_amount: parseFloat(loanForm.principal_amount),
        outstanding_amount: parseFloat(loanForm.outstanding_amount),
        interest_rate: parseFloat(loanForm.interest_rate),
        start_date: loanForm.start_date,
        due_date: loanForm.due_date || null,
        status: loanForm.status,
      };

      if (editingId) {
        await LoansService.updateLoan(editingId, data);
      } else {
        await LoansService.createLoan(data);
      }
      

      setShowLoanModal(false);
      setEditingId(null);
      resetLoanForm();
      loadLoans();
    } catch (error) {
      console.error('Error saving loan:', error);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await LoansService.createPayment(selectedLoan!, {
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes || null,
      });
      
      // Actualizar el préstamo
      const loan = loans.find(l => l.id === selectedLoan);
      if (loan) {
        const newOutstanding = loan.outstanding_amount - parseFloat(paymentForm.amount);
        const newStatus = newOutstanding <= 0 ? 'paid' : 'active';
      
        await LoansService.updateLoan(selectedLoan!, {
          outstanding_amount: Math.max(0, newOutstanding),
          status: newStatus,
        });
      }

      setShowPaymentModal(false);
      resetPaymentForm();
      loadLoans();
      if (selectedLoan) {
        loadPayments(selectedLoan);
      }
    } catch (error) {
      console.error('Error saving payment:', error);
    }
  };

  const handleEditLoan = (loan: Loan) => {
    setEditingId(loan.id);
    setLoanForm({
      type: loan.type,
      name: loan.name,
      principal_amount: loan.principal_amount.toString(),
      outstanding_amount: loan.outstanding_amount.toString(),
      interest_rate: loan.interest_rate.toString(),
      start_date: loan.start_date,
      due_date: loan.due_date || '',
      status: loan.status,
    });
    setShowLoanModal(true);
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este préstamo?')) return;

    try {
      await LoansService.deleteLoan(id);
      loadLoans();
      if (selectedLoan === id) {
        setSelectedLoan(null);
        setPayments([]);
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
    }
  };

  const resetLoanForm = () => {
    setLoanForm({
      type: 'given',
      name: '',
      principal_amount: '',
      outstanding_amount: '',
      interest_rate: '0',
      start_date: new Date().toISOString().split('T')[0],
      due_date: '',
      status: 'active',
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const getLoanTypeLabel = (type: string) => {
    switch (type) {
      case 'given': return 'Prestado';
      case 'received': return 'Recibido';
      case 'bank': return 'Bancario';
      default: return type;
    }
  };

  const getLoanTypeColor = (type: string) => {
    switch (type) {
      case 'given': return 'bg-blue-100 text-blue-700';
      case 'received': return 'bg-orange-100 text-orange-700';
      case 'bank': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Préstamos</h1>
        <button
          onClick={() => {
            resetLoanForm();
            setEditingId(null);
            setShowLoanModal(true);
          }}
          className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Préstamo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Lista de Préstamos</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-200">
            {loans.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay préstamos registrados
              </div>
            ) : (
              loans.map((loan) => (
                <div
                  key={loan.id}
                  className={`p-4 cursor-pointer transition ${
                    selectedLoan === loan.id ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedLoan(loan.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getLoanTypeColor(loan.type)}`}>
                          {getLoanTypeLabel(loan.type)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          loan.status === 'paid' ? 'bg-green-100 text-green-700' :
                          loan.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {loan.status === 'paid' ? 'Pagado' : loan.status === 'overdue' ? 'Vencido' : 'Activo'}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800">{loan.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                        <span>Principal: {loan.principal_amount.toFixed(2)} €</span>
                        <span>•</span>
                        <span>Pendiente: {loan.outstanding_amount.toFixed(2)} €</span>
                      </div>
                      {loan.interest_rate > 0 && (
                        <p className="text-sm text-slate-500 mt-1">
                          Interés: {loan.interest_rate}%
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLoan(loan);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLoan(loan.id);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Historial de Pagos</h2>
            {selectedLoan && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Pago
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {!selectedLoan ? (
              <div className="p-8 text-center text-slate-500">
                Selecciona un préstamo para ver los pagos
              </div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay pagos registrados para este préstamo
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(payment.payment_date).toLocaleDateString('es-ES')}</span>
                        </div>
                        {payment.notes && (
                          <p className="text-sm text-slate-600">{payment.notes}</p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        {payment.amount.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showLoanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingId ? 'Editar' : 'Nuevo'} Préstamo
              </h2>
              <button
                onClick={() => {
                  setShowLoanModal(false);
                  setEditingId(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleLoanSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de préstamo
                </label>
                <select
                  value={loanForm.type}
                  onChange={(e) => setLoanForm({ ...loanForm, type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="given">Prestado (yo presté dinero)</option>
                  <option value="received">Recibido (me prestaron dinero)</option>
                  <option value="bank">Bancario</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre / Entidad
                </label>
                <input
                  type="text"
                  value={loanForm.name}
                  onChange={(e) => setLoanForm({ ...loanForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monto principal
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loanForm.principal_amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLoanForm({
                      ...loanForm,
                      principal_amount: value,
                      outstanding_amount: editingId ? loanForm.outstanding_amount : value,
                    });
                  }}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monto pendiente
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loanForm.outstanding_amount}
                  onChange={(e) => setLoanForm({ ...loanForm, outstanding_amount: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tasa de interés (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loanForm.interest_rate}
                  onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={loanForm.start_date}
                  onChange={(e) => setLoanForm({ ...loanForm, start_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fecha de vencimiento (opcional)
                </label>
                <input
                  type="date"
                  value={loanForm.due_date}
                  onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estado
                </label>
                <select
                  value={loanForm.status}
                  onChange={(e) => setLoanForm({ ...loanForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="active">Activo</option>
                  <option value="paid">Pagado</option>
                  <option value="overdue">Vencido</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoanModal(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
                >
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Registrar Pago</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monto del pago
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fecha del pago
                </label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                >
                  Guardar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
