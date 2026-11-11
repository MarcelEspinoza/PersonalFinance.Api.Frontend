import { Building2, Calendar, HandCoins, Loader2, Plus, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BankLoanModal from "../../components/Loans/BankLoanModal";
import PaymentModal from "../../components/Loans/PaymentModal";
import PersonalLoanModal from "../../components/Loans/PersonalLoanModal";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { LoansService, type LoanOverview } from "../../services/loansService";
import { ledgerErrorMessage } from "../../services/ledgerService";
import { money } from "../../utils/civilDate";

export interface BaseLoan {
  id: string;
  type: "given" | "received" | "bank";
  name: string;
  principalAmount: number;
  outstandingAmount: number;
  startDate: string;
  dueDate?: string;
  status: "active" | "paid" | "overdue" | "cancelled";
  archivedAt?: string | null;
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
  const [overview, setOverview] = useState<LoanOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const loadRequest = useRef<symbol | null>(null);
  const paymentRequest = useRef<symbol | null>(null);
  const userId = user?.id;

  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanUnion | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filter, setFilter] = useState<"active" | "all" | "personal" | "bank" | "archived">("active");

  const loadLoans = useCallback(async () => {
    if (!userId) return;
    const request = Symbol();
    loadRequest.current = request;
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const [{ data: loaded }, { data: nextOverview }] = await Promise.all([
        LoansService.getLoans(userId),
        LoansService.getOverview(now.getFullYear(), now.getMonth() + 1),
      ]);
      if (request !== loadRequest.current) return;
      setLoans(loaded);
      setOverview(nextOverview);
      setSelectedLoanId((current) =>
        current && loaded.some(loan => loan.id === current)
          ? current
          : loaded[0]?.id ?? null
      );
    } catch (e) {
      if (request === loadRequest.current)
        setError(ledgerErrorMessage(e, "No se han podido cargar tus deudas y cobros."));
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadLoans();
    return () => { loadRequest.current = null; };
  }, [loadLoans]);

  const loadPayments = async (loanId: string) => {
    const request = Symbol();
    paymentRequest.current = request;
    setPayments([]);
    setPaymentError(null);
    setLoadingPayments(true);
    try {
      const { data } = await LoansService.getPayments(loanId);
      if (request === paymentRequest.current) setPayments(data);
    } catch (e) {
      if (request === paymentRequest.current)
        setPaymentError(ledgerErrorMessage(e, "No se ha podido cargar el historial de pagos."));
    } finally {
      if (request === paymentRequest.current) setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (selectedLoanId) void loadPayments(selectedLoanId);
    else setPayments([]);
    return () => { paymentRequest.current = null; };
  }, [selectedLoanId, userId]);

  const selectedLoan = useMemo(
    () => loans.find((l) => l.id === selectedLoanId) || null,
    [loans, selectedLoanId]
  );
  const filteredLoans = useMemo(() => loans.filter((loan) => {
    if (filter === "archived") return Boolean(loan.archivedAt);
    if (filter !== "all" && loan.archivedAt) return false;
    if (filter === "active") return loan.status !== "paid" && loan.status !== "cancelled";
    if (filter === "personal") return loan.type !== "bank";
    if (filter === "bank") return loan.type === "bank";
    return true;
  }), [filter, loans]);
  useEffect(() => {
    if (filteredLoans.some((loan) => loan.id === selectedLoanId)) return;
    setSelectedLoanId(filteredLoans[0]?.id ?? null);
  }, [filteredLoans, selectedLoanId]);
  const activeLoans = loans.filter(
    (loan) => !loan.archivedAt && loan.status !== "paid" && loan.status !== "cancelled",
  ).length;

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

  const setLoansArchived = async (ids: string[], archived: boolean) => {
    if (ids.length === 0 || archiving) return;
    if (!window.confirm(archived
      ? `Archivar ${ids.length} préstamo(s) los deja fuera del seguimiento activo. Se conservan sus saldos, pagos e historial. No se eliminan previsiones independientes. ¿Continuar?`
      : "¿Recuperar este préstamo con su estado y saldo originales?")) return;
    setArchiving(true);
    setError(null);
    try {
      await LoansService.setArchived(ids, archived);
      setFilter(archived ? "archived" : "active");
      await loadLoans();
    } catch (e) {
      setError(ledgerErrorMessage(e, "No se ha podido cambiar el archivo de los préstamos."));
    } finally {
      setArchiving(false);
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
        title="Deudas y cobros"
        description="Con quién tienes pendientes, cuándo toca pagar y qué queda solo como histórico."
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

      {error && <div role="alert" className="space-y-2 rounded-lg border border-negative/30 p-4 text-sm text-negative">
        <p>{error}</p><Button variant="outline" size="sm" onClick={() => void loadLoans()}>Reintentar deudas</Button>
      </div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/15 bg-primary/[0.04] shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pendiente por pagar</p>
            <p className="mt-2 text-2xl font-semibold text-negative">{overview ? money(overview.payable) : "No disponible"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Préstamos activos y liquidaciones, sin duplicar saldos vinculados</p>
          </CardContent>
        </Card>
        <Card className="border-positive/15 bg-positive-soft/50 shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pendiente por cobrar</p>
            <p className="mt-2 text-2xl font-semibold text-positive">{overview ? money(overview.receivable) : "No disponible"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Préstamos y devoluciones pendientes</p>
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

      <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
        <p>Los préstamos y devoluciones son dinero que entra o sale, no sueldo ni compras. Este seguimiento no crea movimientos ni cambia tus saldos.</p>
        <p className="text-muted-foreground">Los archivados conservan su importe original, pero quedan fuera del seguimiento activo. Tus previsiones independientes siguen en Mes.</p>
        {overview && overview.archivedLoans > 0 && <p>{overview.archivedLoans} préstamos archivados · saldo registrado en su histórico: {money(overview.archivedRecordedBalance)}. No significa que estén pagados.</p>}
      </div>

      {overview && overview.items.some(item => item.source === "settlement") && (
        <section className="space-y-3" aria-label="Liquidaciones pendientes">
          <h2 className="text-lg font-semibold">Liquidaciones pendientes</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {overview.items.filter(item => item.source === "settlement").map(item => (
              <Card key={item.id}><CardContent className="space-y-2 p-4">
                <p className="font-semibold">{item.counterpartyName} · {item.title}</p>
                <p className={item.direction === "out" ? "text-negative" : "text-positive"}>{item.direction === "out" ? "Debes pagar" : "Te deben"} {money(item.remainingAmount)}</p>
                <p className="text-xs text-muted-foreground">Fecha prevista: {item.nextDate ? new Date(`${item.nextDate}T12:00:00`).toLocaleDateString("es-ES") : "Sin fecha definida"}</p>
                <Button asChild size="sm" variant="outline"><Link to={`/settlements?id=${item.id}`}>Ver liquidación e historial</Link></Button>
              </CardContent></Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Tus préstamos</h2>
            <div className="flex max-w-full flex-wrap rounded-lg border bg-muted/60 p-1">
              {([
                ["active", "Activos"],
                ["all", "Todos"],
                ["personal", "Personales"],
                ["bank", "Bancarios"],
                ["archived", "Archivados"],
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
            <div className="flex flex-wrap justify-end">
              <Button size="sm" variant="outline" className="h-auto min-h-8 whitespace-normal text-left" disabled={archiving || !loans.some(loan => !loan.archivedAt)}
                onClick={() => void setLoansArchived(loans.filter(loan => !loan.archivedAt).map(loan => loan.id), true)}>
                Archivar todos los préstamos existentes
              </Button>
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
                      className={`block w-full p-4 text-left transition-colors ${selectedLoanId === loan.id ? "bg-primary/[0.06]" : "hover:bg-muted/60"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3">
                          <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><TypeIcon className="h-4 w-4" /></div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold" title={loan.name}>{loan.name}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${loan.archivedAt ? "bg-muted text-muted-foreground" : loan.status === "paid" ? "bg-positive-soft text-positive" : loan.status === "cancelled" ? "bg-muted text-muted-foreground" : loan.status === "overdue" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning"}`}>
                                {loan.archivedAt ? "Archivado" : loan.status === "paid" ? "Saldado" : loan.status === "cancelled" ? "Cancelado" : loan.status === "overdue" ? "Vencido" : "Activo"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {loan.type === "bank" ? "Préstamo bancario" : loan.type === "given" ? "Tú prestaste" : "Te prestaron"}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="whitespace-nowrap font-semibold tabular-nums">{money(loan.outstandingAmount)}</div>
                          <div className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">de {money(loan.principalAmount)}</div>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
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

        <section className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Detalle y pagos</h2>
            {selectedLoan && !selectedLoan.archivedAt && selectedLoan.status !== "paid" && selectedLoan.status !== "cancelled" && (
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
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{selectedLoan.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pendiente {money(selectedLoan.outstandingAmount)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!selectedLoan.archivedAt && <Button size="sm" variant="outline" onClick={() => openEditLoan(selectedLoan)}>Editar</Button>}
                      <Button size="sm" variant="outline" disabled={archiving}
                        onClick={() => void setLoansArchived([selectedLoan.id], !selectedLoan.archivedAt)}>
                        {selectedLoan.archivedAt ? "Recuperar" : "Archivar"}
                      </Button>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-muted-foreground">Tipo</dt><dd>{selectedLoan.type === "bank" ? "Banco o financiera" : selectedLoan.type === "given" ? "Dinero que prestaste" : "Dinero que recibiste prestado"}</dd></div>
                      <div><dt className="text-muted-foreground">Importe inicial</dt><dd>{money(selectedLoan.principalAmount)}</dd></div>
                      <div><dt className="text-muted-foreground">Desde</dt><dd>{new Date(selectedLoan.startDate).toLocaleDateString("es-ES")}</dd></div>
                      <div><dt className="text-muted-foreground">Fecha final registrada</dt><dd>{selectedLoan.dueDate ? new Date(selectedLoan.dueDate).toLocaleDateString("es-ES") : "Sin fecha definida"}</dd></div>
                      <div><dt className="text-muted-foreground">Cuenta de pago</dt><dd>No registrada en este préstamo</dd></div>
                      {selectedLoan.archivedAt && <div><dt className="text-muted-foreground">Archivado desde</dt><dd>{new Date(selectedLoan.archivedAt).toLocaleDateString("es-ES")}</dd></div>}
                  </dl>
                  {selectedLoan.type === "bank" && (
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-sm">
                      <div><span className="text-muted-foreground">Interés</span><div className="font-medium">{selectedLoan.interestRate}%</div></div>
                      <div><span className="text-muted-foreground">Próxima cuota</span><div className="font-medium">{selectedLoan.nextPaymentAmount ? money(selectedLoan.nextPaymentAmount) : "—"}</div></div>
                      <div><span className="text-muted-foreground">Próxima fecha</span><div className="font-medium">{selectedLoan.nextPaymentDate ? new Date(selectedLoan.nextPaymentDate).toLocaleDateString("es-ES") : "Sin fecha definida"}</div></div>
                      <div><span className="text-muted-foreground">Cuotas pendientes</span><div className="font-medium">{selectedLoan.installmentsRemaining ?? "Sin registrar"}</div></div>
                    </div>
                  )}
                </CardContent>

                <div className="max-h-[28rem] divide-y overflow-auto">
                  {loadingPayments ? <div role="status" className="p-4 text-sm text-muted-foreground">Cargando historial…</div>
                    : paymentError ? <div role="alert" className="space-y-2 p-4 text-sm text-negative"><p>{paymentError}</p><Button size="sm" variant="outline" onClick={() => void loadPayments(selectedLoan.id)}>Reintentar historial</Button></div>
                    : payments.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">Todavía no hay pagos registrados.</div>
                  ) : payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(payment.paymentDate).toLocaleDateString("es-ES")}</div>
                        {payment.notes && <p className="mt-1 truncate text-xs text-muted-foreground" title={payment.notes}>{payment.notes}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold tabular-nums text-positive"><HandCoins className="h-4 w-4" />{money(payment.amount)}</div>
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

      {showPaymentModal && selectedLoan && !selectedLoan.archivedAt && selectedLoan.status !== "paid" && selectedLoan.status !== "cancelled" && (
        <PaymentModal
          loan={selectedLoan}
          onClose={() => setShowPaymentModal(false)}
          onSaved={onPaymentSaved}
        />
      )}
    </div>
  );
}