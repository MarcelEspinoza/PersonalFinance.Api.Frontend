import { Banknote, Check, CheckCircle2 } from "lucide-react";
import { useState } from "react";
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
import { euros } from "../../utils/civilDate";
import { apiErrorText, monthLabel } from "./pasanacoFormat";

export interface ParticipantWithPayment extends Participant {
  payment?: PasanacoPayment | null;
}

interface Props {
  participants: ParticipantWithPayment[];
  onRefresh: () => void;
  pasanacoId: string;
  monthlyAmount: number;
  quotaMonth: number;
  quotaYear: number;
  currentRound: number;
  readOnly?: boolean;
}

export function ParticipantsList({ participants, onRefresh, pasanacoId, monthlyAmount, quotaMonth, quotaYear, currentRound, readOnly = false }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loanParticipant, setLoanParticipant] = useState<ParticipantWithPayment | null>(null);
  const [loanAmount, setLoanAmount] = useState(String(monthlyAmount ?? ""));
  const [loanBusy, setLoanBusy] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);

  if (participants.length === 0) {
    return (
      <section className="rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Todavía no hay participantes. Añádelos en «Más opciones», abajo.
      </section>
    );
  }

  const pending = participants.filter((p) => !p.payment?.paid);
  const paid = participants.filter((p) => p.payment?.paid);
  const quotaLabel = monthLabel(quotaMonth, quotaYear).toLowerCase();

  const openLoanDialog = (participant: ParticipantWithPayment) => {
    setLoanParticipant(participant);
    setLoanAmount(String(monthlyAmount ?? ""));
    setLoanError(null);
  };

  const handleCreateLoan = async () => {
    if (!loanParticipant) return;
    const amount = Number(loanAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setLoanError("Escribe un importe mayor que cero.");
      return;
    }

    setLoanBusy(true);
    setLoanError(null);
    try {
      await pasanacoService.createLoanForParticipant(pasanacoId, loanParticipant.id, {
        amount,
        note: `Préstamo por pasanaco ${pasanacoId}`,
      });
      setLoanParticipant(null);
      await onRefresh();
    } catch (err) {
      console.error("Error creando préstamo", err);
      setLoanError(apiErrorText(err, "No se pudo crear el préstamo"));
    } finally {
      setLoanBusy(false);
    }
  };

  const handleMarkPaid = async (participant: ParticipantWithPayment) => {
    if (!confirm(`¿${participant.name} ya te pagó su cuota de ${quotaLabel} (${euros(monthlyAmount)})?\n\nSirve también si te la dio en efectivo. No se crea ningún ingreso aparte.`)) return;

    setBusyId(participant.id);
    try {
      await pasanacoService.markQuotaPaid(pasanacoId, participant.id, quotaMonth, quotaYear);
      await onRefresh();
    } catch (err) {
      console.error("Error marcando pago como pagado", err);
      alert(apiErrorText(err, "No se pudo marcar el pago como pagado"));
    } finally {
      setBusyId(null);
    }
  };

  const nameCell = (p: ParticipantWithPayment) => (
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-medium" title={p.name}>{p.name}</div>
      {p.assignedNumber === currentRound && <div className="text-xs text-primary">Cobra este mes</div>}
    </div>
  );

  const numberBadge = (p: ParticipantWithPayment, tone: string) => (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tone}`}>
      #{p.assignedNumber}
    </span>
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">Faltan por pagar</h3>
            <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
              {pending.length} · {euros(pending.length * monthlyAmount)}
            </span>
          </header>
          {pending.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-positive">
              <CheckCircle2 className="h-4 w-4" /> Todos pagaron la cuota de {quotaLabel}.
            </p>
          ) : (
            <ul className="divide-y">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                  {numberBadge(p, "bg-warning-soft text-warning")}
                  {nameCell(p)}
                  {!readOnly && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Le presto la cuota (crear préstamo)"
                        aria-label={`Prestar la cuota a ${p.name}`}
                        onClick={() => openLoanDialog(p)}
                      >
                        <Banknote />
                      </Button>
                      <Button type="button" size="sm" disabled={busyId === p.id} onClick={() => void handleMarkPaid(p)}>
                        <Check /> Ya pagó
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">Ya pagaron</h3>
            <span className="rounded-full bg-positive-soft px-2.5 py-0.5 text-xs font-medium text-positive">
              {paid.length} · {euros(paid.length * monthlyAmount)}
            </span>
          </header>
          {paid.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nadie ha pagado todavía la cuota de {quotaLabel}.</p>
          ) : (
            <ul className="divide-y">
              {paid.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                  {numberBadge(p, "bg-positive-soft text-positive")}
                  {nameCell(p)}
                  <Check className="h-4 w-4 shrink-0 text-positive" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={loanParticipant !== null} onOpenChange={(open) => !open && setLoanParticipant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prestar la cuota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apunta cuánto le prestas a <span className="font-medium text-foreground">{loanParticipant?.name}</span> para pagar su cuota. Quedará en Préstamos como dinero que te debe.
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