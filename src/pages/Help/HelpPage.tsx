import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Info,
  Landmark,
  MessageCircle,
  Pencil,
  Scale,
  Sparkles,
  Tags,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useTour } from "../../components/Tour/tourContext";
import { TourErrorBoundary } from "../../components/Tour/TourErrorBoundary";
import { TOURS } from "../../components/Tour/tours";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

const TOUR_ICONS: Record<string, LucideIcon> = {
  general: Sparkles,
  importar: Upload,
  mes: ClipboardList,
  cuadre: Scale,
  planificacion: CalendarClock,
  cuentas: Landmark,
};

interface RoutineStep {
  title: string;
  body: ReactNode;
  example?: ReactNode;
  warning?: ReactNode;
}

const ROUTINE: RoutineStep[] = [
  {
    title: "Descarga el extracto de cada cuenta",
    body: (
      <>
        En la app de Revolut, exporta el extracto (el archivo CSV) de cada cuenta: tu Revolut y la Conjunta. Elige las fechas{" "}
        <strong>desde el día 1 hasta el último día del mes</strong>.
      </>
    ),
    example: "Para octubre: del 1 al 31 de octubre.",
    warning: "Si el extracto no empieza el día 1, el saldo puede no cuadrar.",
  },
  {
    title: "Súbelo en la app",
    body: (
      <>
        Ve a «Importar», elige la cuenta y pulsa «Seleccionar CSV de Revolut» para buscar el archivo. Luego pulsa
        «Importar para revisar». Tranquilo: todavía no se guarda nada.
      </>
    ),
  },
  {
    title: "Lee la «Revisión automática»",
    body: (
      <>
        La app revisa el archivo sola y te deja avisos de colores: <strong className="text-positive">verde</strong> = todo bien,{" "}
        <strong className="text-warning">amarillo</strong> = mira esto, <strong className="text-muted-foreground">gris</strong> = solo
        información.
      </>
    ),
    example: "Si algo no lo entiendes, pulsa «Explícame la revisión» o pregúntale al «Asistente» de la importación.",
  },
  {
    title: "Revisa los conceptos",
    body: (
      <>
        La app adivina el concepto de cada movimiento (Alimentación, Luz, Alquiler…). Corrige los que estén mal y elige uno en los que
        digan «Sin concepto (revisar)».
      </>
    ),
    example: "Si una compra de Mercadona sale como «Ocio», cámbiala a «Alimentación». O escríbele al asistente: «pon Mercadona en Alimentación».",
  },
  {
    title: "Aplica la importación",
    body: (
      <>
        Pulsa «Aplicar lote». Ahora sí, los movimientos pasan a tu libro del mes. Lo previsto que coincide con el banco queda confirmado
        solo.
      </>
    ),
  },
  {
    title: "Comprueba que cuadre",
    body: (
      <>
        Después de aplicar, la revisión debe decir <strong>«El saldo cuadra con el banco»</strong>. ¡Eso es que todo está bien!
      </>
    ),
    example: "El saldo correcto del banco es el «Saldo» del último movimiento completado del mes en el extracto.",
    warning: "Si no cuadra, abre más abajo «Si el saldo no cuadra».",
  },
  {
    title: "La Hucha se actualiza sola",
    body: (
      <>
        La Hucha no tiene extracto propio. Cuando mandas dinero a la hucha con el concepto «Hucha y fondos Revolut», la app crea sola el
        movimiento «espejo» en la Hucha.
      </>
    ),
    example: "Mandas 50 € de tu Revolut a la hucha: en tu Revolut sale −50 € y en la Hucha aparece +50 €.",
  },
];

interface GlossaryItem {
  term: string;
  meaning: string;
  example?: string;
}

