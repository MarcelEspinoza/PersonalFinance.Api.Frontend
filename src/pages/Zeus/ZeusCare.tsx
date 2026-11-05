import { useState, type FormEvent } from "react";
import { ArrowUpRight, Heart, Link2, Loader2, Moon, Pencil, Plus, Trash2, Unlink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { chatErrorMessage } from "../../services/chatService";
import {
  ZeusService, careProviderName, daycareNightPrice, duration, timeRangeMinutes,
  type ZeusCareKind, type ZeusCareProvider, type ZeusCareStay, type ZeusSummary,
} from "../../services/zeusService";
import { money, shortDate, today } from "../../utils/civilDate";
import { FormError } from "./ZeusForms";

const fieldClass = "flex flex-col gap-1.5 text-sm font-medium";
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm font-normal";

export function ZeusCareDialog({ provider, stay, onClose, onSaved }: {
  provider: ZeusCareProvider;
  stay: ZeusCareStay | null;
  onClose: () => void;
  onSaved: (summary: ZeusSummary) => void;
}) {
  const [id] = useState(() => stay?.id ?? crypto.randomUUID());
  const [kind, setKind] = useState<ZeusCareKind>(stay?.kind ?? (provider === "daycare" ? "night" : "day"));
  const [date, setDate] = useState(stay?.date ?? today());
  const [startTime, setStartTime] = useState(stay?.startTime?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(stay?.endTime?.slice(0, 5) ?? "");
  const [nights, setNights] = useState(String(stay?.nights || 1));
  const [fourHourPrice, setFourHourPrice] = useState(stay && stay.kind === "day"
    && timeRangeMinutes(stay.startTime ?? "", stay.endTime ?? "") === 240 ? String(stay.amount) : "");
  const [agreedPrice, setAgreedPrice] = useState<string | null>(stay ? String(stay.amount) : null);
  const [note, setNote] = useState(stay?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minutes = timeRangeMinutes(startTime, endTime);
  const nightCount = Number(nights);
  const validNights = Number.isInteger(nightCount) && nightCount >= 1 && nightCount <= 365;
  const suggestedPrice = kind === "night"
    ? validNights ? provider === "daycare" ? daycareNightPrice(nightCount) : nightCount * 30 : null
    : minutes > 0 ? minutes < 240 ? 20 : minutes > 240 ? 25 : fourHourPrice ? Number(fourHourPrice) : null : null;
  const price = agreedPrice ?? (suggestedPrice === null ? "" : String(suggestedPrice));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (kind === "day" && (minutes <= 0 || minutes >= 1440)) {
      setError("La salida debe ser posterior a la entrada en el mismo día.");
      return;
    }
    if (kind === "day" && minutes === 240 && !fourHourPrice) {
      setError("Elige si las cuatro horas exactas cuestan 20 € o 25 €.");
      return;
    }
    if (kind === "night" && !validNights) {
      setError("Indica entre 1 y 365 noches.");
      return;
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      setError("Indica el precio acordado de esta estancia.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      onSaved(await ZeusService.saveCare({
        id, provider, kind, date, startTime: kind === "day" ? `${startTime}:00` : null,
        endTime: kind === "day" ? `${endTime}:00` : null,
        nights: kind === "night" ? nightCount : 0, amount: Number(price), note: note || null,
      }, !!stay));
    } catch (err) {
      setError(chatErrorMessage(err, "No se pudo guardar la estancia."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stay ? "Corregir estancia" : "Registrar estancia"} · {careProviderName(provider)}</DialogTitle>
          <DialogDescription>Se registra aparte: no descuenta horas de los bonos ni crea un gasto. Después puedes vincular su pago.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="space-y-4">
            {provider === "alessia" && <label className={fieldClass}>Tipo de cuidado
              <select aria-label="Tipo de cuidado" className={selectClass} value={kind} onChange={event => {
                setKind(event.target.value === "night" ? "night" : "day"); setAgreedPrice(null);
              }}>
                <option value="day">Por horas · de día</option>
                <option value="night">Por noches · 30 € por noche</option>
              </select>
            </label>}
            <label className={fieldClass}>{kind === "night" ? "Primera noche" : "Día del cuidado"}
              <Input type="date" min="2000-01-01" max={today()} value={date} onChange={event => setDate(event.target.value)} required />
            </label>
            {kind === "night" ? (
              <>
                <label className={fieldClass}>Número de noches
                  <Input type="number" min="1" max="365" step="1" value={nights}
                    onChange={event => { setNights(event.target.value); setAgreedPrice(null); }} required />
                </label>
                <p className="text-sm text-muted-foreground">{provider === "daycare"
                  ? "De 21:00 a 09:00. 1 noche: 28 € · 2: 52 € · 3: 75 € · 4: 96 € · 5: 115 € · desde 6: 21 €/noche. Sin descuento."
                  : "30 € por noche. No utiliza los bonos de la guardería."}</p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className={fieldClass}>Hora de entrada
                    <Input type="time" step="60" value={startTime} onChange={event => {
                      setStartTime(event.target.value); setAgreedPrice(null); setFourHourPrice("");
                    }} required />
                  </label>
                  <label className={fieldClass}>Hora de salida
                    <Input type="time" step="60" value={endTime} onChange={event => {
                      setEndTime(event.target.value); setAgreedPrice(null); setFourHourPrice("");
                    }} required />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">Menos de 4 h: 20 € · Más de 4 h: 25 €.</p>
                {minutes === 240 && <label className={fieldClass}>Precio para las 4 horas exactas
                  <select aria-label="Precio para las 4 horas exactas" className={selectClass} value={fourHourPrice} onChange={event => {
                    setFourHourPrice(event.target.value); setAgreedPrice(null);
                  }} required>
                    <option value="">Elige el precio acordado</option>
                    <option value="20">20 €</option>
                    <option value="25">25 €</option>
                  </select>
                </label>}
              </>
            )}
            <div aria-live="polite" className="rounded-lg bg-violet-50 p-4 text-sm text-violet-900 dark:bg-violet-950 dark:text-violet-100">
              {suggestedPrice === null ? "Completa la estancia para calcular su precio."
                : <>{kind === "night" ? `${nightCount} ${nightCount === 1 ? "noche" : "noches"}` : duration(minutes)} · Tarifa: <strong>{money(suggestedPrice)}</strong></>}
            </div>
            <label className={fieldClass}>Precio acordado (€)
              <Input type="number" min="0.01" max="999999999" step="0.01" value={price} onChange={event => setAgreedPrice(event.target.value)} required />
              <span className="text-xs font-normal text-muted-foreground">Puedes ajustar el importe si te cobran algo distinto o hay un suplemento.</span>
            </label>
            <label className={fieldClass}>Nota (opcional)
              <Input maxLength={300} value={note} onChange={event => setNote(event.target.value)} placeholder="Por ejemplo: se quedó a dormir" />
            </label>
            <FormError message={error} />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar estancia</Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ZeusCareSection({ provider, stays, month, busy, onAdd, onEdit, onRemove, onUnlink, onPay }: {
  provider: ZeusCareProvider;
  stays: ZeusCareStay[];
  month: string;
  busy: boolean;
  onAdd: () => void;
  onEdit: (stay: ZeusCareStay) => void;
  onRemove: (stay: ZeusCareStay) => void;
  onUnlink: (stay: ZeusCareStay) => void;
  onPay: (stays: ZeusCareStay[]) => void;
}) {
  const ownStays = stays.filter(stay => stay.provider === provider);
  const visible = ownStays.filter(stay => stay.date.startsWith(month));
  const pending = ownStays.filter(stay => !stay.expense);
  const total = visible.reduce((sum, stay) => sum + stay.amount, 0);
  const linked = visible.filter(stay => stay.expense).reduce((sum, stay) => sum + stay.amount, 0);
  const Icon = provider === "daycare" ? Moon : Heart;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Icon className="h-5 w-5 text-violet-600" />{provider === "daycare" ? "Sus noches en la guardería" : "Con Alessia, su niñera"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{provider === "daycare"
            ? "Se pagan aparte y no consumen el bono de horas."
            : "Menos de 4 h: 20 € · Más de 4 h: 25 € · Noche: 30 €. Sin mezclar con la guardería."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pending.length > 0 && <Button variant="outline" disabled={busy} onClick={() => onPay(pending)}><Link2 className="mr-2 h-4 w-4" />Vincular pago</Button>}
          <Button disabled={busy} onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{provider === "daycare" ? "Registrar noches" : "Registrar cuidado"}</Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Registrado este mes", amount: total }, { label: "Con pago vinculado", amount: linked }, { label: "Sin pago vinculado", amount: total - linked }].map(({ label, amount }) => (
          <Card key={label} className="px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{money(amount)}</p></Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        {visible.length === 0 ? <div className="space-y-2 p-8 text-center text-sm text-muted-foreground">
          <Icon className="mx-auto h-8 w-8 text-violet-500" /><p>No hay estancias registradas este mes.</p>
        </div> : <ul className="divide-y">
          {visible.map(stay => <li key={stay.id} className="space-y-3 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <strong>{shortDate(stay.date)}</strong>
                  <span className="text-sm text-muted-foreground">{stay.kind === "night"
                    ? `${stay.nights} ${stay.nights === 1 ? "noche" : "noches"}`
                    : `${stay.startTime?.slice(0, 5)}–${stay.endTime?.slice(0, 5)}`}</span>
                  <strong className="text-violet-700 dark:text-violet-300">{money(stay.amount)}</strong>
                </p>
                {stay.note && <p className="mt-1 break-words text-sm text-muted-foreground">{stay.note}</p>}
                <p className={`mt-2 text-xs ${stay.expense ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground"}`}>{stay.expense ? "Pago vinculado" : "Sin pago vinculado"}</p>
              </div>
              <div className="flex gap-1">
                {stay.expense ? <Button variant="ghost" size="icon" aria-label={`Desvincular pago del ${shortDate(stay.date)}`}
                  disabled={busy} onClick={() => onUnlink(stay)}><Unlink className="h-4 w-4" /></Button>
                  : <Button variant="ghost" size="icon" aria-label={`Corregir estancia del ${shortDate(stay.date)}`}
                    disabled={busy} onClick={() => onEdit(stay)}><Pencil className="h-4 w-4" /></Button>}
                <Button variant="ghost" size="icon" aria-label={`Borrar estancia del ${shortDate(stay.date)}`}
                  disabled={busy} onClick={() => onRemove(stay)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            {stay.expense && <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
              <Link className="inline-flex items-center gap-1 text-primary hover:underline"
                to={`/ledger?year=${stay.expense.date.slice(0, 4)}&month=${Number(stay.expense.date.slice(5, 7))}`}>
                Ver pago · {money(stay.expense.amount)} · {stay.expense.accountName}<ArrowUpRight className="h-3 w-3" />
              </Link>
              <p>{money(stay.amount)} asignados a esta estancia; {money(stay.expense.amount - (stay.expense.allocatedAmount ?? 0))} del pago aún sin asignar.</p>
            </div>}
          </li>)}
        </ul>}
      </Card>
    </section>
  );
}
