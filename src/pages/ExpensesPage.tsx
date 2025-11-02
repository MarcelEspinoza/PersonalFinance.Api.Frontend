import { Calendar, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ExpensesService } from '../services/expensesService';

interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: string;
  due_date: number;
  is_active: boolean;
}

interface VariableExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
}

interface TemporaryMovement {
  id: string;
  name: string;
  amount: number;
  type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export function ExpensesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'fixed' | 'variable' | 'temporary'>('fixed');
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [temporaryMovements, setTemporaryMovements] = useState<TemporaryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'housing',
    frequency: 'monthly',
    due_date: '1',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    type: 'expense',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
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
        const { data } = await ExpensesService.getFixed(user!.id);
          setFixedExpenses(data || []);
      } else if (activeTab === 'variable') {
        const { data } = await ExpensesService.getVariable(user!.id);
        setVariableExpenses(data || []);
      } else {
        const { data } = await ExpensesService.getTemporary(user!.id);
        setTemporaryMovements(data || []);
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
          category: formData.category,
          frequency: formData.frequency,
          due_date: parseInt(formData.due_date),
          is_active: true,
        };

        if (editingId) {
          await ExpensesService.updateFixed(editingId, data);
        } else {
          await ExpensesService.createFixed(data);

        }
      } else if (activeTab === 'variable') {
        const data = {
          user_id: user!.id,
          name: formData.name,
          amount: parseFloat(formData.amount),
          date: formData.date,
          category: formData.category,
          notes: formData.notes || null,
        };

        if (editingId) {
          await ExpensesService.updateVariable(editingId, data);
        } else {
          await ExpensesService.createVariable(data);
        }
      } else {
        const data = {
          user_id: user!.id,
          name: formData.name,
          amount: parseFloat(formData.amount),
          type: formData.type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_active: true,
        };

        if (editingId) {
          await ExpensesService.updateTemporary(editingId, data);
        } else {
          await ExpensesService.createTemporary(data);
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

  const handleEdit = (item: FixedExpense | VariableExpense | TemporaryMovement) => {
    setEditingId(item.id);
    if (activeTab === 'fixed') {
      const fixed = item as FixedExpense;
      setFormData({
        ...formData,
        name: fixed.name,
        amount: fixed.amount.toString(),
        category: fixed.category,
        frequency: fixed.frequency,
        due_date: fixed.due_date.toString(),
      });
    } else if (activeTab === 'variable') {
      const variable = item as VariableExpense;
      setFormData({
        ...formData,
        name: variable.name,
        amount: variable.amount.toString(),
        date: variable.date,
        category: variable.category,
        notes: variable.notes || '',
      });
    } else {
      const temp = item as TemporaryMovement;
      setFormData({
        ...formData,
        name: temp.name,
        amount: temp.amount.toString(),
        type: temp.type,
        start_date: temp.start_date,
        end_date: temp.end_date,
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

    try {
      let table = '';
      if (activeTab === 'fixed') table = 'fixed_expenses';
      else if (activeTab === 'variable') table = 'variable_expenses';
      else table = 'temporary_movements';

      await ExpensesService.deleteFixed(id);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      category: 'housing',
      frequency: 'monthly',
      due_date: '1',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      type: 'expense',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
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
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Gastos</h1>
        <button
          onClick={openModal}
          className="flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Gasto
        </button>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('fixed')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'fixed'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Gastos Fijos
        </button>
        <button
          onClick={() => setActiveTab('variable')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'variable'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Gastos Variables
        </button>
        <button
          onClick={() => setActiveTab('temporary')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'temporary'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Movimientos Temporales
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {activeTab === 'fixed' && (
          <div className="divide-y divide-slate-200">
            {fixedExpenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay gastos fijos registrados
              </div>
            ) : (
              fixedExpenses.map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{expense.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <span className="capitalize">{expense.category}</span>
                        <span>•</span>
                        <span className="capitalize">{expense.frequency}</span>
                        <span>•</span>
                        <span>Día {expense.due_date}</span>
                        {!expense.is_active && (
                          <>
                            <span>•</span>
                            <span className="text-red-500">Inactivo</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-xl font-bold text-red-600">
                        {expense.amount.toFixed(2)} €
                      </p>
                      <button
                        onClick={() => handleEdit(expense)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
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

        {activeTab === 'variable' && (
          <div className="divide-y divide-slate-200">
            {variableExpenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay gastos variables registrados
              </div>
            ) : (
              variableExpenses.map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{expense.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(expense.date).toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span className="capitalize">{expense.category}</span>
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-slate-600 mt-1">{expense.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-xl font-bold text-red-600">
                        {expense.amount.toFixed(2)} €
                      </p>
                      <button
                        onClick={() => handleEdit(expense)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
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

        {activeTab === 'temporary' && (
          <div className="divide-y divide-slate-200">
            {temporaryMovements.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay movimientos temporales registrados
              </div>
            ) : (
              temporaryMovements.map((movement) => (
                <div key={movement.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{movement.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <span className="capitalize">{movement.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                        <span>•</span>
                        <span>{new Date(movement.start_date).toLocaleDateString('es-ES')} - {new Date(movement.end_date).toLocaleDateString('es-ES')}</span>
                        {!movement.is_active && (
                          <>
                            <span>•</span>
                            <span className="text-red-500">Inactivo</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className={`text-xl font-bold ${movement.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.amount.toFixed(2)} €
                      </p>
                      <button
                        onClick={() => handleEdit(movement)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(movement.id)}
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingId ? 'Editar' : 'Nuevo'}{' '}
                {activeTab === 'fixed' ? 'Gasto Fijo' : activeTab === 'variable' ? 'Gasto Variable' : 'Movimiento Temporal'}
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Ej: Alquiler"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              {activeTab === 'fixed' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Categoría
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="housing">Vivienda</option>
                      <option value="insurance">Seguros</option>
                      <option value="food">Comida</option>
                      <option value="pet">Mascota</option>
                      <option value="loans">Préstamos</option>
                      <option value="bills">Recibos</option>
                      <option value="rent">Alquiler</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Frecuencia
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quincenal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Día de vencimiento
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === 'variable' && (
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Categoría
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="leisure">Ocio</option>
                      <option value="shopping">Compras</option>
                      <option value="travel">Viajes</option>
                      <option value="restaurant">Restaurante</option>
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      placeholder="Detalles adicionales..."
                    />
                  </div>
                </>
              )}

              {activeTab === 'temporary' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="income">Ingreso</option>
                      <option value="expense">Gasto</option>
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha de fin
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
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
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
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
