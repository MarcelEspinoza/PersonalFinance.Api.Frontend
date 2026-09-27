import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CircleDollarSign, Users } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Participant,
  Pasanaco,
  PasanacoPayment,
  pasanacoService,
} from "../../services/pasanacoService";
import { ParticipantsList } from "./ParticipantsList";

interface Props {
  pasanaco: Pasanaco;
  participants: Participant[];
  payments: PasanacoPayment[];
  onRefresh: () => void;
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

export function PasanacoDetail({
  pasanaco,
  participants,
  payments,
  onRefresh,
}: Props) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [advanceWithLoans, setAdvanceWithLoans] = useState(false);

  // Calculamos el mes/año actual del pasanaco (turno actual)
  const { month, year } = getCurrentGameMonth(
    pasanaco.startMonth,
    pasanaco.startYear,
    pasanaco.currentRound
  );

  // Enriquecemos participantes con su pago (igual que antes)
  const enriched = participants.map((p) => ({
    ...p,
    payment: payments.find((pay) => pay.participantId === p.id) ?? null,
  }));

  const currentRecipient = enriched.find(
    (p) => p.assignedNumber === pasanaco.currentRound
  );

  // Lista de números ya usados
  const usedNumbers = useMemo(
    () => participants.map((p) => Number(p.assignedNumber)),
    [participants]
  );

  const totalAllowed = pasanaco.totalParticipants;
  const paidCount = payments.filter((payment) => payment.paid).length;
  const pendingCount = Math.max(0, participants.length - paidCount);
  const roundProgress = Math.min(100, Math.max(0, (pasanaco.currentRound / totalAllowed) * 100));

  // Calcula el mes/año correspondiente al número escrito en el input
  const assignedMonthYear = useMemo(() => {
    const n = Number(number);
    if (!n || isNaN(n)) return null;
    const res = getCurrentGameMonth(pasanaco.startMonth, pasanaco.startYear, n);
    if (isNaN(res.month) || isNaN(res.year)) return null;
    return res;
  }, [number, pasanaco.startMonth, pasanaco.startYear]);

  const formattedAssignedMonth = assignedMonthYear
    ? formatMonthYear(assignedMonthYear.month, assignedMonthYear.year)
    : "—";

  const handleAddParticipant = async () => {
    const n = Number(number);

    // Validaciones front
    if (!name.trim() || !number) {
      return alert("Completa todos los campos");
    }

    if (participants.length >= totalAllowed) {
      return alert(`No puedes añadir más participantes. Máximo: ${totalAllowed}`);
    }

    if (!Number.isInteger(n) || n < 1 || n > totalAllowed) {
      return alert(`El número asignado debe ser un entero entre 1 y ${totalAllowed}`);
    }

    if (usedNumbers.includes(n)) {
      return alert(`El número ${n} ya está asignado a otro participante`);
    }

    setAdding(true);
    try {
      await pasanacoService.addParticipant(pasanaco.id, {
        name,
        assignedNumber: n,
      });
      setName("");
      setNumber("");
      // tras creación, refrescamos todo (lista + detalle)
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data || "Error al añadir participante");
    } finally {
      setAdding(false);
    }
  };

  const handleAdvance = async () => {
    const confirmed = confirm(
      advanceWithLoans
        ? "Avanzar al siguiente turno y generar préstamos para impagos?"
        : "Avanzar al siguiente turno?"
    );
    if (!confirmed) return;
    try {
      await pasanacoService.advance(pasanaco.id, advanceWithLoans);
      alert("Ronda avanzada correctamente");
      await onRefresh();
    } catch (err: any) {
      alert(err?.response?.data || "No se pudo avanzar: verifica los pagos");
      console.error("Error al avanzar ronda:", err);
    }
  };

  const handleRetreat = async () => {
    const confirmed = confirm("¿Ir al turno anterior?");
    if (!confirmed) return;
    try {
      await pasanacoService.retreat(pasanaco.id);
      alert("Ronda retrocedida");
      await onRefresh();
    } catch (err: any) {
      alert(err?.response?.data || "No se pudo retroceder");
      console.error("Error al retroceder ronda:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen superior */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-gradient-to-r from-primary/[0.08] to-transparent p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Ronda en curso</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{pasanaco.name}</h2>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CircleDollarSign className="h-4 w-4" />{pasanaco.monthlyAmount} € / mes</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{participants.length}/{pasanaco.totalParticipants}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatMonthYear(month, year)}</span>
            </div>
          </div>

          <div className="rounded-xl border bg-card/80 px-5 py-3 text-center shadow-sm">
            <div className="text-xs text-muted-foreground">Recibe este mes</div>
            <div className="mt-1 text-xl font-semibold text-primary">{currentRecipient?.name ?? "Sin asignar"}</div>
            <div className="text-xs text-muted-foreground">Turno #{pasanaco.currentRound}</div>
          </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>Progreso del ciclo</span><span>{roundProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${roundProgress}%` }} /></div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div className="rounded-lg bg-positive-soft p-3"><div className="text-xs text-positive">Pagados</div><div className="mt-1 text-xl font-semibold text-positive">{paidCount}</div></div>
            <div className="rounded-lg bg-warning-soft p-3"><div className="text-xs text-warning">Pendientes</div><div className="mt-1 text-xl font-semibold text-warning">{pendingCount}</div></div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button onClick={handleRetreat} variant="outline" size="sm"><ArrowLeft /> Anterior</Button>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
              <input type="checkbox" checked={advanceWithLoans} onChange={(e) => setAdvanceWithLoans(e.target.checked)} />
              Crear préstamos por impagos
            </label>
            <Button onClick={handleAdvance} size="sm">Avanzar <ArrowRight /></Button>
          </div>
        </div>
      </div>

      {/* Añadir participante: solo si faltan participantes */}
      {participants.length < totalAllowed ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-1 font-semibold text-card-foreground">Añadir participante</h3>
          <p className="mb-4 text-sm text-muted-foreground">Asigna su posición y verás automáticamente el mes en que recibirá.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Número asignado</label>
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={`Número (1..${totalAllowed})`}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="text-xs text-muted-foreground mt-1">Mes: {formattedAssignedMonth}</div>
            </div>
            <div className="flex gap-2">
              <Button disabled={adding} onClick={handleAddParticipant} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4">
                {adding ? "Añadiendo..." : "Añadir participante"}
              </Button>
              <div className="text-sm text-muted-foreground self-center">{participants.length}/{totalAllowed}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-warning-soft rounded-xl border">
          <div className="text-sm text-card-foreground">Todos los participantes están añadidos.</div>
        </div>
      )}

      {/* Lista unificada: participantes + histórico (scrollable) */}
      <div className="p-4 rounded-xl border bg-card shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-card-foreground">Participantes</h3>
            <p className="text-sm text-muted-foreground">Estado de aportaciones del turno actual</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{participants.length} personas</span>
        </div>
        <ParticipantsList
          participants={enriched}
          payments={payments}
          onRefresh={onRefresh}
          startMonth={pasanaco.startMonth}
          startYear={pasanaco.startYear}
          totalRounds={pasanaco.totalParticipants}
          pasanacoId={pasanaco.id}
          monthlyAmount={pasanaco.monthlyAmount}
        />
      </div>
    </div>
  );
}

// Reutilizamos la lógica del mes actual
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