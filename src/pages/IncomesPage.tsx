import { Calendar, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { IncomesService } from '../services/incomesService';

interface FixedIncome {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

interface VariableIncome {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
}

export function IncomesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'fixed' | 'variable'>('fixed');
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
  const [variableIncomes, setVariableIncomes] = useState<VariableIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    date: new Date().toISOString().split('T')[0],
    category: 'salary',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'fixed') {
        const { data } = await IncomesService.getFixed(user!.id);
        setFixedIncomes(data || []);
      } else {
        const { data } = await IncomesService.getVariable(user!.id);
        setVariableIncomes(data || []);
      }      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (activeTab === 'fixed') {
        const data = {
          user_id: user!.id,
          name: formData.name,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          start_date: formData.start_date,
          is_active: true,
        };

        if (editingId) {
          await IncomesService.updateFixed(editingId, data);
        } else {
          await IncomesService.createFixed(data);
        }
      } else {
        const data = {
          user_id: user!.id,
          name: formData.name,
          amount: parseFloat(formData.amount),
          date: formData.date,
          category: formData.category,
          notes: formData.notes || null,
        };

        if (editingId) {
          await IncomesService.updateVariable(editingId, data);
        } else {
          await IncomesService.createVariable(data);
        }
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleEdit = (item: FixedIncome | VariableIncome) => {
    setEditingId(item.id);
    if (activeTab === 'fixed') {
      const fixed = item as FixedIncome;
      setFormData({
        ...formData,
        name: fixed.name,
        amount: fixed.amount.toString(),
        frequency: fixed.frequency,
        start_date: fixed.start_date,
      });
    } else {
      const variable = item as VariableIncome;
      setFormData({
        ...formData,
        name: variable.name,
        amount: variable.amount.toString(),
        date: variable.date,
        category: variable.category,
        notes: variable.notes || '',
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ingreso?')) return;

    try {
      if (activeTab === 'fixed') {
        await IncomesService.deleteFixed(id);
      } else {
        await IncomesService.deleteVariable(id);
      }
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0],
      category: 'salary',
      notes: '',
    });
  };

  const openModal = () => {
    resetForm();
    setEditingId(null);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Ingresos</h1>
        <button
          onClick={openModal}
          className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Ingreso
        </button>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('fixed')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'fixed'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Ingresos Fijos
        </button>
        <button
          onClick={() => setActiveTab('variable')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'variable'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Ingresos Variables
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {activeTab === 'fixed' ? (
          <div className="divide-y divide-slate-200">
            {fixedIncomes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay ingresos fijos registrados
              </div>
            ) : (
              fixedIncomes.map((income) => (
                <div key={income.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{income.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <span className="capitalize">{income.frequency}</span>
                        <span>•</span>
                        <span>Desde {new Date(income.start_date).toLocaleDateString('es-ES')}</span>
                        {!income.is_active && (
                          <>
                            <span>•</span>
                            <span className="text-red-500">Inactivo</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-xl font-bold text-green-600">
                        {income.amount.toFixed(2)} €
                      </p>
                      <button
                        onClick={() => handleEdit(income)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {variableIncomes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay ingresos variables registrados
              </div>
            ) : (
              variableIncomes.map((income) => (
                <div key={income.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{income.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(income.date).toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span className="capitalize">{income.category}</span>
                      </div>
                      {income.notes && (
                        <p className="text-sm text-slate-600 mt-1">{income.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-xl font-bold text-green-600">
                        {income.amount.toFixed(2)} €
                      </p>
                      <button
                        onClick={() => handleEdit(income)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingId ? 'Editar' : 'Nuevo'} Ingreso {activeTab === 'fixed' ? 'Fijo' : 'Variable'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej: Salario mensual"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              {activeTab === 'fixed' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Frecuencia
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quincenal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Categoría
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="salary">Salario</option>
                      <option value="commission">Comisión</option>
                      <option value="bonus">Bonus</option>
                      <option value="sales">Ventas</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Detalles adicionales..."
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
                >
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
