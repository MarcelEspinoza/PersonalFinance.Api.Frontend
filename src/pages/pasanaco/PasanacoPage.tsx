import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Participant,
  Pasanaco,
  PasanacoPayment,
  pasanacoService,
} from "../../services/pasanacoService";
import { PasanacoDetail } from "./PasanacoDetail";
import { PasanacoList } from "./PasanacoList";
import { PasanacoModal } from "./PasanacoModal";

export function PasanacoPage() {
  const { user } = useAuth();
  const [pasanacos, setPasanacos] = useState<Pasanaco[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<PasanacoPayment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!selectedId) return;
    const pasanaco = pasanacos.find((p) => p.id === selectedId);
    if (!pasanaco) return;

    const { month, year } = getCurrentGameMonth(
      pasanaco.startMonth,
      pasanaco.startYear,
      pasanaco.currentRound
    );

    if (isNaN(month) || isNaN(year)) {
      console.warn("Mes o año inválido para pagos");
      return;
    }

    try {
      const [partRes, payRes] = await Promise.all([
        pasanacoService.getParticipants(selectedId),
        pasanacoService.getPayments(selectedId, month, year),
      ]);
      setParticipants(partRes.data);
      setPayments(payRes.data);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    }
  };


  const loadPasanacos = async () => {
    setLoading(true);
    try {
      const { data } = await pasanacoService.getAll();
      setPasanacos(data);
    } catch (err) {
      console.error("Error al cargar pasanacos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este pasanaco?")) return;
    try {
      await pasanacoService.remove(id);
      setPasanacos((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  useEffect(() => {
    if (user) loadPasanacos();
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [selectedId, pasanacos]);

  const selected = pasanacos.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Pasanaco</h1>
        <PasanacoModal onCreated={loadPasanacos} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-bold mb-2">Mis Pasanacos</h2>
          <PasanacoList
            pasanacos={pasanacos}
            selectedPasanaco={selectedId}
            loading={loading}
            onSelect={setSelectedId}
            onDelete={handleDelete}
          />
        </div>

        {selected && (
          <div>
            <PasanacoDetail
              pasanaco={selected}
              participants={participants}
              payments={payments}
              onRefresh={loadAll}
            />
          </div>
        )}
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