const GLOSSARY: GlossaryItem[] = [
  { term: "Concepto", meaning: "La etiqueta de cada movimiento: Alimentación, Luz, Alquiler… Sirve para saber en qué se va tu dinero." },
  { term: "Apunte", meaning: "Cada pago o cobro concreto del mes, con su fecha y su importe." },
  { term: "Previsto", meaning: "Lo que esperas pagar o cobrar. Todavía no ha pasado.", example: "El alquiler del mes que viene." },
  {
    term: "Pendiente",
    meaning: "Lo que todavía falta por pagar o cobrar. Si ya pasó su fecha y sigue sin confirmar, la app lo marca como «Vencido».",
  },
  { term: "Pagado / cobrado", meaning: "Ya pasó de verdad: el dinero ya salió o ya entró. En la app sale como «Confirmado»." },
  {
    term: "«cobrado 03/10»",
    meaning:
      "Compraste un día, pero el banco te lo cobró más tarde (el 3 de octubre). El gasto cuenta en el mes de la compra; el saldo baja el día que el banco lo cobra.",
    example: "Compras el 30/09 y el banco lo cobra el 03/10: el gasto cuenta en septiembre.",
  },
  {
    term: "Saltado",
    meaning: "Este mes no toca: el apunte sale tachado y no cuenta. En la app sale como «Descartado». Se puede deshacer con «Recuperar».",
  },
  { term: "Traspaso", meaning: "Mover tu propio dinero de una cuenta a otra. No es gasto ni ingreso: el dinero sigue siendo tuyo." },
  {
    term: "Espejo",
    meaning: "La copia que la app crea sola en la Hucha cuando mandas o sacas dinero de la hucha. Así la Hucha está al día sin tener extracto.",
  },
  { term: "Nota", meaning: "Un texto corto que pegas a un apunte para acordarte de algo. Se ve debajo del apunte: «Nota: …»." },
  { term: "Extracto (CSV)", meaning: "El archivo con la lista de movimientos que descargas de la app de Revolut. CSV es solo el tipo de archivo." },
  { term: "Lote", meaning: "El grupo de movimientos de un extracto que subiste. «Aplicar lote» los pasa a tu libro del mes." },
  { term: "Saldo", meaning: "El dinero que hay en una cuenta en un momento dado." },
  {
    term: "Saldo inicial",
    meaning: "El dinero que tenía una cuenta el día que empezaste a usarla en la app. Se pone en «Configuración» → «Cuentas».",
  },
  { term: "Arrastre", meaning: "El dinero con el que terminó el mes anterior. Es el punto de partida del mes." },
  { term: "Cuadrar", meaning: "Comprobar que el dinero que dice la app es el mismo que dice el banco." },
];

const TRANSFERS: GlossaryItem[] = [
  {
    term: "«Hucha y fondos Revolut»",
    meaning: "Mandar dinero a la hucha o sacarlo de ella. La app crea sola el «espejo» en la Hucha.",
    example: "Guardas 100 € en la hucha.",
  },
  {
    term: "«Movimiento entre mis bancos»",
    meaning:
      "De la Conjunta a tu Revolut, o al revés. En el banco sale como «Transferencia de JENNY MABEL ESPINOZA SEJAS & MARCEL ORLANDO UGARTE ESPINOZA».",
  },
  {
    term: "«Dinero de paso (no es mío)»",
    meaning: "Dinero que te llega para pagar algo de otra persona y que luego sale.",
    example: "Alguien te manda 30 € para que le pagues una compra y tú la pagas: entran 30 € y salen 30 €, pero ese dinero no es tuyo.",
  },
];

const BALANCE_CHECKS: { title: string; body: string }[] = [
  { title: "¿El extracto empieza el día 1?", body: "Si empieza más tarde, faltan movimientos. Descárgalo otra vez desde el día 1." },
  {
    title: "¿Hay pagos pendientes en el banco?",
    body: "La app los cuenta como pagados porque el banco ya apartó ese dinero, pero el «Saldo» del extracto todavía no los resta. Para comparar a mano, al «Saldo» del último movimiento completado réstale esos pagos. Si el banco anula alguno, bórralo también aquí.",
  },
  { title: "¿Hay un movimiento repetido?", body: "Por ejemplo, el mismo pago apuntado dos veces." },
  { title: "¿Sobra un apunte manual?", body: "Algo que apuntaste a mano y que ahora también vino en el extracto." },
  {
    title: "¿Hay un traspaso que solo está en una de las dos cuentas?",
    body: "Por ejemplo, salió de la Conjunta pero no aparece la entrada en tu Revolut. Revisa que importaste el extracto de las dos cuentas.",
  },
  { title: "¿Está bien el saldo inicial?", body: "Míralo en «Configuración» → «Cuentas»: el importe y la fecha «desde»." },
];

const ASSISTANT_EXAMPLES = [
  "¿Cuánto gasté en Alimentación en octubre?",
  "¿Qué me queda por pagar este mes?",
  "¿Cuánto tengo en la Hucha?",
  "¿Por qué no cuadra el saldo?",
];

