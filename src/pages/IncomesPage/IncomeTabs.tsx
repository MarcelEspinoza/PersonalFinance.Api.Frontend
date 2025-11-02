import { IncomeTab } from './income.types';

interface Props {
  activeTab: IncomeTab;
  setActiveTab: (tab: IncomeTab) => void;
}

export function IncomeTabs({ activeTab, setActiveTab }: Props) {
  return (
    <div className="flex space-x-2 border-b border-slate-200">
      {['fixed', 'variable', 'temporary'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab as IncomeTab)}
          className={`px-6 py-3 font-medium transition ${
            activeTab === tab ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          {tab === 'fixed' ? 'Ingresos Fijos' : tab === 'variable' ? 'Ingresos Variables' : 'Ingresos Temporales'}
        </button>
      ))}
    </div>
  );
}
