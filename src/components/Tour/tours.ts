import { findVisible } from "./tourDom";

export interface TourStep {
  /** Selector CSS del elemento a resaltar (normalmente `[data-tour="..."]`). */
  target?: string;
  /** Selector que se usa si `target` no está visible (p. ej. el botón del menú en el teléfono). */
  fallbackTarget?: string;
  title: string;
  /** Texto corto. Los saltos de línea (\n) se respetan. */
  body: string;
  /** Ejemplo concreto que se muestra en un recuadro aparte. */
  example?: string;
  /** Si el elemento no aparece, el paso se salta en vez de mostrarse centrado. */
  optional?: boolean;
  /** Selector de un elemento que se pulsa antes de mostrar el paso (p. ej. una pestaña). */
  click?: string;
}

export interface TourDefinition {
  id: string;
  /** Nombre para la guía y el menú de Ayuda. */
  name: string;
  description: string;
  /** Pantalla en la que se hace el recorrido. Al lanzarlo desde otra, la app va primero allí. */
  route?: string;
  /** Si cambian mucho los pasos, sube la versión y el recorrido volverá a salir solo una vez. */
  version?: number;
  steps: TourStep[];
}

const t = (name: string) => `[data-tour="${name}"]`;
const MOBILE_MENU = t("mobile-menu-button");

export const GENERAL_TOUR_ID = "general";

