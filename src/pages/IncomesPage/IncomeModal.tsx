import { X } from 'lucide-react';
import { IncomeTab } from './income.types';

interface Props {
  activeTab: IncomeTab;
  showModal: boolean;
  editingId: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function IncomeModal({
  activeTab,
  showModal,
  editingId,
  formData,
  setFormData,
  onClose,
  onSubmit,
}: Props) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {editingId ? 'Editar' : 'Nuevo'} Ingreso {activeTab === 'fixed' ? 'Fijo' : activeTab === 'variable' ? 'Variable' : 'Temporal'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Nombre" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} />
          <Input label="Cantidad" type="number" value={formData.amount} onChange={(v) => setFormData({ ...formData, amount: v })} />

          {activeTab === 'fixed' && (
            <>
              <Select
                label="Frecuencia"
                value={formData.frequency}
                onChange={(v) => setFormData({ ...formData, frequency: v })}
                options={['monthly', 'weekly', 'biweekly', 'yearly']}
              />
              <Input label="Fecha de inicio" type="date" value={formData.start_date} onChange={(v) => setFormData({ ...formData, start_date: v })} />
            </>
          )}

          {activeTab === 'variable' && (
            <>
              <Input label="Fecha" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
              <Select
                label="Categoría"
                value={formData.category}
                onChange={(v) => setFormData({ ...formData, category: v })}
                options={['salary', 'commission', 'bonus', 'sales', 'other']}
              />
              <Textarea label="Notas (opcional)" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} />
            </>
          )}

          {activeTab === 'temporary' && (
            <>
              <Select
                label="Frecuencia"
                value={formData.frequency}
                onChange={(v) => setFormData({ ...formData, frequency: v })}
                options={['monthly', 'weekly', 'biweekly', 'yearly']}
              />
              <Input label="Fecha de inicio" type="date" value={formData.start_date} onChange={(v) => setFormData({ ...formData, start_date: v })} />
              <Input label="Fecha de fin" type="date" value={formData.end_date} onChange={(v) => setFormData({ ...formData, end_date: v })} />
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition">
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
      />
    </div>
  );
}
