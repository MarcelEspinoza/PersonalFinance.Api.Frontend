import { useState, type FormEvent } from "react";
import { ArrowUpRight, CalendarDays, CheckCircle2, Heart, Link2, Loader2, Moon, Pencil, Plus, Trash2, Unlink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { chatErrorMessage } from "../../services/chatService";
import {
  ZeusService, careProviderName, careStayDescription, daycareNightPrice, duration, isCareForecast, isCarePaid, timeRangeMinutes,
  type ZeusCareKind, type ZeusCareProvider, type ZeusCareStay, type ZeusExpense, type ZeusSummary,
} from "../../services/zeusService";
import { money, monthLabel, shortDate, today } from "../../utils/civilDate";
import { FormError } from "./ZeusForms";

const fieldClass = "flex flex-col gap-1.5 text-sm font-medium";
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm font-normal";

export function ZeusCareDialog({ provider, stay, onClose, onSaved }: {
  provider: ZeusCareProvider;
  stay: ZeusCareStay | null;
  onClose: () => void;
  onSaved: (summary: ZeusSummary, id: string) => void;
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
  const suggestedPrice = kind === "cancellation" ? 10 : kind === "night"
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
      const summary = await ZeusService.saveCare({
        id, provider, kind, date, startTime: kind === "day" ? `${startTime}:00` : null,
        endTime: kind === "day" ? `${endTime}:00` : null,
        nights: kind === "night" ? nightCount : 0, amount: Number(price), note: note || null,
      }, !!stay);
      onSaved(summary, id);
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
          <DialogTitle>{kind === "cancellation" ? "Cargo por cancelación" : stay ? "Corregir estancia" : "Registrar estancia"} · {careProviderName(provider)}</DialogTitle>
          <DialogDescription>Puedes anotarlo antes de que llegue el día. No consume bonos; después eliges si vincular un pago o crear una previsión.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="space-y-4">
            {provider === "alessia" && <label className={fieldClass}>Tipo de cuidado
              <select aria-label="Tipo de cuidado" className={selectClass} value={kind} onChange={event => {
                setKind(event.target.value === "night" ? "night" : event.target.value === "cancellation" ? "cancellation" : "day"); setAgreedPrice(null);
              }}>
                <option value="day">Por horas · de día</option>
                <option value="night">Por noches · 30 € por noche</option>
                <option value="cancellation">Cancelación sin previo aviso · 10 €</option>
              </select>
            </label>}
            <label className={fieldClass}>{kind === "night" ? "Primera noche" : kind === "cancellation" ? "Día de la cancelación" : "Día del cuidado"}
              <Input type="date" min="2000-01-01" max="9998-12-31" value={date} onChange={event => setDate(event.target.value)} required />
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
            ) : kind === "day" ? (
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
            ) : <p className="text-sm text-muted-foreground">Cargo de 10 € por cancelar sin previo aviso. No cuenta como horas ni noches de cuidado.</p>}
            <div aria-live="polite" className="rounded-lg bg-violet-50 p-4 text-sm text-violet-900 dark:bg-violet-950 dark:text-violet-100">
              {suggestedPrice === null ? "Completa la estancia para calcular su precio."
                : <>{kind === "cancellation" ? "Cancelación" : kind === "night" ? `${nightCount} ${nightCount === 1 ? "noche" : "noches"}` : duration(minutes)} · Tarifa: <strong>{money(suggestedPrice)}</strong></>}
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
              <Button type="submit">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{!stay && provider === "alessia" ? "Guardar y elegir pago o previsión" : "Guardar estancia"}</Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ZeusCareSection({ provider, stays, month, busy, onAdd, onEdit, onRemove, onUnlink, onPay, onConfirm }: {
  provider: ZeusCareProvider;
  stays: ZeusCareStay[];
  month: string;
  busy: boolean;
  onAdd: () => void;
  onEdit: (stay: ZeusCareStay) => void;
  onRemove: (stay: ZeusCareStay) => void;
  onUnlink: (stay: ZeusCareStay) => void;
  onPay: (stays: ZeusCareStay[]) => void;
  onConfirm: (expense: ZeusExpense) => void;
}) {
  const ownStays = stays.filter(stay => stay.provider === provider);
  const visible = ownStays.filter(stay => stay.date <= today() && stay.date.startsWith(month));
  const upcoming = ownStays.filter(stay => stay.date > today()).sort((a, b) => a.date.localeCompare(b.date));
  const pending = ownStays.filter(stay => !isCarePaid(stay));
  const paid = ownStays.filter(isCarePaid).reduce((sum, stay) => sum + stay.amount, 0);
  const outstanding = Math.round(pending.reduce((sum, stay) => sum + stay.amount, 0) * 100) / 100;
  const forecast = ownStays.filter(isCareForecast).reduce((sum, stay) => sum + stay.amount, 0);
  const Icon = provider === "daycare" ? Moon : Heart;
  const renderStay = (stay: ZeusCareStay) => {
    const paid = isCarePaid(stay);
    const forecast = isCareForecast(stay);
    return (
      <li key={stay.id} className="space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <strong>{shortDate(stay.date)} {stay.date.slice(0, 4)}</strong>
              <span className="text-sm text-muted-foreground">{careStayDescription(stay)}</span>
              <strong className="text-violet-700 dark:text-violet-300">{money(stay.amount)}</strong>
            </p>
            {stay.note && <p className="mt-1 break-words text-sm text-muted-foreground">{stay.note}</p>}
            <p className={`mt-2 text-xs ${paid ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground"}`}>
              {paid ? "Pagado" : forecast
                ? `Previsto para el ${shortDate(stay.expense?.date)} · Aún sin pagar`
                : stay.expense ? "Previsión descartada · Falta vincular el pago" : "Pendiente · Sin previsión ni pago vinculado"}
            </p>
          </div>
          <div className="flex gap-1">
            {stay.expense ? <Button variant="ghost" size="icon" aria-label={`Desvincular pago o previsión del ${shortDate(stay.date)}`}
              disabled={busy} onClick={() => onUnlink(stay)}><Unlink className="h-4 w-4" /></Button>
              : <Button variant="ghost" size="icon" aria-label={`Corregir estancia del ${shortDate(stay.date)}`}
                disabled={busy} onClick={() => onEdit(stay)}><Pencil className="h-4 w-4" /></Button>}
            <Button variant="ghost" size="icon" aria-label={`Borrar estancia del ${shortDate(stay.date)}`}
              disabled={busy} onClick={() => onRemove(stay)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        {!paid && <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onPay([stay])}>
            <Link2 className="mr-2 h-4 w-4" />{forecast ? "Vincular pago o cambiar previsión" : "Pago o previsión"}
          </Button>
          {forecast && stay.expense && <Button size="sm" disabled={busy} onClick={() => {
            if (stay.expense) onConfirm(stay.expense);
          }}>Ya lo pagué</Button>}
        </div>}
        {stay.expense && <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
          <Link className="inline-flex items-center gap-1 text-primary hover:underline"
            to={`/ledger?year=${stay.expense.date.slice(0, 4)}&month=${Number(stay.expense.date.slice(5, 7))}`}>
            {paid ? "Ver pago" : "Ver previsión"} · {money(stay.expense.amount)} · {stay.expense.accountName}<ArrowUpRight className="h-3 w-3" />
          </Link>
          {paid && <p>{money(stay.amount)} asignados a este registro; {money(stay.expense.amount - (stay.expense.allocatedAmount ?? 0))} del pago aún sin asignar.</p>}
        </div>}
      </li>
    );
  };
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Icon className="h-5 w-5 text-violet-600" />{provider === "daycare" ? "Sus noches en la guardería" : "Con Alessia, su niñera"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{provider === "daycare"
            ? "Se pagan aparte y no consumen el bono de horas."
            : "Menos de 4 h: 20 € · Más de 4 h: 25 € · Noche: 30 € · Cancelación sin aviso: 10 €."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pending.length > 0 && <Button variant="outline" disabled={busy} onClick={() => onPay(pending)}><Link2 className="mr-2 h-4 w-4" />Gestionar pagos y previsiones</Button>}
          <Button disabled={busy} onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{provider === "daycare" ? "Registrar noches" : "Registrar cuidado"}</Button>
        </div>
      </div>
      <div className="space-y-3 rounded-xl border bg-violet-50/50 p-4 dark:bg-violet-950/20">
        <p className="flex items-center gap-2 text-sm font-medium">
          {ownStays.length === 0 ? "Aún no hay cuidados registrados"
            : outstanding === 0 ? <><CheckCircle2 className="h-5 w-5 text-teal-600" />Todo pagado</>
              : <>Falta pagar {money(outstanding)}{provider === "alessia" ? " a Alessia" : " a la guardería"}</>}
        </p>
        <p className="text-xs text-muted-foreground">Resumen de todos los meses, incluidos los cuidados pactados. Las previsiones forman parte del pendiente, no se suman dos veces.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[{ label: "Ya pagado", amount: paid }, { label: "Pendiente de pagar", amount: outstanding }, { label: "Del pendiente, ya previsto en Mes", amount: forecast }].map(({ label, amount }) => (
            <Card key={label} className="px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{money(amount)}</p></Card>
          ))}
        </div>
      </div>
      {upcoming.length > 0 && <div className="space-y-2">
        <h3 className="flex items-center gap-2 font-medium"><CalendarDays className="h-4 w-4" />Próximos cuidados y cargos pactados</h3>
        <Card className="overflow-hidden"><ul className="divide-y">{upcoming.map(renderStay)}</ul></Card>
      </div>}
      <h3 className="font-medium">Historial · {monthLabel(Number(month.slice(0, 4)), Number(month.slice(5, 7)))}</h3>
      <Card className="overflow-hidden">
        {visible.length === 0 ? <div className="space-y-2 p-8 text-center text-sm text-muted-foreground">
          <Icon className="mx-auto h-8 w-8 text-violet-500" /><p>No hay estancias registradas este mes.</p>
        </div> : <ul className="divide-y">
          {visible.map(renderStay)}
        </ul>}
      </Card>
    </section>
  );
}
