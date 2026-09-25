import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import pasanacoService, { Participant, PasanacoPayment } from "../../services/pasanacoService";
import { getCurrentGameMonth } from "./PasanacoPage";

interface ParticipantWithPayment extends Participant {
  payment?: PasanacoPayment | null;
}

interface Props {
  participants: ParticipantWithPayment[];
  payments: PasanacoPayment[];
  onRefresh: () => void;
  startMonth: number;
  startYear: number;
  totalRounds: number;
  pasanacoId: string;
  monthlyAmount: number;
}

function formatMonthYear(month: number, year: number) {
  try {
    const d = new Date(year, month - 1, 1);
    const monthName = d.toLocaleString("es-ES", { month: "long" });
    return `${monthName}/${year}`;
  } catch {
    return `${month}/${year}`;
  }
}

export function ParticipantsList({ participants, payments, onRefresh, startMonth, startYear, totalRounds, pasanacoId, monthlyAmount }: Props) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedId) return;
    const t = setTimeout(() => setHighlightedId(null), 1200);
    return () => clearTimeout(t);
  }, [highlightedId]);

  if (!participants || participants.length === 0) return <div className="text-sm text-muted-foreground">No hay participantes</div>;

  const handleDelete = async (participantId: string) => {
    if (!confirm("¿Eliminar participante?")) return;
    try {
      await pasanacoService.deleteParticipant(pasanacoId, participantId);
      await onRefresh();
    } catch (err) {
      console.error("Error borrando participante", err);
      alert("No se pudo eliminar participante");
    }
  };

  const handleCreateLoan = async (participantId: string) => {
    const input = prompt("Importe del préstamo (ej: 50.00):", String(monthlyAmount ?? ""));
    if (!input) return;
    const amount = Number(input);
    if (isNaN(amount) || amount <= 0) {
      return alert("Importe inválido");
    }
    if (!confirm(`Crear préstamo de ${amount}€ para este participante?`)) return;
    try {
      // note: backend will create Loan (status active) and create an Expense record that includes LoanId in the Notes (not in LoanId field)
      await pasanacoService.createLoanForParticipant(pasanacoId, participantId, { amount, note: `Prestad por pasanaco ${pasanacoId}` });
      alert("Préstamo creado");
      await onRefresh();
    } catch (err: any) {
      console.error("Error creando préstamo", err);
      alert(err?.response?.data || "No se pudo crear el préstamo");
    }
  };

  const handleMarkPaid = async (participant: ParticipantWithPayment) => {
    const payment = participant.payment ?? payments.find((x) => x.participantId === participant.id) ?? null;
    if (!payment) {
      return alert("No existe un pago para este participante en este mes.");
    }
    if (payment.paid) {
      return alert("El pago ya está marcado como pagado.");
    }
    if (!confirm(`Marcar como pagado el pago de ${participant.name}?`)) return;

    try {
      await pasanacoService.markPaymentAsPaid(payment.id);
      // destacar visualmente
      setHighlightedId(participant.id);
      // recargar datos
      await onRefresh();
    } catch (err: any) {
      console.error("Error marcando pago como pagado", err);
      alert(err?.response?.data || "No se pudo marcar el pago como pagado");
    }
  };

  return (
    <div className="flex gap-6">
      {/* Lista (scrollable) */}
      <ul className="w-full max-h-[60vh] overflow-auto space-y-3 pr-2">
        {participants.map((p) => {
          const payment = p.payment ?? payments.find((x) => x.participantId === p.id) ?? null;
          const { month, year } = getCurrentGameMonth(startMonth, startYear, p.assignedNumber);
          const displayMonth = isNaN(month) ? "—" : formatMonthYear(month, year);

          const isHighlighted = highlightedId === p.id;

          return (
            <li
              key={p.id}
              className={`flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition bg-card ${isHighlighted ? "bg-positive-soft animate-pulse" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                  #{p.assignedNumber}
                </div>
                <div>
                  <div className="font-medium text-card-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Mes: {displayMonth}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Estado */}
                <div>
                  {payment ? (
                    payment.paid ? (
                      <div className="text-sm text-positive">Pagado</div>
                    ) : (
                      <div className="text-sm text-warning">Pendiente</div>
                    )
                  ) : (
                    <div className="text-sm text-muted-foreground">Sin pago</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {payment?.paymentDate ? new Date(payment.paymentDate).toLocaleString() : "—"}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCreateLoan(p.id)} className="px-3 py-1 border rounded hover:bg-accent hover:text-accent-foreground text-sm">
                    Prestar ahora
                  </button>

                  {/* Botón verde "Pagado" */}
                  {payment && !payment.paid && (
                    <button
                      onClick={() => handleMarkPaid(p)}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
                    >
                      Pagado
                    </button>
                  )}

                  <button onClick={() => handleDelete(p.id)} className="px-3 py-1 bg-negative-soft text-negative rounded hover:bg-negative-soft/80">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}