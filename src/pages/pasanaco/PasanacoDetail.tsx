import { useMemo, useState } from "react";
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
      <div className="p-4 bg-white rounded-2xl shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{pasanaco.name}</h2>
            <div className="text-sm text-slate-600 mt-1">
              <span className="mr-3">Monto mensual: <strong>{pasanaco.monthlyAmount}€</strong></span>
              <span className="mr-3">Participantes: <strong>{participants.length}/{pasanaco.totalParticipants}</strong></span>
              <span className="mr-3">Turno: <strong>{pasanaco.currentRound}</strong></span>
            </div>
            <div className="mt-2 text-sm text-slate-500">Mes actual: <strong>{formatMonthYear(month, year)}</strong></div>
          </div>

          <div className="flex items-center gap-3">          
            <div className="text-center">
              <div className="text-xs text-slate-500">Destinatario actual</div>
              <div className="mt-1 inline-flex items-center gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-800 leading-tight">
                    {currentRecipient?.name ?? "—"}
                  </div>
                  <div className="text-sm text-slate-500">Nº {pasanaco.currentRound}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleRetreat} className="bg-gray-100 text-slate-800 hover:bg-gray-200 px-3 py-2">
                Anterior
              </Button>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={advanceWithLoans} onChange={(e) => setAdvanceWithLoans(e.target.checked)} />
                  Generar préstamos
                </label>
                <Button onClick={handleAdvance} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2">
                  Avanzar ronda
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Añadir participante: solo si faltan participantes */}
      {participants.length < totalAllowed ? (
        <div className="p-4 bg-white rounded-2xl shadow-sm border">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Añadir participante</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Número asignado</label>
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={`Número (1..${totalAllowed})`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <div className="text-xs text-slate-400 mt-1">Mes: {formattedAssignedMonth}</div>
            </div>
            <div className="flex gap-2">
              <Button disabled={adding} onClick={handleAddParticipant} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4">
                {adding ? "Añadiendo..." : "Añadir participante"}
              </Button>
              <div className="text-sm text-slate-500 self-center">{participants.length}/{totalAllowed}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 rounded-2xl border">
          <div className="text-sm text-slate-700">Todos los participantes están añadidos.</div>
        </div>
      )}

      {/* Lista unificada: participantes + histórico (scrollable) */}
      <div className="p-4 bg-white rounded-2xl shadow-sm border">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Participantes y historial (mes actual)</h3>
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