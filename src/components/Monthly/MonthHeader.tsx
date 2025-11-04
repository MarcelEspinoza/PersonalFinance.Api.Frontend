import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  monthName: string;
  onChangeMonth: (delta: number) => void;
  onToday: () => void;
}

export function MonthHeader({ monthName, onChangeMonth, onToday }: Props) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold text-slate-800 capitalize">{monthName}</h1>
      <div className="flex items-center space-x-2">
        <button onClick={() => onChangeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          Hoy
        </button>
        <button onClick={() => onChangeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
