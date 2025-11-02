import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
    Participant,
    Pasanaco,
    pasanacoService,
} from "../../services/pasanacoService";
import { ParticipantsList } from "./ParticipantsList";
import { PasanacoList } from "./PasanacoList";
import { PasanacoModal } from "./PasanacoModal";

export function PasanacoPage() {
  const { user } = useAuth();
  const [pasanacos, setPasanacos] = useState<Pasanaco[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedPasanaco, setSelectedPasanaco] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Cargar pasanacos del usuario
  const loadPasanacos = async () => {
    setLoading(true);
    try {
      const { data } = await pasanacoService.getAll();
      setPasanacos(data);
    } catch (error) {
      console.error("Error al cargar pasanacos:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Cargar participantes del pasanaco seleccionado
  const loadParticipants = async (id: string) => {
    try {
      const { data } = await pasanacoService.getParticipants(id);
      setParticipants(data);
    } catch (error) {
      console.error("Error al cargar participantes:", error);
    }
  };

  // 🔹 Eliminar un pasanaco
  const handleDeletePasanaco = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este pasanaco?")) return;
    try {
      await pasanacoService.remove(id);
      setPasanacos((prev) => prev.filter((p) => p.id !== id));
      if (selectedPasanaco === id) setSelectedPasanaco(null);
    } catch (error) {
      console.error("Error al eliminar pasanaco:", error);
    }
  };

  // 🔹 Efectos
  useEffect(() => {
    if (user) loadPasanacos();
  }, [user]);

  useEffect(() => {
    if (selectedPasanaco) loadParticipants(selectedPasanaco);
  }, [selectedPasanaco]);

  // 🔹 Render principal
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
            selectedPasanaco={selectedPasanaco}
            loading={loading}
            onSelect={setSelectedPasanaco}
            onDelete={handleDeletePasanaco}
          />
        </div>

        {selectedPasanaco && (
          <div>
            <h2 className="text-xl font-bold mb-2">Participantes</h2>
            <ParticipantsList participants={participants} />
          </div>
        )}
      </div>
    </div>
  );
}