const REMINDER_TOPICS: GlossaryItem[] = [
  {
    term: "La campanita",
    meaning:
      "Cuando se acerca la fecha, el recordatorio aparece en la campanita. En pantallas grandes está arriba del menú de la izquierda («Avisos»); en el teléfono, en la barra de arriba. El número rojo te dice cuántos tienes pendientes. Desde ahí lo marcas como «Hecho» o pides que te lo recuerde «Mañana».",
  },
  {
    term: "Cuándo avisa",
    meaning:
      "Tú eliges cuántos días antes empieza a avisarte (de 0 a 30; 0 es el mismo día). En la lista verás «Pronto» cuando ya empezó el aviso, «Hoy» el mismo día y «Vencido» si la fecha pasó y todavía no está hecho.",
  },
  {
    term: "El correo",
    meaning:
      "Si dejas marcado «Enviar también por correo», además del aviso en la app te llega un correo electrónico. En la lista lo reconoces por el icono del sobre.",
  },
  {
    term: "Repetir",
    meaning:
      "Elige «Una vez», «Cada semana», «Cada mes» o «Cada año». Si se repite, al pulsar «Hecho» pasa solo a la siguiente fecha y la app te dice cuál es. Si es de una vez, pasa a «Hechos».",
  },
  {
    term: "Posponer",
    meaning:
      "¿Todavía no puedes hacerlo? Pulsa «Posponer» y elige 1, 3 o 7 días (en la campanita, «Mañana»). La fecha no cambia: solo deja de avisarte esos días.",
  },
  {
    term: "¿Pago o cobro?",
    meaning:
      "Si el recordatorio lleva importe, eliges si es un pago (sale dinero) o un cobro (entra dinero: te pagan o te devuelven). La previsión del mes lo cuenta como gasto o como ingreso. Si ese dinero ya está anotado en «Mes» o en una liquidación, déjalo sin importe para no contarlo dos veces.",
  },
  {
    term: "Con la IA",
    meaning:
      "El asistente también puede proponerte recordatorios. Escríbele, por ejemplo, «recuérdame pagar el seguro de la casa el 30 de septiembre». Te muestra la propuesta y solo se crea cuando tú pulsas «Confirmar». En la lista salen con la etiqueta «IA».",
  },
];

const IMPORT_NEWS: GlossaryItem[] = [
  {
    term: "El asistente, al costado",
    meaning:
      "Al pulsar «Asistente», el chat se abre al costado de la pantalla y ya no tapa los movimientos. Puedes seguir revisando la lista mientras le escribes.",
  },
  {
    term: "Botón «Preguntar al asistente»",
    meaning:
      "Durante la revisión, cada movimiento, cada aviso y cada comercio tienen un botón con el icono de un globo de chat. Lo pulsas y se abre el asistente con la pregunta ya escrita sobre ese movimiento, aviso o comercio; puedes cambiarla antes de enviarla.",
  },
  {
    term: "Descontar de un previsto",
    meaning:
      "Sirve cuando varios pagos salen de un mismo previsto. En cada pago usa «Descontar de un previsto» y elige el previsto. Al aplicar el lote, los pagos se restan de él: si entre todos llegan a lo previsto o lo superan, el previsto se cierra; si no, queda pendiente lo que falta.",
    example:
      "Tienes el previsto «Viajes y alojamiento» de 600 € y en el extracto vienen el hotel (250 €) y el vuelo (200 €). Los descuentas de «Viajes y alojamiento» y quedan 150 € pendientes. Si después pagas un tren de 180 €, ya superas los 600 € y el previsto se cierra.",
  },
  {
    term: "Con la IA",
    meaning:
      "El asistente de la importación también puede proponerte estos cambios. Por ejemplo: «descuenta estos pagos del previsto de Viajes». Te muestra la propuesta y no cambia nada hasta que tú la confirmas.",
  },
];

function SectionTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function Foldable({ icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border bg-card text-card-foreground shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-5 transition-colors hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
        <div className="flex-1">
          <SectionTitle icon={icon} title={title} subtitle={subtitle} />
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t px-5 pb-5 pt-4 text-sm leading-relaxed">{children}</div>
    </details>
  );
}

function Example({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-muted px-3 py-2 text-sm">
      <span className="font-medium">Ejemplo: </span>
      {children}
    </p>
  );
}

