import { Calendar, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BankLoanModal from "../../components/Loans/BankLoanModal";
import BankLoans from "../../components/Loans/BankLoans";
import PaymentModal from "../../components/Loans/PaymentModal";
import PersonalLoanModal from "../../components/Loans/PersonalLoanModal";
import PersonalLoans from "../../components/Loans/PersonalLoans";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
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
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestión de Préstamos"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={openCreatePersonal}>
              <Plus />
              Nuevo Personal
            </Button>
            <Button variant="secondary" onClick={openCreateBank}>
              <Plus />
              Nuevo Bancario
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Historial de Pagos</h2>
          {selectedLoanId && (
            <Button size="sm" onClick={() => setShowPaymentModal(true)}>
              <Plus />
              Añadir Pago
            </Button>
          )}
        </div>
        <Card className="overflow-hidden">
          {!selectedLoanId ? (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Selecciona un préstamo para ver los pagos
            </CardContent>
          ) : payments.length === 0 ? (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No hay pagos registrados para este préstamo
            </CardContent>
          ) : (
            <div className="divide-y">
              {payments.map((p) => (
                <div key={p.id} className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(p.paymentDate).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                      {p.notes && <p className="text-sm text-card-foreground">{p.notes}</p>}
                    </div>
                    <p className="shrink-0 text-lg font-semibold text-positive">
                      {p.amount.toFixed(2)} €
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

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