interface Props {
  activeTab: "fixed" | "variable" | "temporary";
  setActiveTab: (tab: "fixed" | "variable" | "temporary") => void;
  mode: "income" | "expense";
}

export function TransactionTabs({ activeTab, setActiveTab, mode }: Props) {
  return (
    <div className="flex space-x-2 border-b border-slate-200">
      {["fixed", "variable", "temporary"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab as any)}
          className={`px-6 py-3 font-medium transition ${
            activeTab === tab
              ? mode === "income"
                ? "text-emerald-600 border-b-2 border-emerald-600"
                : "text-red-600 border-b-2 border-red-600"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          {tab === "fixed"
            ? mode === "income"
              ? "Ingresos Fijos"
              : "Gastos Fijos"
            : tab === "variable"
            ? mode === "income"
              ? "Ingresos Variables"
              : "Gastos Variables"
            : mode === "income"
            ? "Ingresos Temporales"
            : "Movimientos Temporales"}
        </button>
      ))}
    </div>
  );
}
