import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Participant, Pasanaco, PasanacoPayment, pasanacoService } from "../../services/pasanacoService";
import { ParticipantsList } from "./ParticipantsList";
import { PaymentHistoryTable } from "./PaymentHistoryTable";

interface Props {
  pasanaco: Pasanaco;
  participants: Participant[];
  payments: PasanacoPayment[];
  onRefresh: () => void;
}

export function PasanacoDetail({ pasanaco, participants, payments, onRefresh }: Props) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const { month, year } = getCurrentGameMonth(pasanaco.startMonth, pasanaco.startYear, pasanaco.currentRound);

  const enriched = participants.map((p) => ({
    ...p,
    payment: payments.find((pay) => pay.participantId === p.id),
  }));

  const currentRecipient = enriched.find((p) => p.assignedNumber === pasanaco.currentRound);

  const handleAddParticipant = async () => {
    if (!name.trim() || number === null) return alert("Completa todos los campos");
    setAdding(true);
    try {
      await pasanacoService.addParticipant(pasanaco.id, {
        name,
        assignedNumber: Number(number),
      });
      setName("");
      setNumber("");
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleGeneratePayments = async () => {
    await pasanacoService.generatePaymentsForMonth(pasanaco.id, month, year);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">{pasanaco.name}</h2>
      <p className="text-sm text-slate-600">
        Turno actual: <strong>{currentRecipient?.name ?? "—"}</strong> (Nº {pasanaco.currentRound})
      </p>
      <p className="text-sm text-slate-500">Mes actual: {month}/{year}</p>

      <div className="space-y-2">
        <h3 className="font-semibold text-slate-700">Añadir participante</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Número asignado"
            />
        </div>
        <Button disabled={adding} onClick={handleAddParticipant} className="bg-emerald-500 hover:bg-emerald-600">
          {adding ? "Añadiendo..." : "Añadir"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-slate-700">Participantes</h3>
        <ParticipantsList participants={enriched} onRefresh={onRefresh} />

      </div>

        <div className="space-y-2">
        <h3 className="font-semibold text-slate-700">Historial de pagos</h3>
        <PaymentHistoryTable
            participants={participants}
            payments={payments}
            startMonth={pasanaco.startMonth}
            startYear={pasanaco.startYear}
            totalRounds={pasanaco.totalParticipants}
        />
        </div>

        <div className="space-y-2"></div>
      <div className="space-y-2">
        <h3 className="font-semibold text-slate-700">Acciones</h3>
        <div className="flex flex-col gap-2">
            <Button
            onClick={handleGeneratePayments}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            >
            Generar pagos del mes
            </Button>

            <Button
            onClick={async () => {
                const confirmed = confirm("¿Seguro que quieres avanzar al siguiente turno?");
                if (!confirmed) return;

                try {
                await pasanacoService.advanceRound(pasanaco.id);
                alert("Ronda avanzada correctamente");
                onRefresh();
                } catch (err: any) {
                alert(err?.response?.data || "No se pudo avanzar: verifica los pagos");
                console.error("Error al avanzar ronda:", err);
                }
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
            Avanzar ronda
            </Button>
        </div>
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