export const TOURS: TourDefinition[] = [
  {
    id: GENERAL_TOUR_ID,
    name: "Recorrido general",
    description: "Las partes de la app y dónde está cada cosa.",
    route: "/dashboard",
    steps: [
      {
        title: "¡Hola! Te enseño la app en un minuto",
        body:
          "Esta app es tu libreta de dinero. Cada mes metes lo que pasó en el banco y la app te dice si todo cuadra.\n\n" +
          "Pulsa «Siguiente» para avanzar. Si ya la conoces, pulsa «Saltar recorrido».",
      },
      {
        target: t("nav"),
        fallbackTarget: MOBILE_MENU,
        title: "El menú",
        body:
          "Aquí están todas las pantallas de la app. Pulsa un nombre para ir a esa pantalla.\n\n" +
          "En el teléfono, el menú se abre con el botón de las tres rayitas.",
      },
      {
        target: t("dashboard-balance"),
        optional: true,
        title: "Tu dinero hoy",
        body:
          "En «Dashboard» (la pantalla de inicio) ves el dinero que tienes hoy, según los movimientos que ya pasaron por el banco.\n\n" +
          "Al lado, en «Tus cuentas», ves cuánto hay en cada cuenta.",
      },
      {
        target: t("nav-ledger"),
        fallbackTarget: MOBILE_MENU,
        title: "«Mes»: tu libro del mes",
        body:
          "Aquí está la lista de lo que esperas cobrar y pagar cada mes (sueldo, alquiler, luz…) y lo que ya pasó de verdad.\n\n" +
          "También tiene la pestaña «Resumen y cuadre», para comparar tu saldo con el del banco.",
      },
      {
        target: t("nav-imports"),
        fallbackTarget: MOBILE_MENU,
        title: "«Importar / Exportar»: lo que pasó en el banco",
        body: "Una vez al mes, aquí subes el extracto de cada cuenta. La app lee los movimientos y los pone en su sitio por ti.",
        example: "Extracto = el archivo (CSV) con la lista de movimientos que descargas de la app de Revolut.",
      },
      {
        target: t("nav-settings"),
        fallbackTarget: MOBILE_MENU,
        title: "«Configuración»: tu plan y tus cuentas",
        body:
          "Aquí apuntas una vez lo que se repite: tus gastos fijos (alquiler, agua, internet…) y tus ingresos. " +
          "También están tus cuentas, con su saldo inicial.",
      },
      {
        target: t("nav-movements"),
        fallbackTarget: MOBILE_MENU,
        title: "Otras pantallas",
        body:
          "• «Movimientos»: todo lo que entró y salió.\n" +
          "• «Préstamos»: lo que debes y lo que te deben.\n" +
          "• «Pasanaco»: los turnos y pagos de tu pasanaco.\n" +
          "• «Liquidaciones»: marcas qué gastos son de mamá o de Vane y les mandas el resumen por WhatsApp.\n" +
          "• «Asistente»: el asistente de la app, en pantalla grande.\n" +
          "• «Cómo usar la app»: la guía, con todo explicado con calma.",
      },
      {
        target: t("chat-bubble"),
        title: "Tu asistente",
        body:
          "Este botón redondo abre el asistente. Escríbele como a una persona: busca en tus datos y te prepara cambios.\n\n" +
          "No cambia nada hasta que tú lo confirmas.",
        example: "«¿Cuánto gasté en Alimentación en octubre?»",
      },
      {
        target: t("help-button"),
        title: "Si te pierdes, pulsa «Ayuda»",
        body:
          "Desde aquí puedes repetir el recorrido de la pantalla en la que estás, ver otra vez este recorrido " +
          "o abrir la guía «Cómo usar la app».",
      },
      {
        title: "Tu rutina de cada mes, en corto",
        body:
          "1. Descarga de Revolut el extracto de cada cuenta, del día 1 al último día del mes.\n" +
          "2. Súbelo en «Importar».\n" +
          "3. Revisa los conceptos y pulsa «Aplicar lote».\n" +
          "4. Comprueba que diga «El saldo cuadra con el banco».\n\n" +
          "En la guía «Cómo usar la app» lo tienes explicado con calma.",
      },
    ],
  },
  {
    id: "importar",
    name: "Importar el extracto",
    description: "Subir el archivo del banco, revisarlo y aplicarlo.",
    route: "/imports",
    steps: [
      {
        title: "Importar el extracto del banco",
        body: "En esta pantalla metes en la app los movimientos del banco. Se hace una vez al mes, con cada cuenta: tu Revolut y la Conjunta.",
        example:
          "Extracto = el archivo (CSV) con la lista de movimientos que descargas de la app de Revolut. " +
          "Tiene que ir desde el día 1 hasta el último día del mes.",
      },
      {
        target: t("import-account"),
        optional: true,
        title: "1. Elige la cuenta",
        body: "Primero elige de qué cuenta es el archivo que vas a subir.",
        example: "Si el extracto es de la cuenta Conjunta, elige la Conjunta.",
      },
      {
        target: t("import-file"),
        optional: true,
        title: "2. Sube el archivo",
        body:
          "Pulsa «Seleccionar CSV de Revolut» y busca el archivo. Luego pulsa «Importar para revisar».\n\n" +
          "Tranquilo: en este paso todavía no se guarda nada en tu libro.",
      },
      {
        target: t("import-review"),
        title: "3. Lee la «Revisión automática»",
        body:
          "Cuando subes el archivo, la app lo revisa sola y te deja avisos de colores:\n" +
          "• Verde: todo bien.\n" +
          "• Amarillo: mira esto.\n" +
          "• Gris: solo información.",
      },
      {
        target: t("import-explain"),
        title: "¿No entiendes un aviso?",
        body:
          "Pulsa «Explícame la revisión» y el asistente te lo explica con palabras sencillas.\n\n" +
          "Este botón solo aparece antes de aplicar la importación.",
      },
      {
        target: t("import-concept"),
        title: "4. Revisa los conceptos",
        body:
          "Concepto = la etiqueta de cada movimiento (Alimentación, Luz, Alquiler…). La app adivina el concepto; tú solo corriges los que estén mal. " +
          "Si dice «Sin concepto (revisar)», elígelo tú.\n\n" +
          "Arriba puedes ver la lista por «Comercios», solo lo «Sin clasificar» o «Todas» las filas.",
        example: "En «Comercios», si cambias el concepto de Mercadona, cambian todas las compras de Mercadona a la vez.",
      },
      {
        target: t("import-assistant"),
        title: "5. Pídeselo al asistente",
        body: "El botón «Asistente» abre un chat solo para esta importación. Escríbele con tus palabras: te ayuda a ordenar los movimientos y a entender los avisos.",
        example: "«pon Mercadona en Alimentación» o «¿por qué no cuadra el saldo?»",
      },
      {
        target: t("import-apply"),
        title: "6. Aplica la importación",
        body:
          "Cuando todo esté bien, pulsa «Aplicar lote». Así los movimientos pasan a tu libro del mes. " +
          "Solo se guardan las filas que tienen concepto.",
        example: "Lote = el grupo de movimientos de este archivo.",
      },
      {
        target: t("import-review"),
        title: "7. Comprueba que cuadre",
        body:
          "Después de aplicar, la revisión debe decir «El saldo cuadra con el banco». ¡Eso significa que todo está bien!\n\n" +
          "Si dice que no cuadra, abre la guía «Cómo usar la app» (botón «Ayuda») y mira «Si el saldo no cuadra».",
      },
    ],
  },
  {
    id: "mes",
    name: "El libro del mes",
    description: "Lo previsto, lo pagado, las notas y cómo cerrar el mes.",
    route: "/ledger",
    steps: [
      {
        target: t("month-tabs"),
        title: "El libro del mes",
        body:
          "«Mes» tiene dos pestañas:\n" +
          "• «Planificación»: lo que esperas cobrar y pagar.\n" +
          "• «Resumen y cuadre»: lo que pasó de verdad y si coincide con el banco.\n\n" +
          "Ahora estás en «Planificación».",
      },
      {
        target: t("month-nav"),
        title: "Cambia de mes",
        body: "Usa las flechas para ir al mes anterior o al siguiente. «Hoy» te devuelve al mes actual.",
      },
      {
        target: t("month-totals"),
        title: "Los números del mes",
        body: "Aquí ves el resumen del mes. El más importante es «Saldo real»: lo que te quedó del mes anterior más todo lo ya confirmado.",
        example:
          "«Arrastre» = el dinero con el que cerró el mes anterior. " +
          "«Saldo proyectado» = cómo acabarás el mes si se paga todo lo que falta.",
      },
      {
        target: t("month-group"),
        title: "Ingresos y gastos, por grupos",
        body:
          "Los apuntes van en grupos: primero los ingresos y después los gastos. " +
          "Cada grupo muestra «Previsto» (lo que esperabas), «Real» (lo que pasó) y «Resta» (lo que falta).",
        example: "Apunte = cada pago o cobro concreto, con su fecha y su importe.",
      },
      {
        target: t("entry-status"),
        title: "El estado de cada apunte",
        body:
          "• «Previsto»: lo esperas; todavía no ha pasado.\n" +
          "• «Vencido»: pendiente; ya debería haber pasado y aún no está confirmado.\n" +
          "• «Confirmado»: ya se pagó o se cobró.\n" +
          "• «Descartado»: este mes no toca (sale tachado).",
      },
      {
        target: t("entry-confirm"),
        fallbackTarget: t("entry-unconfirm"),
        title: "Confirmar un pago",
        body:
          "El botón ✓ («Confirmar pago») marca un apunte como pagado o cobrado. Te pide el importe real y la fecha.\n\n" +
          "Casi nunca hace falta: al aplicar el extracto, la app confirma sola lo previsto que coincide con el banco. " +
          "Si te equivocas, la flecha «Deshacer confirmación» lo arregla.",
      },
      {
        target: t("entry-skip"),
        fallbackTarget: t("entry-unskip"),
        title: "Descartar: «este mes no toca»",
        body:
          "El botón ⊖ («Descartar este mes») sirve cuando algo previsto no se va a pagar este mes. El apunte sale tachado y no cuenta.\n\n" +
          "¿Te equivocaste? Pulsa «Recuperar» (la flecha que da la vuelta) y vuelve a estar como antes.",
        example: "El previsto de Disney+ se descarta porque se descuenta de lo de Vanessa.",
      },
      {
        target: t("entry-edit"),
        title: "Editar y poner una nota",
        body:
          "El lápiz («Editar») abre el apunte. Ahí cambias la fecha, el importe o la descripción, " +
          "y en «Nota» escribes algo para acordarte. La nota se ve debajo del apunte.",
        example: "Nota: «adelanto de la paga extra».",
      },
      {
        target: t("concept-rename"),
        fallbackTarget: t("concept-add"),
        title: "Renombrar un concepto o añadir un apunte",
        body:
          "En la fila del concepto (por ejemplo «Luz»), el lápiz («Renombrar concepto») le cambia el nombre en todos los meses. Lo ya pagado no cambia.\n\n" +
          "El «+» («Añadir apunte») sirve para apuntar a mano un pago o un cobro.",
      },
      {
        target: t("month-close"),
        title: "Cerrar el mes",
        body:
          "Cuando el mes esté terminado y cuadrado, pulsa «Cerrar mes». El saldo pasa al mes siguiente como «Arrastre» y el mes ya no acepta cambios.\n\n" +
          "Si tienes que corregir algo, pulsa «Reabrir».",
      },
    ],
  },
  {
    id: "cuadre",
    name: "Resumen y cuadre",
    description: "Comparar lo que dice la app con lo que dice el banco.",
    route: "/monthly",
    steps: [
      {
        target: t("month-tabs"),
        title: "Resumen y cuadre",
        body: "Esta pestaña te dice qué pasó de verdad en el mes y si tu dinero coincide con el del banco. A eso le llamamos «cuadrar».",
      },
      {
        target: t("summary-month"),
        title: "Elige el mes",
        body: "Con las flechas cambias de mes. «Hoy» te lleva al mes actual.",
      },
      {
        target: t("summary-cards"),
        title: "El mes en números",
        body:
          "Lo que entró y salió de verdad, lo que queda «Pendiente» (por cobrar y por pagar) " +
          "y el «Saldo proyectado»: cómo acabarás el mes si se paga todo.",
      },
      {
        target: t("reconcile-account"),
        title: "Cuadre por cuenta",
        body: "Cada cuenta se comprueba por separado. «Saldo calculado por la app» es el dinero que, según la app, tiene esa cuenta.",
      },
      {
        target: t("reconcile-bank-balance"),
        title: "Escribe el saldo del banco",
        body: "Escribe aquí el saldo que te muestra el banco para esa cuenta.",
        example: "Para un mes ya terminado, el saldo correcto es el «Saldo» del último movimiento completado del mes en el extracto.",
      },
      {
        target: t("reconcile-status"),
        title: "¿Cuadra?",
        body:
          "Si los dos números son iguales, verás «Cuadrado» en verde. Si no, verás «Diferencia» y cuánto falta o sobra.\n\n" +
          "Si no cuadra, mira la guía «Cómo usar la app» → «Si el saldo no cuadra».",
      },
      {
        target: t("reconcile-save"),
        title: "Guarda el cuadre",
        body: "Cuando diga «Cuadrado», pulsa «Guardar cuadre». El botón solo se puede pulsar cuando los números coinciden.",
      },
      {
        target: t("summary-close"),
        title: "Cierra el mes",
        body:
          "Con las cuentas cuadradas, pulsa «Cerrar mes». El saldo final pasa al mes siguiente y el mes queda bloqueado.\n\n" +
          "Si necesitas corregir algo, pulsa «Reabrir mes».",
      },
    ],
  },
  {
    id: "planificacion",
    name: "Planificación de gastos fijos",
    description: "Lo que se repite: importe, día, cuenta y cada cuánto se paga.",
    route: "/settings",
    steps: [
      {
        target: t("settings-tab-planning"),
        click: t("settings-tab-planning"),
        title: "Tu plan de cada mes",
        body:
          "En «Configuración» → «Planificación» apuntas una sola vez lo que se repite. Después, la app lo pone solo en cada mes.\n\n" +
          "Ojo: no es lo mismo que la pestaña «Planificación» de «Mes». Aquí preparas el plan; allí ves cómo va cada mes.",
      },
      {
        target: t("planning-kind"),
        title: "Ingresos o gastos",
        body: "Elige qué quieres ver: tus «Ingresos» (lo que cobras, como el sueldo) o tus «Gastos» (lo que pagas).",
      },
      {
        target: t("planning-totals"),
        title: "El total de tu plan",
        body: "Aquí ves cuánto suman al mes tus fijos y tus variables. Un recibo que llega cada 2 meses cuenta la mitad en cada mes.",
        example: "Si el agua cuesta 60 € cada 2 meses, aquí cuenta 30 € al mes.",
      },
      {
        target: t("planning-type"),
        title: "Fijo o variable",
        body:
          "Gasto fijo = se repite siempre, con un importe parecido y un día concreto (alquiler, internet…).\n" +
          "Variable = cambia cada mes (comida, gasolina…). Para estos pones un límite.\n\n" +
          "Elige «Fijo (cada mes)», «Fijo (cada 2 meses)» o «Variable».",
        example: "El agua se paga cada 2 meses: elige «Fijo (cada 2 meses)».",
      },
      {
        target: t("planning-amount"),
        title: "El importe",
        body:
          "Escribe cuánto es. Si se paga cada 2 meses, pon lo que cuesta cada recibo. " +
          "Si es variable, pon lo máximo que quieres gastar al mes.",
      },
      {
        target: t("planning-day"),
        title: "El día",
        body: "El día del mes en que suele pagarse o cobrarse. Solo se usa en los fijos.",
        example: "Si el alquiler sale el día 1, escribe 1.",
      },
      {
        target: t("planning-account"),
        title: "La cuenta",
        body: "Elige la cuenta desde la que se paga (o a la que llega el dinero). Así la app sabe dónde buscarlo cuando importas el extracto.",
      },
      {
        target: t("planning-save"),
        title: "Guarda cada fila",
        body: "Cada fila tiene su botón «Guardar». Púlsalo después de cambiar algo y verás «Guardado».",
      },
      {
        target: t("planning-next"),
        optional: true,
        title: "Recibos cada 2 meses",
        body:
          "En lo que se paga «cada 2 meses» se activa «Próximo recibo»: elige el mes en que llega el siguiente recibo. " +
          "Así la app sabe qué meses toca y cuáles no.",
      },
    ],
  },
  {
    id: "cuentas",
    name: "Tus cuentas",
    description: "Tus cuentas, su saldo inicial y dónde ver cuánto hay.",
    route: "/settings",
    steps: [
      {
        target: t("settings-tab-banks"),
        click: t("settings-tab-banks"),
        title: "Tus cuentas",
        body: "En «Configuración» → «Cuentas» están tus cuentas: tu Revolut, la Conjunta, la Hucha…",
      },
      {
        target: t("accounts-card"),
        title: "Una tarjeta por cuenta",
        body: "Cada tarjeta es una cuenta. Puedes cambiarle el nombre, la entidad (el banco) y el color. «Activa» significa que la estás usando.",
      },
      {
        target: t("accounts-opening"),
        title: "El saldo inicial",
        body: "Saldo inicial = el dinero que tenía la cuenta el día que pones en «desde». A partir de ese día, la app suma y resta los movimientos.",
        example: "Si el 1 de septiembre tenías 1.250 € en la Conjunta, escribe 1250 y elige esa fecha en «desde».",
      },
      {
        target: t("accounts-actions"),
        title: "Guardar o deshabilitar",
        body:
          "Después de cambiar algo, pulsa «Guardar». Ojo: si cambias el saldo inicial, cambian los saldos de todos los meses.\n\n" +
          "«Deshabilitar» esconde una cuenta que ya no usas: deja de aparecer al crear o importar movimientos.",
      },
      {
        target: t("accounts-new"),
        title: "Crear una cuenta nueva",
        body: "Escribe el nombre y la entidad, elige un color y pulsa «Agregar». Luego, en su tarjeta, pon el saldo inicial y pulsa «Guardar».",
      },
      {
        title: "¿Cuánto hay en cada cuenta?",
        body:
          "Lo ves en «Dashboard», en el recuadro «Tus cuentas».\n\n" +
          "Para compararlo con el banco, ve a «Mes» → «Resumen y cuadre».",
      },
    ],
  },
];

