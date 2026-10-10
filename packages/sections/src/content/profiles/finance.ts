import { t } from "../t";
import type { ContentProfile } from "../types";

export const finance: ContentProfile = {
  id: "finance",
  b2b: false,
  hero: {
    eyebrows: [t("Sin comisiones ocultas", "No hidden fees"), t("Regulado y seguro", "Regulated and secure")],
    titles: [
      t("Tu dinero, bajo control", "Your money, under control"),
      t("Finanzas claras para decisiones tranquilas", "Clear finances, calm decisions"),
      t("Paga, ahorra y cobra sin fricción", "Pay, save and get paid without friction"),
    ],
    subtitles: [
      t(
        "{name} reúne tus cuentas, pagos y gastos en una vista clara, con avisos antes de que algo se tuerza.",
        "{name} brings your accounts, payments and spending into one clear view, with alerts before anything goes sideways.",
      ),
      t(
        "Abre tu cuenta en minutos, sin papeleo y con protección de nivel bancario.",
        "Open an account in minutes, with no paperwork and bank-grade protection.",
      ),
    ],
    primaryCta: t("Abre tu cuenta", "Open an account"),
    secondaryCta: t("Cómo funciona", "How it works"),
  },
  landingNav: [t("Cuentas", "Accounts"), t("Tarjetas", "Cards"), t("Empresas", "Business"), t("Seguridad", "Security")],
  proofTitle: t("Han hablado de {name}", "{name} in the press"),
  features: [
    {
      icon: "bar-chart",
      title: t("Todo tu dinero en una vista", "All your money in one view"),
      description: t(
        "Conecta tus cuentas y tarjetas y mira tu saldo real al instante.",
        "Connect your accounts and cards and see your real balance instantly.",
      ),
    },
    {
      icon: "bell",
      title: t("Alertas inteligentes", "Smart alerts"),
      description: t(
        "Avisos de cargos inusuales, recibos duplicados y saldo bajo.",
        "Alerts for unusual charges, duplicate bills and low balance.",
      ),
    },
    {
      icon: "filter",
      title: t("Gastos categorizados", "Categorized spending"),
      description: t(
        "Cada movimiento se clasifica solo para que sepas en qué se va el dinero.",
        "Every transaction is categorized automatically so you know where the money goes.",
      ),
    },
    {
      icon: "file",
      title: t("Facturas y recibos", "Invoices and receipts"),
      description: t(
        "Guarda justificantes con una foto y expórtalos cuando los necesites.",
        "Save receipts with a photo and export them whenever you need them.",
      ),
    },
    {
      icon: "check-circle",
      title: t("Seguridad bancaria", "Bank-grade security"),
      description: t(
        "Cifrado de extremo a extremo, doble factor y bloqueo de tarjeta en un toque.",
        "End-to-end encryption, two-factor authentication and one-tap card freeze.",
      ),
    },
    {
      icon: "sparkle",
      title: t("Objetivos de ahorro", "Savings goals"),
      description: t(
        "Aparta dinero automáticamente para lo que de verdad importa.",
        "Set money aside automatically for what really matters.",
      ),
    },
  ],
  stats: [
    { value: 2_400_000_000, format: "currency", label: t("gestionados cada mes", "managed every month") },
    { value: 350000, suffix: "+", label: t("clientes", "customers") },
    { value: 0, format: "currency", label: t("en comisiones de mantenimiento", "in maintenance fees") },
  ],
  quotes: [
    t(
      "Por primera vez sé exactamente cuánto gasto cada mes sin abrir una hoja de cálculo.",
      "For the first time I know exactly what I spend each month without opening a spreadsheet.",
    ),
    t("Las alertas detectaron un cargo duplicado que se me habría pasado.", "The alerts caught a duplicate charge I would have missed."),
    t("Cerrar el trimestre con mi gestor ahora es cuestión de minutos.", "Closing the quarter with my accountant now takes minutes."),
  ],
  roles: [t("Autónoma", "Freelancer"), t("Fundador de una startup", "Startup founder"), t("Director financiero", "Finance Director"), t("Cliente particular", "Personal customer")],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Estándar", "Standard"),
        price: 0,
        description: t("Todo lo que necesitas para el día a día.", "Everything you need day to day."),
        features: [t("Cuenta y tarjeta", "Account and card"), t("Pagos instantáneos", "Instant payments"), t("Alertas básicas", "Basic alerts")],
      },
      {
        name: t("Plus", "Plus"),
        price: 5,
        description: t("Más control y más protección.", "More control, more protection."),
        features: [
          t("Todo lo del plan Estándar", "Everything in Standard"),
          t("Objetivos de ahorro", "Savings goals"),
          t("Seguro de compras", "Purchase protection"),
          t("Retiradas gratis en todo el mundo", "Free withdrawals worldwide"),
        ],
      },
      {
        name: t("Empresas", "Business"),
        price: 19,
        description: t("Para autónomos y pequeñas empresas.", "For freelancers and small businesses."),
        features: [
          t("Facturación y cobros", "Invoicing and collections"),
          t("Tarjetas para el equipo", "Team cards"),
          t("Exportación contable", "Accounting export"),
          t("Soporte prioritario", "Priority support"),
        ],
      },
    ],
    note: t("Sin permanencia. Cambia de plan cuando quieras.", "No commitment. Switch plans anytime."),
  },
  cta: {
    titles: [t("Toma el control de tus finanzas", "Take control of your finances"), t("Tu cuenta, lista en 5 minutos", "Your account, ready in 5 minutes")],
    subtitle: t("Descarga {name}, verifica tu identidad y empieza a usarla hoy mismo.", "Download {name}, verify your identity and start using it today."),
    button: t("Abrir cuenta gratis", "Open a free account"),
  },
  kpis: [
    { id: "balance", label: t("Saldo total", "Total balance"), format: "currency", min: 24000, max: 180000, deltaMax: 9, icon: "bar-chart" },
    { id: "income", label: t("Ingresos del mes", "Income this month"), format: "currency", min: 8000, max: 42000, deltaMax: 12, icon: "arrow-down-right" },
    { id: "spending", label: t("Gastos del mes", "Spending this month"), format: "currency", min: 5000, max: 30000, deltaMax: 10, invert: true, icon: "arrow-up-right" },
    { id: "savings-rate", label: t("Tasa de ahorro", "Savings rate"), format: "percent", min: 8, max: 32, deltaMax: 15, icon: "sparkle" },
  ],
  chart: {
    title: t("Ingresos y gastos", "Income and spending"),
    period: "month",
    series: [t("Ingresos", "Income"), t("Gastos", "Spending")],
    format: "currency",
    min: 4000,
    max: 22000,
  },
  table: {
    title: t("Movimientos recientes", "Recent transactions"),
    columns: [
      {
        key: "concept",
        label: t("Concepto", "Description"),
        kind: "choice",
        unique: true,
        options: [
          t("Suscripción de software", "Software subscription"),
          t("Nóminas", "Payroll"),
          t("Proveedor de material", "Supplies vendor"),
          t("Cobro de factura", "Invoice payment"),
          t("Alquiler de oficina", "Office rent"),
          t("Viaje de trabajo", "Business travel"),
          t("Comida con cliente", "Client lunch"),
          t("Transferencia recibida", "Incoming transfer"),
        ],
      },
      {
        key: "category",
        label: t("Categoría", "Category"),
        kind: "choice",
        options: [t("Operaciones", "Operations"), t("Personal", "People"), t("Ventas", "Sales"), t("Viajes", "Travel"), t("Marketing", "Marketing")],
      },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Completado", "Completed"), tone: "success", weight: 6 },
          { label: t("Pendiente", "Pending"), tone: "warning", weight: 2 },
          { label: t("Programado", "Scheduled"), tone: "info", weight: 2 },
          { label: t("Rechazado", "Declined"), tone: "destructive", weight: 1 },
        ],
      },
      { key: "amount", label: t("Importe", "Amount"), kind: "money", min: 12, max: 4800 },
      { key: "date", label: t("Fecha", "Date"), kind: "date" },
    ],
  },
  activity: [
    {
      text: t("recibió un pago de {target}", "received a payment of {target}"),
      targets: [t("$1,250", "$1,250"), t("$480", "$480")],
      tone: "success",
      icon: "arrow-down-right",
    },
    {
      text: t("envió una transferencia a {target}", "sent a transfer to {target}"),
      targets: [t("Proveedor de material", "Supplies vendor")],
      tone: "info",
      icon: "arrow-up-right",
    },
    {
      text: t("bloqueó temporalmente {target}", "temporarily froze {target}"),
      targets: [t("la tarjeta acabada en 4821", "the card ending in 4821")],
      tone: "warning",
      icon: "alert-triangle",
    },
    {
      text: t("alcanzó el objetivo {target}", "reached the goal {target}"),
      targets: [t("Fondo de emergencia", "Emergency fund"), t("Vacaciones", "Vacation")],
      tone: "success",
      icon: "sparkle",
    },
    {
      text: t("subió el justificante de {target}", "uploaded the receipt for {target}"),
      targets: [t("Viaje de trabajo", "Business travel")],
      tone: "neutral",
      icon: "file",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "bar-chart", label: t("Cuentas", "Accounts") },
    { icon: "arrow-up-right", label: t("Pagos", "Payments") },
    { icon: "file", label: t("Facturas", "Invoices") },
    { icon: "sparkle", label: t("Objetivos", "Goals") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
