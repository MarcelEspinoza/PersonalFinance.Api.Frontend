interface Props {
  activeTab: "fixed" | "variable" | "temporary";
  setActiveTab: (tab: "fixed" | "variable" | "temporary") => void;
  mode: "income" | "expense";
}

export function TransactionTabs({ activeTab, setActiveTab, mode }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b">
      {["fixed", "variable", "temporary"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab as "fixed" | "variable" | "temporary")}
          className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === tab
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
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
