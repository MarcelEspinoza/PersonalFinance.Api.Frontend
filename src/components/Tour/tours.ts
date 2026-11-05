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
        title: "Cómo vas este mes",
        body:
          "En «Dashboard» (la pantalla de inicio) ves arriba lo que te quedará libre a fin de mes, la cuenta que lleva a ese número (lo que tienes hoy + lo que falta cobrar − lo que falta pagar) y cuánto hay en cada cuenta.\n\n" +
          "Debajo, «Qué tienes que hacer» te dice lo que necesita tu atención, y «Próximos meses» te muestra cómo vienen los meses que siguen. Desde ahí llegas al «Plan de gastos» completo.",
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
        title: "«Importar»: lo que pasó en el banco",
        body: "Una vez al mes, aquí subes el extracto de cada cuenta. La app lee los movimientos y los pone en su sitio por ti.",
        example: "Extracto = el archivo (CSV) con la lista de movimientos que descargas de la app de Revolut.",
      },
      {
        target: t("nav-plan"),
        fallbackTarget: MOBILE_MENU,
        title: "«Plan de gastos»: lo que se repite",
        body:
          "Aquí ves los próximos 6 meses: lo que entra, tus gastos fijos (alquiler, agua, internet…) y tus gastos variables con su límite. " +
          "Para cambiar cómo se repite algo, toca «Cambiar» en su fila.\n\n" +
          "Tus cuentas, con su saldo inicial, están en «Configuración».",
      },
      {
        target: t("nav-loans"),
        fallbackTarget: MOBILE_MENU,
        title: "Otras pantallas",
        body:
          "• «Préstamos»: lo que debes y lo que te deben.\n" +
          "• «Pasanaco»: los turnos y pagos de tu pasanaco.\n" +
          "• «Liquidaciones»: marcas qué gastos son de mamá o de Vane y les mandas el resumen por WhatsApp.\n" +
          "• «Recordatorios»: avisos con fecha para que no se te pase ningún pago; te los muestra la campanita.\n" +
          "• «Asistente»: el asistente de la app, en pantalla grande.\n" +
          "• «Cómo usar la app»: la guía, con todo explicado con calma.",
      },
      {
        target: t("chat-bubble"),
        title: "Tu asistente",
        body:
          "Con este botón redondo abres el asistente a un lado de la pantalla (en el teléfono, abajo). Escríbele como a una persona: busca en tus datos y te prepara cambios.\n\n" +
          "Se queda abierto aunque cambies de pantalla, con la misma conversación. No cambia nada hasta que tú lo confirmas.",
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
        target: t("month-search"),
        optional: true,
        title: "Busca un apunte",
        body:
          "Escribe una palabra, un importe o una fecha y verás solo los apuntes del mes que coinciden. Los totales no cambian.\n\n" +
          "Para borrar la búsqueda, pulsa la «×» o la tecla Esc.",
        example: "«mercadona», «45,99» o «15/03».",
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
    name: "Plan de gastos",
    description: "Los próximos meses: de dónde sale cada número y cómo cambiar lo que se repite.",
    route: "/plan",
    version: 2,
    steps: [
      {
        target: t("plan-table"),
        title: "Tu plan, mes a mes",
        body:
          "Cada columna es un mes. Arriba están los totales: lo que entra, tus gastos fijos, tus gastos variables, lo que te queda y lo que tendrás libre a fin de mes.\n\n" +
          "Debajo ves de dónde sale cada total, fila por fila.",
      },
      {
        target: t("plan-income"),
        title: "Lo que entra",
        body:
          "Tus ingresos de cada mes. Debajo de cada nombre pone de dónde sale: si se repite solo (como la nómina) o si viene de un recordatorio o de una liquidación.",
        example: "✓ = ya cobrado: cuenta lo que llegó de verdad, no lo previsto.",
      },
      {
        target: t("plan-fixed-change"),
        optional: true,
        title: "Cambiar cómo se repite",
        body:
          "Toca «Cambiar» y elige: «Cada mes», «Cada 2 meses», «Varía cada mes» o «No se repite solo». Luego pon el importe, el día y la cuenta.\n\n" +
          "Se aplica desde este mes: lo ya pagado no se toca.",
        example: "El agua llega cada 2 meses: elige «Cada 2 meses» y el mes del próximo recibo.",
      },
      {
        target: t("plan-new-fixed"),
        optional: true,
        title: "Algo nuevo que pagas siempre",
        body:
          "Si empiezas a pagar algo cada mes (un gimnasio, una suscripción…), pulsa «Nuevo gasto fijo», elige qué gasto es y pon el importe, el día y la cuenta.",
      },
      {
        target: t("plan-variable-limit"),
        optional: true,
        title: "Gastos variables y su límite",
        body:
          "Para lo que cambia cada mes (súper, ocio…) pones un límite, y el plan cuenta ese límite entero. Si ya apuntaste más, cuenta lo apuntado y sale en naranja.\n\n" +
          "Toca un importe para cambiar el límite solo de ese mes: se pone en amarillo.",
      },
      {
        target: t("plan-sources"),
        title: "¿Dudas con un número?",
        body: "Abre «¿De dónde salen estos números y cómo los cambio?»: te explica qué cuenta cada fila y cómo cambiarla.",
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
          "Lo ves en «Dashboard», en el recuadro de arriba, debajo de «Libre a fin de mes».\n\n" +
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
  "/plan": "planificacion",
};

/** Recorrido que se lanza solo la primera vez que entras en una pantalla. */
export function pageTourFor(pathname: string): string | null {
  return PAGE_TOURS[normalizePath(pathname)] ?? null;
}

/** Recorrido de lo que se ve ahora mismo (en Configuración depende de la pestaña abierta). */
export function screenTourFor(pathname: string): string | null {
  if (normalizePath(pathname) === "/settings") {
    return findVisible(`${t("accounts-new")}, ${t("accounts-card")}`) ? "cuentas" : null;
  }
  return pageTourFor(pathname);
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
