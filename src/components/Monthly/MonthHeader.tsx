import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  monthName: string;
  onChangeMonth: (delta: number) => void;
  onToday: () => void;
}

export function MonthHeader({ onChangeMonth, onToday }: Props) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" onClick={() => onChangeMonth(-1)} aria-label="Mes anterior">
        <ChevronLeft />
      </Button>
      <Button type="button" variant="outline" onClick={onToday}>
        Hoy
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={() => onChangeMonth(1)} aria-label="Mes siguiente">
        <ChevronRight />
      </Button>
    </div>
  );
}
