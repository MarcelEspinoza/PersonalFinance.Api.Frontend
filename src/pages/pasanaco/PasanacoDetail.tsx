import { useMemo, useState } from "react";
import { Archive, ArrowLeft, ArrowRight, RotateCcw, Trash2, UserMinus } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Participant,
  Pasanaco,
  PasanacoPayment,
  pasanacoService,
} from "../../services/pasanacoService";
import { euros } from "../../utils/civilDate";
import { ParticipantsList } from "./ParticipantsList";
import { apiErrorText, monthLabel } from "./pasanacoFormat";
import { TurnsCalendar, type CalendarTurn } from "./TurnsCalendar";

interface Props {
  pasanaco: Pasanaco;
  participants: Participant[];
  payments: PasanacoPayment[];
  onRefresh: () => void;
  onDelete: () => void;
}

export function PasanacoDetail({ pasanaco, participants, payments, onRefresh, onDelete }: Props) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [removeId, setRemoveId] = useState("");
  const [advanceWithLoans, setAdvanceWithLoans] = useState(false);

  const totalAllowed = pasanaco.totalParticipants;
  const round = pasanaco.currentRound;
  const amount = pasanaco.monthlyAmount;
  const readOnly = pasanaco.isCompleted;
  const { month, year } = getCurrentGameMonth(pasanaco.startMonth, pasanaco.startYear, round);
  const next = getCurrentGameMonth(pasanaco.startMonth, pasanaco.startYear, round + 1);
  const isLastRound = round >= totalAllowed;

  const enriched = useMemo(
    () =>
      participants
        .map((p) => ({ ...p, payment: payments.find((pay) => pay.participantId === p.id) ?? null }))
        .sort((a, b) => a.assignedNumber - b.assignedNumber),
    [participants, payments]
  );

  const recipient = enriched.find((p) => p.assignedNumber === round);
  const paidCount = enriched.filter((p) => p.payment?.paid).length;
  const pendingCount = enriched.length - paidCount;
  const collected = paidCount * amount;
  const pot = enriched.length * amount;
  const toCollect = pot - collected;
  const collectedPercent = pot > 0 ? Math.round((collected / pot) * 100) : 0;

  const usedNumbers = useMemo(() => participants.map((p) => Number(p.assignedNumber)), [participants]);
  const missingParticipants = Math.max(0, totalAllowed - participants.length);

  const typedMonth = useMemo(() => {
    const n = Number(number);
    if (!n || isNaN(n)) return "—";
    const res = getCurrentGameMonth(pasanaco.startMonth, pasanaco.startYear, n);
    return monthLabel(res.month, res.year);
  }, [number, pasanaco.startMonth, pasanaco.startYear]);

  const handleAddParticipant = async () => {
    const n = Number(number);
    if (!name.trim() || !number) return alert("Escribe el nombre y su número");
    if (participants.length >= totalAllowed) return alert(`Ya están los ${totalAllowed} participantes`);
    if (!Number.isInteger(n) || n < 1 || n > totalAllowed) return alert(`El número debe estar entre 1 y ${totalAllowed}`);
    if (usedNumbers.includes(n)) return alert(`El número ${n} ya lo tiene otra persona`);

    setAdding(true);
    try {
      await pasanacoService.addParticipant(pasanaco.id, { name, assignedNumber: n });
      setName("");
      setNumber("");
      await onRefresh();
    } catch (err) {
      console.error(err);
      alert(apiErrorText(err, "No se pudo añadir el participante"));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveParticipant = async () => {
    const person = participants.find((p) => p.id === removeId);
    if (!person || !confirm(`¿Quitar a ${person.name} del pasanaco?`)) return;
    try {
      await pasanacoService.deleteParticipant(pasanaco.id, person.id);
      setRemoveId("");
      await onRefresh();
    } catch (err) {
      console.error("Error borrando participante", err);
      alert(apiErrorText(err, "No se pudo quitar al participante"));
    }
  };

  const handleAdvance = async () => {
    const nextLabel = monthLabel(next.month, next.year).toLowerCase();
    const message = pendingCount === 0
      ? `¿Pasar a ${nextLabel}?`
      : advanceWithLoans
        ? `Faltan ${pendingCount} por pagar. ¿Pasar a ${nextLabel} y apuntar esas cuotas como préstamos?`
        : `Faltan ${pendingCount} por pagar. ¿Pasar a ${nextLabel} igualmente?`;
    if (!confirm(message)) return;
    try {
      await pasanacoService.advance(pasanaco.id, advanceWithLoans);
      setAdvanceWithLoans(false);
      await onRefresh();
    } catch (err) {
      alert(apiErrorText(err, "No se pudo pasar al mes siguiente: revisa los pagos"));
      console.error("Error al avanzar ronda:", err);
    }
  };

  const handleRetreat = async () => {
    if (!confirm("¿Volver al mes anterior?")) return;
    try {
      await pasanacoService.retreat(pasanaco.id);
      await onRefresh();
    } catch (err) {
      alert(apiErrorText(err, "No se pudo volver al mes anterior"));
      console.error("Error al retroceder ronda:", err);
    }
  };

  const handleComplete = async () => {
    if (!confirm("¿Finalizar este pasanaco? Se guarda todo como histórico.")) return;
    try {
      await pasanacoService.complete(pasanaco.id);
      await onRefresh();
    } catch (err) {
      alert(apiErrorText(err, "No se pudo finalizar el pasanaco"));
    }
  };

  const handleReopen = async () => {
    if (!confirm("¿Reabrir este pasanaco para volver a modificarlo?")) return;
    try {
      await pasanacoService.reopen(pasanaco.id);
      await onRefresh();
    } catch (err) {
      alert(apiErrorText(err, "No se pudo reabrir el pasanaco"));
    }
  };

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Pasanaco finalizado</p>
              <p className="text-sm text-muted-foreground">Se guarda como histórico y no se puede cambiar.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleReopen()}>
            <RotateCcw /> Reabrir
          </Button>
        </div>
      )}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              {monthLabel(month, year)} · Turno {round} de {totalAllowed}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {recipient ? <>Este mes cobra <span className="text-primary">{recipient.name}</span></> : "Este turno no tiene a nadie asignado"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{pasanaco.name} · cuota de {euros(amount)} por persona</p>
          </div>

          {!readOnly && (
            <div className="flex flex-col items-stretch gap-2 md:items-end">
              {isLastRound ? (
                <Button type="button" onClick={() => void handleComplete()}>
                  <Archive /> Finalizar pasanaco
                </Button>
              ) : (
                <Button type="button" variant={pendingCount === 0 ? "default" : "outline"} onClick={() => void handleAdvance()}>
                  Pasar a {monthLabel(next.month, next.year).toLowerCase()} <ArrowRight />
                </Button>
              )}
              {!isLastRound && pendingCount > 0 && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={advanceWithLoans} onChange={(e) => setAdvanceWithLoans(e.target.checked)} />
                  Apuntar como préstamo lo que falte
                </label>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">Bote del mes</div>
            <div className="mt-1 text-xl font-semibold">{euros(pot)}</div>
            <div className="text-xs text-muted-foreground">{enriched.length} cuotas de {euros(amount)}</div>
          </div>
          <div className="rounded-lg bg-positive-soft p-3">
            <div className="text-xs text-positive">Ya cobrado</div>
            <div className="mt-1 text-xl font-semibold text-positive">{euros(collected)}</div>
            <div className="text-xs text-positive">{paidCount} de {enriched.length} pagaron</div>
          </div>
          <div className="rounded-lg bg-warning-soft p-3">
            <div className="text-xs text-warning">Falta por cobrar</div>
            <div className="mt-1 text-xl font-semibold text-warning">{euros(toCollect)}</div>
            <div className="text-xs text-warning">{pendingCount === 0 ? "Todo cobrado" : `${pendingCount} por pagar`}</div>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-positive" style={{ width: `${collectedPercent}%` }} />
        </div>
        {missingParticipants > 0 && (
          <p className="mt-3 text-xs text-warning">
            Faltan {missingParticipants} participantes por añadir. Hazlo en «Más opciones».
          </p>
        )}
      </section>

      <TurnsCalendar
        turns={Array.from({ length: totalAllowed }, (_, i) => i + 1).map((n): CalendarTurn => {
          const turn = getCurrentGameMonth(pasanaco.startMonth, pasanaco.startYear, n);
          return {
            number: n,
            name: enriched.find((p) => p.assignedNumber === n)?.name,
            month: turn.month,
            year: turn.year,
            status: readOnly || n < round ? "done" : n === round ? "current" : "upcoming",
          };
        })}
      />

      <ParticipantsList
        participants={enriched}
        onRefresh={onRefresh}
        pasanacoId={pasanaco.id}
        monthlyAmount={amount}
        quotaMonth={month}
        quotaYear={year}
        currentRound={round}
        readOnly={readOnly}
      />

      {!readOnly && (
        <details className="rounded-xl border bg-card p-4 shadow-sm" open={missingParticipants > 0}>
          <summary className="cursor-pointer select-none font-semibold">Más opciones</summary>
          <div className="mt-4 space-y-5">
            {missingParticipants > 0 && (
              <div>
                <h4 className="text-sm font-medium">Añadir participante</h4>
                <p className="mb-2 text-xs text-muted-foreground">El número dice en qué mes cobra el bote.</p>
                <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                  <div>
                    <input
                      type="number"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder={`Número (1 a ${totalAllowed})`}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                    <div className="mt-1 text-xs text-muted-foreground">Cobra en: {typedMonth}</div>
                  </div>
                  <Button type="button" disabled={adding} onClick={() => void handleAddParticipant()}>
                    {adding ? "Añadiendo…" : "Añadir"}
                  </Button>
                </div>
              </div>
            )}

            {participants.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Quitar participante</h4>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={removeId}
                    onChange={(e) => setRemoveId(e.target.value)}
                    className="min-w-48 rounded-lg border bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Elige a quién…</option>
                    {enriched.map((p) => (
                      <option key={p.id} value={p.id}>#{p.assignedNumber} {p.name}</option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" disabled={!removeId} onClick={() => void handleRemoveParticipant()}>
                    <UserMinus /> Quitar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {round > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => void handleRetreat()}>
                  <ArrowLeft /> Volver al mes anterior
                </Button>
              )}
              {!isLastRound && (
                <Button type="button" variant="outline" size="sm" onClick={() => void handleComplete()}>
                  <Archive /> Finalizar pasanaco
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" className="ml-auto text-negative" onClick={onDelete}>
                <Trash2 /> Eliminar pasanaco
              </Button>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

export function getCurrentGameMonth(startMonth: number, startYear: number, round: number) {
  if (
    typeof startMonth !== "number" ||
    typeof startYear !== "number" ||
    typeof round !== "number" ||
    startMonth < 1 ||
    startMonth > 12 ||
    startYear < 2000 ||
    round < 1
  ) {
    return { month: NaN, year: NaN };
  }

  const base = new Date(startYear, startMonth - 1);
  const current = new Date(base.setMonth(base.getMonth() + round - 1));
  return { month: current.getMonth() + 1, year: current.getFullYear() };
}