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

  // Carga la lista de pasanacos y devuelve los datos (para uso por callers)
  const loadPasanacos = async (): Promise<Pasanaco[]> => {
    setLoading(true);
    try {
      const { data } = await pasanacoService.getAll();
      setPasanacos(data);
      return data;
    } catch (err) {
      console.error("Error al cargar pasanacos:", err);
      return [] as Pasanaco[];
    } finally {
      setLoading(false);
    }
  };

  // Recarga la lista y, si hay un seleccionado, recarga participantes y pagos del seleccionado.
  const refreshAll = async () => {
    const data = await loadPasanacos();
    if (!selectedId) {
      setParticipants([]);
      setPayments([]);
      return;
    }

    const pasanaco = data.find((p) => p.id === selectedId);
    if (!pasanaco) {
      setSelectedId(null);
      setParticipants([]);
      setPayments([]);
      return;
    }

    try {
      const { month, year } = getCurrentGameMonth(
        pasanaco.startMonth,
        pasanaco.startYear,
        pasanaco.currentRound
      );
      const [partRes, payRes] = await Promise.all([
        pasanacoService.getParticipants(selectedId),
        pasanacoService.getPayments(selectedId, month, year),
      ]);
      setParticipants(partRes.data);
      setPayments(payRes.data);
    } catch (err) {
      console.error("Error al cargar datos tras refresh:", err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!selectedId) {
      setParticipants([]);
      setPayments([]);
      return;
    }
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selected = pasanacos.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Pasanaco</h1>
        <PasanacoModal onCreated={loadPasanacos} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold mb-2">Mis Pasanacos</h2>
          <PasanacoList
            pasanacos={pasanacos}
            selectedPasanaco={selectedId}
            loading={loading}
            onSelect={setSelectedId}
            onDelete={handleDelete}
          />
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <PasanacoDetail
              pasanaco={selected}
              participants={participants}
              payments={payments}
              onRefresh={refreshAll}
            />
          ) : (
            <div className="p-6 bg-white rounded-2xl shadow-sm border text-slate-500">
              Selecciona un pasanaco para ver detalles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reutilizamos la lógica del mes actual
export function getCurrentGameMonth(
  startMonth: number,
  startYear: number,
  round: number
) {
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