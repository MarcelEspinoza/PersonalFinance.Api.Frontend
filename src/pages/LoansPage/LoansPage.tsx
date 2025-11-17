import { Calendar, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BankLoanModal from "../../components/Loans/BankLoanModal";
import BankLoans from "../../components/Loans/BankLoans";
import PaymentModal from "../../components/Loans/PaymentModal";
import PersonalLoanModal from "../../components/Loans/PersonalLoanModal";
import PersonalLoans from "../../components/Loans/PersonalLoans";
import { useAuth } from "../../contexts/AuthContext";
import { LoansService } from "../../services/loansService";


export interface BaseLoan {
  id: string;
  type: "given" | "received" | "bank";
  name: string;
  principalAmount: number;
  outstandingAmount: number;
  startDate: string;
  dueDate?: string;
  status: "active" | "paid" | "overdue";
  categoryId: number;
}

export interface PersonalLoan extends BaseLoan {
  type: "given" | "received";
}

export interface BankLoan extends BaseLoan {
  type: "bank";
  interestRate: number;
  tae?: number;
  installmentsPaid?: number;
  installmentsRemaining?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}

type LoanUnion = PersonalLoan | BankLoan;

export default function LoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanUnion[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanUnion | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (user) loadLoans();
  }, [user]);

  useEffect(() => {
    if (selectedLoanId) loadPayments(selectedLoanId);
  }, [selectedLoanId]);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const { data } = await LoansService.getLoans(user!.id);
      setLoans(data || []);
    } catch (e) {
      console.error("Error loading loans:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (loanId: string) => {
    try {
      const { data } = await LoansService.getPayments(loanId);
      setPayments(data || []);
    } catch (e) {
      console.error("Error loading payments:", e);
    }
  };

  const personalLoans = useMemo(
    () => loans.filter((l) => l.type !== "bank") as PersonalLoan[],
    [loans]
  );
  const bankLoans = useMemo(
    () => loans.filter((l) => l.type === "bank") as BankLoan[],
    [loans]
  );
  const selectedLoan = useMemo(
    () => loans.find((l) => l.id === selectedLoanId) || null,
    [loans, selectedLoanId]
  );

  const openCreatePersonal = () => {
    setEditingLoan(null);
    setShowPersonalModal(true);
  };

  const openCreateBank = () => {
    setEditingLoan(null);
    setShowBankModal(true);
  };

  const openEditLoan = (loan: LoanUnion) => {
    setEditingLoan(loan);
    if (loan.type === "bank") setShowBankModal(true);
    else setShowPersonalModal(true);
  };

  const deleteLoan = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este préstamo?")) return;
    try {
      await LoansService.deleteLoan(id);
      if (selectedLoanId === id) {
        setSelectedLoanId(null);
        setPayments([]);
      }
      loadLoans();
    } catch (e) {
      console.error("Error deleting loan:", e);
    }
  };

  const onLoanSaved = async () => {
    setShowPersonalModal(false);
    setShowBankModal(false);
    setEditingLoan(null);
    await loadLoans();
  };

  const onPaymentSaved = async () => {
    setShowPaymentModal(false);
    await loadLoans();
    if (selectedLoanId) await loadPayments(selectedLoanId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Préstamos</h1>
        <div className="flex gap-2">
          <button
            onClick={openCreatePersonal}
            className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Personal
          </button>
          <button
            onClick={openCreateBank}
            className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Bancario
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PersonalLoans
          loans={personalLoans}
          selectedId={selectedLoanId}
          onSelect={setSelectedLoanId}
          onEdit={openEditLoan}
          onDelete={deleteLoan}
        />

        <BankLoans
          loans={bankLoans}
          selectedId={selectedLoanId}
          onSelect={setSelectedLoanId}
          onEdit={openEditLoan}
          onDelete={deleteLoan}
        />
      </div>

      {/* Historial de pagos del préstamo seleccionado */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Historial de Pagos</h2>
          {selectedLoanId && (
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
          {!selectedLoanId ? (
            <div className="p-8 text-center text-slate-500">
              Selecciona un préstamo para ver los pagos
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay pagos registrados para este préstamo
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {payments.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(p.paymentDate).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                      {p.notes && <p className="text-sm text-slate-600">{p.notes}</p>}
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      {p.amount.toFixed(2)} €
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modales */}
      {showPersonalModal && (
        <PersonalLoanModal
          userId={user!.id}
          initial={editingLoan?.type !== "bank" ? (editingLoan as PersonalLoan) : null}
          onClose={() => {
            setShowPersonalModal(false);
            setEditingLoan(null);
          }}
          onSaved={onLoanSaved}
        />
      )}

      {showBankModal && (
        <BankLoanModal
          userId={user!.id}
          initial={editingLoan?.type === "bank" ? (editingLoan as BankLoan) : null}
          onClose={() => {
            setShowBankModal(false);
            setEditingLoan(null);
          }}
          onSaved={onLoanSaved}
        />
      )}

      {showPaymentModal && selectedLoan && (
        <PaymentModal
          loan={selectedLoan}
          onClose={() => setShowPaymentModal(false)}
          onSaved={onPaymentSaved}
        />
      )}
    </div>
  );
}
