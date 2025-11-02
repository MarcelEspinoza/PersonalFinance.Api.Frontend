import { Calendar, Edit2, Trash2 } from 'lucide-react';
import { FixedIncome, IncomeTab, TemporaryIncome, VariableIncome } from './income.types';

interface Props {
  activeTab: IncomeTab;
  items: FixedIncome[] | VariableIncome[] | TemporaryIncome[];
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
}

export function IncomeList({ activeTab, items, onEdit, onDelete }: Props) {
  if (items.length === 0) {
    return <div className="p-8 text-center text-slate-500">No hay ingresos registrados</div>;
  }

  return (
    <div className="divide-y divide-slate-200">
      {items.map((income: any) => (
        <div key={income.id} className="p-4 hover:bg-slate-50 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">{income.name || income.description}</p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                {activeTab === 'fixed' && (
                  <>
                    <span className="capitalize">{income.frequency}</span>
                    <span>•</span>
                    <span>Desde {new Date(income.start_date).toLocaleDateString('es-ES')}</span>
                    {!income.is_active && <span className="text-red-500">• Inactivo</span>}
                  </>
                )}
                {activeTab === 'variable' && (
                  <>
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(income.date).toLocaleDateString('es-ES')}</span>
                    <span>•</span>
                    <span className="capitalize">{income.category}</span>
                  </>
                )}
                {activeTab === 'temporary' && (
                  <>
                    <span className="capitalize">{income.frequency}</span>
                    <span>•</span>
                    <span>{new Date(income.start_date).toLocaleDateString('es-ES')} → {new Date(income.end_date).toLocaleDateString('es-ES')}</span>
                  </>
                )}
              </div>
              {income.notes && <p className="text-sm text-slate-600 mt-1">{income.notes}</p>}
            </div>
            <div className="flex items-center space-x-4">
              <p className="text-xl font-bold text-green-600">{income.amount.toFixed(2)} €</p>
              <button onClick={() => onEdit(income)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <Edit2 className="w-4 h-4 text-slate-600" />
              </button>
              <button onClick={() => onDelete(income.id)} className="p-2 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
