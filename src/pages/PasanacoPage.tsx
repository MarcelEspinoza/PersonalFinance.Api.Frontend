import { CheckCircle, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Participant,
  Pasanaco,
  pasanacoService,
} from "../services/pasanacoService";

export function PasanacoPage() {
  const { user } = useAuth();
  const [pasanacos, setPasanacos] = useState<Pasanaco[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedPasanaco, setSelectedPasanaco] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [pasanacoForm, setPasanacoForm] = useState({
    name: "",
    monthly_amount: "",
    total_participants: "",
    current_round: "1",
  });

  // Cargar lista de pasanacos al iniciar
  useEffect(() => {
    if (user) loadPasanacos();
  }, [user]);

  // Cargar participantes al seleccionar un pasanaco
  useEffect(() => {
    if (selectedPasanaco) loadParticipants(selectedPasanaco);
  }, [selectedPasanaco]);

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

  const loadParticipants = async (id: string) => {
    try {
      const { data } = await pasanacoService.getParticipants(id);
      setParticipants(data);
    } catch (error) {
      console.error("Error al cargar participantes:", error);
    }
  };

  const handleCreatePasanaco = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pasanacoService.create({
        name: pasanacoForm.name,
        monthly_amount: parseFloat(pasanacoForm.monthly_amount),
        total_participants: parseInt(pasanacoForm.total_participants),
        current_round: parseInt(pasanacoForm.current_round),
      });
      await loadPasanacos();
      setShowForm(false);
      setPasanacoForm({
        name: "",
        monthly_amount: "",
        total_participants: "",
        current_round: "1",
      });
    } catch (error) {
      console.error("Error al crear pasanaco:", error);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Pasanacos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5 mr-2" /> Nuevo Pasanaco
        </button>
      </div>

      {/* Lista de Pasanacos y Participantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda */}
        <div>
          <h2 className="text-xl font-bold mb-2">Mis Pasanacos</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : pasanacos.length === 0 ? (
            <p className="text-slate-500">No hay pasanacos</p>
          ) : (
            pasanacos.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPasanaco(p.id)}
                className={`p-4 border rounded-xl mb-2 cursor-pointer transition ${
                  selectedPasanaco === p.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <p className="text-sm text-slate-600">
                      {p.total_participants} participantes
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePasanaco(p.id);
                    }}
                    className="hover:bg-red-100 p-1 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Columna Derecha */}
        {selectedPasanaco && (
          <div>
            <h2 className="text-xl font-bold mb-2">Participantes</h2>
            {participants.length === 0 ? (
              <p className="text-slate-500">No hay participantes</p>
            ) : (
              participants.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 border rounded-xl mb-2 ${
                    p.has_received ? "bg-green-50 border-green-300" : "border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800">{p.name}</span>
                    {p.has_received ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <span className="text-slate-500 text-sm">Pendiente</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de Creación */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-md relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4 text-slate-800">Nuevo Pasanaco</h2>

            <form onSubmit={handleCreatePasanaco} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={pasanacoForm.name}
                  onChange={(e) =>
                    setPasanacoForm({ ...pasanacoForm, name: e.target.value })
                  }
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monto mensual (€)
                </label>
                <input
                  type="number"
                  value={pasanacoForm.monthly_amount}
                  onChange={(e) =>
                    setPasanacoForm({
                      ...pasanacoForm,
                      monthly_amount: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total de participantes
                </label>
                <input
                  type="number"
                  value={pasanacoForm.total_participants}
                  onChange={(e) =>
                    setPasanacoForm({
                      ...pasanacoForm,
                      total_participants: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