function TermList({ items }: { items: GlossaryItem[] }) {
  return (
    <dl className="divide-y rounded-lg border">
      {items.map((item) => (
        <div key={item.term} className="grid gap-1 p-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="font-semibold">{item.term}</dt>
          <dd className="space-y-2 text-muted-foreground">
            <p>{item.meaning}</p>
            {item.example && <Example>{item.example}</Example>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-1.5">
      {items.map((item, position) => (
        <li key={item} className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{position + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function HelpPage() {
  return (
    <TourErrorBoundary>
      <HelpPageContent />
    </TourErrorBoundary>
  );
}

function HelpPageContent() {
  const { startTour } = useTour();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cómo usar la app"
        description="Todo lo que necesitas para llevar tus cuentas, explicado paso a paso y con palabras sencillas."
      />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <SectionTitle icon={Wallet} title="En simple" />
          <p className="text-base leading-relaxed">
            La app es tu <strong>libreta de dinero</strong>. Cada mes metes lo que pasó en el banco y la app te dice si todo cuadra.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">1. Tu plan</p>
              <p className="mt-1 text-muted-foreground">
                Lo que esperas cobrar y pagar cada mes: sueldo, alquiler, luz… Lo apuntas una vez y se repite solo.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">2. Lo que pasó de verdad</p>
              <p className="mt-1 text-muted-foreground">Lo sacas del extracto del banco y lo subes en «Importar».</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">3. ¿Cuadra?</p>
              <p className="mt-1 text-muted-foreground">
                Si el dinero que dice la app es igual al que dice el banco, todo está bien.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <SectionTitle
            icon={Sparkles}
            title="Recorridos guiados"
            subtitle="La app te enseña una pantalla paso a paso y te señala cada botón."
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Elige uno y pulsa «Empezar». Avanzas con «Siguiente» y puedes salir cuando quieras con «Saltar recorrido». También los tienes en
            el botón «Ayuda» (el del signo ?), arriba.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOURS.map((tour) => {
              const Icon = TOUR_ICONS[tour.id] ?? Sparkles;
              return (
                <div key={tour.id} className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{tour.name}</p>
                      <p className="text-xs text-muted-foreground">{tour.description}</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="mt-auto self-start" onClick={() => startTour(tour.id)}>
                    Empezar
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <SectionTitle
            icon={CalendarDays}
            title="Tu rutina de cada mes"
            subtitle="Hazlo una vez al mes, cuando el mes ya terminó. Son unos minutos."
          />
          <ol className="space-y-4">
            {ROUTINE.map((step, position) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {position + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
                  <p className="text-base font-semibold">{step.title}</p>
                  <p>{step.body}</p>
                  {step.example && <Example>{step.example}</Example>}
                  {step.warning && (
                    <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <span>{step.warning}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-lg border border-dashed p-3 text-sm">
            Repite los pasos 2 a 6 con el extracto de la otra cuenta. Cuando las dos digan «El saldo cuadra con el banco», ¡el mes está
            listo!
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Foldable icon={Tags} title="Palabras que vas a ver" subtitle="Un pequeño diccionario de la app.">
          <TermList items={GLOSSARY} />
        </Foldable>

        <Foldable icon={ArrowUpDown} title="Los 3 tipos de traspaso" subtitle="Mover tu propio dinero no es gasto ni ingreso.">
          <p>
            Traspaso = mover tu propio dinero de un sitio a otro. Para que la app no lo cuente como gasto ni como ingreso, ponle uno de estos
            tres conceptos:
          </p>
          <TermList items={TRANSFERS} />
        </Foldable>

        <Foldable icon={AlertTriangle} title="Si el saldo no cuadra" subtitle="Qué revisar, en este orden.">
          <ol className="space-y-3">
            {BALANCE_CHECKS.map((check, position) => (
              <li key={check.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {position + 1}
                </span>
                <div>
                  <p className="font-semibold">{check.title}</p>
                  <p className="text-muted-foreground">{check.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-lg bg-muted px-3 py-2">
            ¿Sigue sin cuadrar? Pregúntale al asistente: <strong>«¿por qué no cuadra el saldo?»</strong>. Antes de aplicar, usa el
            «Asistente» de la importación; después, el botón redondo del asistente (abajo a la derecha).
          </p>
        </Foldable>

        <Foldable icon={Info} title="Tus casos especiales" subtitle="Cosas de tus cuentas que conviene recordar.">
          <TermList
            items={[
              {
                term: "Paga extra de diciembre",
                meaning: "Llegará 700 € más baja, porque Wolters Kluwer ya te adelantó 700 € de esa paga. No es un error.",
              },
              {
                term: "El agua",
                meaning:
                  "Se paga cada 2 meses. En «Configuración» → «Planificación» va como «Fijo (cada 2 meses)», por eso no aparece todos los meses.",
              },
              {
                term: "Disney+",
                meaning:
                  "Su previsto se marca como «Descartado» (saltado) porque se descuenta de lo de Vanessa. En «Mes», pulsa «Descartar este mes» en su apunte.",
              },
            ]}
          />
        </Foldable>

        <Foldable icon={Pencil} title="Notas y renombrar conceptos" subtitle="Dejar una nota en un apunte o cambiar un nombre.">
          <div className="space-y-2">
            <p className="font-semibold">Poner una nota a un apunte</p>
            <Steps
              items={[
                "Ve a «Mes».",
                "En el apunte, pulsa el lápiz («Editar»).",
                "Escribe lo que quieras recordar en «Nota».",
                "Pulsa «Guardar».",
              ]}
            />
            <Example>la nota se ve debajo del apunte, así: «Nota: adelanto de la paga extra».</Example>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Cambiar el nombre de un concepto</p>
            <Steps
              items={[
                "Ve a «Mes».",
                "En la fila del concepto (por ejemplo «Luz»), pulsa el lápiz («Renombrar concepto»).",
                "Escribe el nombre nuevo y pulsa «Guardar».",
              ]}
            />
            <p className="text-muted-foreground">
              El nombre nuevo se usa en todos los meses y en lo que queda pendiente. Lo ya pagado no cambia.
            </p>
            <Example>«Dinero de paso» → «Dinero de paso (no es mío)».</Example>
          </div>
        </Foldable>

        <Foldable icon={MessageCircle} title="El asistente de la app" subtitle="Pregúntale con tus palabras, como a una persona.">
          <p>
            Es un chat: le escribes y te contesta con tus datos. Lo abres con el botón redondo de abajo a la derecha: se abre a un lado
            de la pantalla (en el teléfono, abajo) y se queda abierto aunque cambies de pantalla, con la misma conversación. También lo
            tienes a pantalla completa en «Asistente», en el menú.
          </p>
          <p>
            Puede consultar toda tu información, preparar cambios en movimientos, categorías, presupuestos, préstamos, Pasanaco e
            importaciones, y crear recordatorios. <strong>No cambia nada hasta que tú lo confirmas.</strong>
          </p>
          <div className="space-y-1.5">
            <p className="font-semibold">Puedes preguntarle, por ejemplo:</p>
            <ul className="space-y-1.5">
              {ASSISTANT_EXAMPLES.map((example) => (
                <li key={example} className="rounded-lg bg-muted px-3 py-2">
                  «{example}»
                </li>
              ))}
            </ul>
          </div>
          <p>
            En «Importar» hay otro asistente, solo para la importación que estás revisando (botón «Asistente»). Por ejemplo: «pon
            Mercadona en Alimentación» o «¿qué significa el aviso del agua?». Mientras lo tienes abierto, el asistente general se
            esconde para que no veas dos chats a la vez.
          </p>
        </Foldable>

        <Foldable icon={Bell} title="Recordatorios" subtitle="Para que no se te pase ningún pago ni ninguna fecha importante.">
          <p>
            Un recordatorio es un aviso con fecha: «pagar el seguro de la casa», «renovar el pasaporte», «cobrarle a Ana». Puede llevar un
            importe y notas. Los creas en «Recordatorios», en el menú, con el botón «Nuevo recordatorio».             En el Dashboard, en «Qué tienes
                        que hacer», también ves los que tocan en los próximos 7 días.
          </p>
          <TermList items={REMINDER_TOPICS} />
          <Example>
            «Pagar el seguro de la casa», el 30/09, 350 €, cada año y con aviso 7 días antes: desde el 23/09 aparece en la campanita. Cuando
            lo pagas y pulsas «Hecho», pasa al 30/09 del año siguiente.
          </Example>
        </Foldable>

        <Foldable
          icon={Upload}
          title="Novedades en «Importar»"
          subtitle="El asistente ya no tapa tus movimientos y puedes descontar pagos de un previsto."
        >
          <TermList items={IMPORT_NEWS} />
        </Foldable>
      </div>
    </div>
  );
}
