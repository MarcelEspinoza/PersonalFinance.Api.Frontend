import { Banknote, Check, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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
  const [loanParticipant, setLoanParticipant] = useState<ParticipantWithPayment | null>(null);
  const [loanAmount, setLoanAmount] = useState(String(monthlyAmount ?? ""));
  const [loanBusy, setLoanBusy] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);

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

  const openLoanDialog = (participant: ParticipantWithPayment) => {
    setLoanParticipant(participant);
    setLoanAmount(String(monthlyAmount ?? ""));
    setLoanError(null);
  };

  const handleCreateLoan = async () => {
    if (!loanParticipant) return;
    const amount = Number(loanAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setLoanError("Introduce un importe válido mayor que cero.");
      return;
    }

    setLoanBusy(true);
    setLoanError(null);
    try {
      await pasanacoService.createLoanForParticipant(
        pasanacoId,
        loanParticipant.id,
        { amount, note: `Préstamo por pasanaco ${pasanacoId}` },
      );
      setLoanParticipant(null);
      await onRefresh();
    } catch (err: any) {
      console.error("Error creando préstamo", err);
      setLoanError(err?.response?.data || "No se pudo crear el préstamo");
    } finally {
      setLoanBusy(false);
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
    <>
      <ul className="grid max-h-[60vh] gap-3 overflow-auto pr-1 xl:grid-cols-2">
        {participants.map((p) => {
          const payment = p.payment ?? payments.find((x) => x.participantId === p.id) ?? null;
          const { month, year } = getCurrentGameMonth(startMonth, startYear, p.assignedNumber);
          const displayMonth = isNaN(month) ? "—" : formatMonthYear(month, year);

          const isHighlighted = highlightedId === p.id;

          return (
            <li
              key={p.id}
              className={`rounded-xl border p-4 transition ${isHighlighted ? "border-positive/30 bg-positive-soft animate-pulse" : "bg-card hover:border-primary/20"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  #{p.assignedNumber}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-card-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Mes: {displayMonth}</div>
                </div>
              </div>
                <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${payment?.paid ? "bg-positive-soft text-positive" : payment ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"}`}>
                  {payment?.paid ? "Pagado" : payment ? "Pendiente" : "Sin pago"}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => openLoanDialog(p)}>
                  <Banknote /> Crear préstamo
                </Button>
                {payment && !payment.paid && (
                  <Button type="button" size="sm" onClick={() => void handleMarkPaid(p)}>
                    <Check /> Marcar pagado
                  </Button>
                )}
                <Button type="button" variant="ghost" size="icon" className="ml-auto text-negative" onClick={() => void handleDelete(p.id)} aria-label={`Eliminar ${p.name}`}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={loanParticipant !== null} onOpenChange={(open) => !open && setLoanParticipant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear préstamo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Registra el importe prestado a <span className="font-medium text-foreground">{loanParticipant?.name}</span>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="participant-loan-amount">Importe</Label>
              <Input
                id="participant-loan-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={loanAmount}
                onChange={(event) => setLoanAmount(event.target.value)}
                autoFocus
              />
            </div>
            {loanError && <p className="text-sm text-negative">{loanError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLoanParticipant(null)} disabled={loanBusy}>Cancelar</Button>
            <Button type="button" onClick={() => void handleCreateLoan()} disabled={loanBusy}>
              {loanBusy ? "Creando…" : "Crear préstamo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}