export function getTour(id: string): TourDefinition | undefined {
  return TOURS.find((tour) => tour.id === id);
}

export function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "").toLowerCase() || "/";
}

const PAGE_TOURS: Record<string, string> = {
  "/imports": "importar",
  "/ledger": "mes",
  "/monthly": "cuadre",
  "/settings": "planificacion",
};

/** Recorrido que se lanza solo la primera vez que entras en una pantalla. */
export function pageTourFor(pathname: string): string | null {
  return PAGE_TOURS[normalizePath(pathname)] ?? null;
}

/** Recorrido de lo que se ve ahora mismo (en Configuración depende de la pestaña abierta). */
export function screenTourFor(pathname: string): string | null {
  const pageTour = pageTourFor(pathname);
  if (pageTour === "planificacion" && (findVisible(`${t("accounts-new")}, ${t("accounts-card")}`))) {
    return "cuentas";
  }
  return pageTour;
}

function storageKey(tour: TourDefinition): string {
  return `pf.tour.${tour.id}.v${tour.version ?? 1}`;
}

export function isTourDone(id: string): boolean {
  const tour = getTour(id);
  if (!tour) return true;
  try {
    return window.localStorage.getItem(storageKey(tour)) === "done";
  } catch {
    // Sin almacenamiento no podemos recordar nada: mejor no lanzar recorridos solos.
    return true;
  }
}

export function markTourDone(id: string): void {
  const tour = getTour(id);
  if (!tour) return;
  try {
    window.localStorage.setItem(storageKey(tour), "done");
  } catch {
    // Modo privado o almacenamiento lleno: no pasa nada.
  }
}
