import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { useThemePreference, type ThemePreference } from "../../lib/theme";

const options: { value: ThemePreference; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "light", label: "Claro", hint: "Fondo blanco, ideal de día.", icon: Sun },
  { value: "dark", label: "Oscuro", hint: "Fondo oscuro, cansa menos la vista de noche.", icon: Moon },
  { value: "system", label: "Como el sistema", hint: "Usa lo mismo que tu PC o tu móvil.", icon: Monitor },
];

export default function ThemePicker() {
  const [preference, setPreference] = useThemePreference();

  return (
    <div role="radiogroup" aria-label="Tema de la app" className="grid gap-3 sm:grid-cols-3">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = option.value === preference;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(option.value)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent",
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
