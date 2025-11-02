import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { IncomesService } from '../../services/incomesService';
import {
    FixedIncome,
    IncomeTab,
    TemporaryIncome,
    VariableIncome,
} from './income.types';
import { getInitialFormData } from './income.utils';
import { IncomeList } from './IncomeList';
import { IncomeModal } from './IncomeModal';
import { IncomeTabs } from './IncomeTabs';

export default function IncomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<IncomeTab>('fixed');
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
  const [variableIncomes, setVariableIncomes] = useState<VariableIncome[]>([]);
  const [temporaryIncomes, setTemporaryIncomes] = useState<TemporaryIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await IncomesService.getAll();

      setFixedIncomes(data.filter((i: any) => i.type === 'Fixed'));
      setVariableIncomes(data.filter((i: any) => i.type === 'Variable'));
      setTemporaryIncomes(data.filter((i: any) => i.type === 'Temporary'));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      amount: parseFloat(formData.amount),
      description: formData.name, // el backend espera description
      date: formData.date || new Date().toISOString(),
      type:
        activeTab === 'fixed'
          ? 'Fixed'
          : activeTab === 'variable'
          ? 'Variable'
          : 'Temporary',
    };

    try {
      if (editingId) {
        await IncomesService.update(parseInt(editingId), payload);
      } else {
        await IncomesService.create(payload);
      }

      setShowModal(false);
      setEditingId(null);
      setFormData(getInitialFormData());
      loadData();
    } catch (error) {
      console.error('Error saving income:', error);
    }
  };

  const handleEdit = (item: FixedIncome | VariableIncome | TemporaryIncome) => {
    setEditingId(item.id);
    setFormData({
      ...formData,
      name: (item as any).description || (item as any).name,
      amount: item.amount.toString(),
      date: (item as any).date,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este ingreso?')) return;
    try {
      await IncomesService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting income:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(getInitialFormData());
  };

  const getCurrentList = () => {
    if (activeTab === 'fixed') return fixedIncomes;
    if (activeTab === 'variable') return variableIncomes;
    return temporaryIncomes;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Ingresos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Ingreso
        </button>
      </div>

      <IncomeTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando ingresos...</div>
        ) : (
          <IncomeList
            activeTab={activeTab}
            items={getCurrentList()}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      <IncomeModal
        activeTab={activeTab}
        showModal={showModal}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
