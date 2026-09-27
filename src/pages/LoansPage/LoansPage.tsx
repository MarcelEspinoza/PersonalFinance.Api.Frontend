import { Building2, Calendar, HandCoins, Loader2, Plus, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BankLoanModal from "../../components/Loans/BankLoanModal";
import PaymentModal from "../../components/Loans/PaymentModal";
import PersonalLoanModal from "../../components/Loans/PersonalLoanModal";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { LoansService } from "../../services/loansService";
import { money } from "../../utils/civilDate";

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
  const [filter, setFilter] = useState<"active" | "all" | "personal" | "bank">("active");

  useEffect(() => {
    if (user) loadLoans();
  }, [user]);

  useEffect(() => {
    if (selectedLoanId) {
      setPayments([]);
      loadPayments(selectedLoanId);
    } else {
      setPayments([]);
    }
  }, [selectedLoanId]);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const { data } = await LoansService.getLoans(user!.id);
      const loaded = data || [];
      setLoans(loaded);
      setSelectedLoanId((current) =>
        current && loaded.some((loan: LoanUnion) => loan.id === current)
          ? current
          : loaded[0]?.id ?? null
      );
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

  const selectedLoan = useMemo(
    () => loans.find((l) => l.id === selectedLoanId) || null,
    [loans, selectedLoanId]
  );
  const filteredLoans = useMemo(() => loans.filter((loan) => {
    if (filter === "active") return loan.status !== "paid";
    if (filter === "personal") return loan.type !== "bank";
    if (filter === "bank") return loan.type === "bank";
    return true;
  }), [filter, loans]);
  useEffect(() => {
    if (filteredLoans.some((loan) => loan.id === selectedLoanId)) return;
    setSelectedLoanId(filteredLoans[0]?.id ?? null);
  }, [filteredLoans, selectedLoanId]);
  const payable = loans
    .filter((loan) => loan.type === "bank" || loan.type === "received")
    .reduce((sum, loan) => sum + loan.outstandingAmount, 0);
  const receivable = loans
    .filter((loan) => loan.type === "given")
    .reduce((sum, loan) => sum + loan.outstandingAmount, 0);
  const activeLoans = loans.filter((loan) => loan.status !== "paid").length;

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
        title="Préstamos"
        description="Controla lo que debes, lo que te deben y cada pago desde una sola vista."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={openCreatePersonal}>
              <Plus />
              Préstamo personal
            </Button>
            <Button variant="secondary" onClick={openCreateBank}>
              <Plus />
              Préstamo bancario
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/15 bg-primary/[0.04] shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pendiente por pagar</p>
            <p className="mt-2 text-2xl font-semibold text-negative">{money(payable)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Bancarios y personales recibidos</p>
          </CardContent>
        </Card>
        <Card className="border-positive/15 bg-positive-soft/50 shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pendiente por cobrar</p>
            <p className="mt-2 text-2xl font-semibold text-positive">{money(receivable)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Dinero prestado a otras personas</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Préstamos activos</p>
            <p className="mt-2 text-2xl font-semibold">{activeLoans}</p>
            <p className="mt-1 text-xs text-muted-foreground">{loans.length} registrados en total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Tus préstamos</h2>
            <div className="inline-flex rounded-lg border bg-muted/60 p-1">
              {([
                ["active", "Activos"],
                ["all", "Todos"],
                ["personal", "Personales"],
                ["bank", "Bancarios"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden">
            {filteredLoans.length === 0 ? (
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                No hay préstamos para este filtro.
              </CardContent>
            ) : (
              <div className="divide-y">
                {filteredLoans.map((loan) => {
                  const paidPercentage = loan.principalAmount > 0
                    ? Math.max(0, Math.min(100, ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100))
                    : 0;
                  const TypeIcon = loan.type === "bank" ? Building2 : UserRound;

                  return (
                    <button
                      key={loan.id}
                      type="button"
                      onClick={() => setSelectedLoanId(loan.id)}
                      className={`block w-full p-5 text-left transition-colors ${selectedLoanId === loan.id ? "bg-primary/[0.06]" : "hover:bg-muted/60"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3">
                          <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><TypeIcon className="h-4 w-4" /></div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold">{loan.name}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${loan.status === "paid" ? "bg-positive-soft text-positive" : loan.status === "overdue" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning"}`}>
                                {loan.status === "paid" ? "Pagado" : loan.status === "overdue" ? "Vencido" : "Activo"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {loan.type === "bank" ? "Préstamo bancario" : loan.type === "given" ? "Tú prestaste" : "Te prestaron"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{money(loan.outstandingAmount)}</div>
                          <div className="text-xs text-muted-foreground">de {money(loan.principalAmount)}</div>
                        </div>
                      </div>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${paidPercentage}%` }} />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>{paidPercentage.toFixed(0)}% amortizado</span>
                        <span>{new Date(loan.startDate).toLocaleDateString("es-ES")}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Detalle y pagos</h2>
            {selectedLoan && (
              <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                <Plus /> Registrar pago
              </Button>
            )}
          </div>

          <Card className="overflow-hidden">
            {!selectedLoan ? (
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                Selecciona un préstamo para ver su detalle.
              </CardContent>
            ) : (
              <>
                <CardContent className="border-b p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{selectedLoan.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pendiente {money(selectedLoan.outstandingAmount)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEditLoan(selectedLoan)}>Editar</Button>
                      <Button size="sm" variant="ghost" className="text-negative" onClick={() => void deleteLoan(selectedLoan.id)}>Eliminar</Button>
                    </div>
                  </div>
                  {selectedLoan.type === "bank" && (
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-sm">
                      <div><span className="text-muted-foreground">Interés</span><div className="font-medium">{selectedLoan.interestRate}%</div></div>
                      <div><span className="text-muted-foreground">Próxima cuota</span><div className="font-medium">{selectedLoan.nextPaymentAmount ? money(selectedLoan.nextPaymentAmount) : "—"}</div></div>
                    </div>
                  )}
                </CardContent>

                <div className="max-h-[28rem] divide-y overflow-auto">
                  {payments.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">Todavía no hay pagos registrados.</div>
                  ) : payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(payment.paymentDate).toLocaleDateString("es-ES")}</div>
                        {payment.notes && <p className="mt-1 text-xs text-muted-foreground">{payment.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 font-semibold text-positive"><HandCoins className="h-4 w-4" />{money(payment.amount)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </section>
      </div>

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