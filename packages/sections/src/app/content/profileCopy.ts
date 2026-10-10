import type { LocalizedText } from "@dialmade/catalog";
import type { IconName } from "@dialmade/ui";
import { t } from "../../content/t";
import type { ContentProfileId } from "../../content/types";

/** Dashboard copy that the shared content profiles do not cover (shell, empty state, confirmation). */
export interface AppProfileCopy {
  primaryAction: LocalizedText;
  subtitle: LocalizedText;
  search: LocalizedText;
  empty: { icon: IconName; title: LocalizedText; description: LocalizedText; action: LocalizedText; secondary: LocalizedText };
  confirm: { title: LocalizedText; description: LocalizedText; action: LocalizedText; cancel?: LocalizedText };
}

const KEEP = t("Mantener", "Keep it");

export const APP_PROFILE_COPY: Readonly<Record<ContentProfileId, AppProfileCopy>> = {
  saas: {
    primaryAction: t("Invitar al equipo", "Invite teammates"),
    subtitle: t("Así van tus cuentas este mes.", "Here's how your accounts are doing this month."),
    search: t("Buscar cuentas, personas…", "Search accounts, people…"),
    empty: {
      icon: "folder",
      title: t("Todavía no hay proyectos", "No projects yet"),
      description: t(
        "Crea tu primer proyecto e invita a tu equipo para empezar a colaborar.",
        "Create your first project and invite your team to start collaborating.",
      ),
      action: t("Crear proyecto", "Create project"),
      secondary: t("Importar datos", "Import data"),
    },
    confirm: {
      title: t("¿Eliminar esta cuenta?", "Delete this account?"),
      description: t(
        "Se borrarán sus proyectos, miembros y facturas. Esta acción no se puede deshacer.",
        "Its projects, members and invoices will be removed. This can't be undone.",
      ),
      action: t("Eliminar cuenta", "Delete account"),
    },
  },
  analytics: {
    primaryAction: t("Nuevo informe", "New report"),
    subtitle: t("Tus métricas clave de los últimos 30 días.", "Your key metrics for the last 30 days."),
    search: t("Buscar informes, métricas…", "Search reports, metrics…"),
    empty: {
      icon: "bar-chart",
      title: t("Aún no hay paneles", "No dashboards yet"),
      description: t(
        "Combina métricas y segmentos en un panel para seguirlos de un vistazo.",
        "Combine metrics and segments into a dashboard to follow them at a glance.",
      ),
      action: t("Crear panel", "Create dashboard"),
      secondary: t("Ver plantillas", "Browse templates"),
    },
    confirm: {
      title: t("¿Eliminar este informe?", "Delete this report?"),
      description: t(
        "Quien tenga el enlace dejará de verlo. Esta acción no se puede deshacer.",
        "Anyone with the link will lose access. This can't be undone.",
      ),
      action: t("Eliminar informe", "Delete report"),
    },
  },
  devtools: {
    primaryAction: t("Nuevo deploy", "New deployment"),
    subtitle: t("El estado de tus servicios en producción.", "The state of your production services."),
    search: t("Buscar proyectos, deploys…", "Search projects, deployments…"),
    empty: {
      icon: "link",
      title: t("Aún no hay deploys", "No deployments yet"),
      description: t(
        "Conecta un repositorio y cada push a main se desplegará solo.",
        "Connect a repository and every push to main deploys on its own.",
      ),
      action: t("Conectar repositorio", "Connect repository"),
      secondary: t("Leer la documentación", "Read the docs"),
    },
    confirm: {
      title: t("¿Eliminar este servicio?", "Delete this service?"),
      description: t(
        "Se detendrán sus deploys y se liberarán sus dominios. Esta acción no se puede deshacer.",
        "Its deployments will stop and its domains will be released. This can't be undone.",
      ),
      action: t("Eliminar servicio", "Delete service"),
    },
  },
  commerce: {
    primaryAction: t("Añadir producto", "Add product"),
    subtitle: t("Ventas y pedidos de tu tienda este mes.", "Your store's sales and orders this month."),
    search: t("Buscar pedidos, productos…", "Search orders, products…"),
    empty: {
      icon: "inbox",
      title: t("Aún no hay pedidos", "No orders yet"),
      description: t(
        "Cuando alguien compre en tu tienda, verás aquí cada pedido con su estado de envío.",
        "When someone buys from your store, each order shows up here with its shipping status.",
      ),
      action: t("Añadir producto", "Add product"),
      secondary: t("Compartir tienda", "Share your store"),
    },
    confirm: {
      title: t("¿Cancelar este pedido?", "Cancel this order?"),
      description: t(
        "Reembolsaremos el importe y avisaremos al cliente por correo. Esta acción no se puede deshacer.",
        "We'll refund the customer and let them know by email. This can't be undone.",
      ),
      action: t("Cancelar pedido", "Cancel order"),
      cancel: t("Volver", "Go back"),
    },
  },
  finance: {
    primaryAction: t("Nuevo pago", "New payment"),
    subtitle: t("Tu dinero, de un vistazo.", "Your money at a glance."),
    search: t("Buscar movimientos, facturas…", "Search transactions, invoices…"),
    empty: {
      icon: "file",
      title: t("Aún no hay facturas", "No invoices yet"),
      description: t(
        "Crea tu primera factura y te avisaremos en cuanto la paguen.",
        "Create your first invoice and we'll let you know as soon as it's paid.",
      ),
      action: t("Crear factura", "Create invoice"),
      secondary: t("Importar extracto", "Import statement"),
    },
    confirm: {
      title: t("¿Cancelar este pago programado?", "Cancel this scheduled payment?"),
      description: t(
        "No se enviará el dinero en la fecha prevista. Podrás programarlo de nuevo cuando quieras.",
        "The money won't be sent on the scheduled date. You can schedule it again anytime.",
      ),
      action: t("Cancelar pago", "Cancel payment"),
      cancel: KEEP,
    },
  },
  health: {
    primaryAction: t("Nueva cita", "New appointment"),
    subtitle: t("Tu agenda y tus pacientes de hoy.", "Today's schedule and patients."),
    search: t("Buscar pacientes, citas…", "Search patients, appointments…"),
    empty: {
      icon: "calendar",
      title: t("No hay citas para hoy", "No appointments today"),
      description: t(
        "Cuando tus pacientes reserven, verás aquí la agenda del día.",
        "When patients book, today's schedule will show up here.",
      ),
      action: t("Crear cita", "Create appointment"),
      secondary: t("Compartir enlace de reserva", "Share booking link"),
    },
    confirm: {
      title: t("¿Cancelar esta cita?", "Cancel this appointment?"),
      description: t(
        "Avisaremos al paciente por correo y SMS, y el hueco quedará libre para otra reserva.",
        "We'll notify the patient by email and text, and the slot will be free for another booking.",
      ),
      action: t("Cancelar cita", "Cancel appointment"),
      cancel: KEEP,
    },
  },
  education: {
    primaryAction: t("Nuevo curso", "New course"),
    subtitle: t("Cómo avanza tu alumnado esta semana.", "How your learners are progressing this week."),
    search: t("Buscar cursos, estudiantes…", "Search courses, learners…"),
    empty: {
      icon: "folder",
      title: t("Aún no hay cursos", "No courses yet"),
      description: t(
        "Crea tu primer curso, añade lecciones y comparte el enlace con tus estudiantes.",
        "Create your first course, add lessons and share the link with your learners.",
      ),
      action: t("Crear curso", "Create course"),
      secondary: t("Ver ejemplos", "See examples"),
    },
    confirm: {
      title: t("¿Archivar este curso?", "Archive this course?"),
      description: t(
        "El alumnado inscrito perderá el acceso a las lecciones. Podrás restaurarlo durante 30 días.",
        "Enrolled learners will lose access to the lessons. You can restore it within 30 days.",
      ),
      action: t("Archivar curso", "Archive course"),
    },
  },
  media: {
    primaryAction: t("Subir contenido", "Upload content"),
    subtitle: t("Tu audiencia y tus estrenos de la semana.", "Your audience and this week's releases."),
    search: t("Buscar contenido, series…", "Search content, series…"),
    empty: {
      icon: "file",
      title: t("Aún no has publicado nada", "Nothing published yet"),
      description: t(
        "Sube tu primer episodio o artículo y prográmalo para el mejor momento.",
        "Upload your first episode or article and schedule it for the best moment.",
      ),
      action: t("Subir contenido", "Upload content"),
      secondary: t("Importar desde RSS", "Import from RSS"),
    },
    confirm: {
      title: t("¿Despublicar este contenido?", "Unpublish this content?"),
      description: t(
        "Dejará de estar disponible para tu audiencia, pero conservarás sus estadísticas.",
        "It will no longer be available to your audience, but you'll keep its stats.",
      ),
      action: t("Despublicar", "Unpublish"),
    },
  },
  creative: {
    primaryAction: t("Nuevo proyecto", "New project"),
    subtitle: t("Proyectos, plazos y horas del estudio.", "Projects, deadlines and studio hours."),
    search: t("Buscar proyectos, clientes…", "Search projects, clients…"),
    empty: {
      icon: "folder",
      title: t("Aún no hay proyectos", "No projects yet"),
      description: t(
        "Crea un proyecto, añade a tu cliente y organiza las fases desde el primer día.",
        "Create a project, add your client and plan its phases from day one.",
      ),
      action: t("Crear proyecto", "Create project"),
      secondary: t("Usar una plantilla", "Use a template"),
    },
    confirm: {
      title: t("¿Eliminar este proyecto?", "Delete this project?"),
      description: t(
        "Se borrarán sus archivos, tareas y horas registradas. Esta acción no se puede deshacer.",
        "Its files, tasks and logged hours will be removed. This can't be undone.",
      ),
      action: t("Eliminar proyecto", "Delete project"),
    },
  },
  community: {
    primaryAction: t("Nuevo evento", "New event"),
    subtitle: t("Lo que pasa en tu comunidad esta semana.", "What's happening in your community this week."),
    search: t("Buscar miembros, debates…", "Search members, threads…"),
    empty: {
      icon: "mail",
      title: t("Aún no hay debates", "No threads yet"),
      description: t(
        "Abre el primer debate y da la bienvenida a quienes se acaban de unir.",
        "Start the first thread and welcome the people who just joined.",
      ),
      action: t("Abrir un debate", "Start a thread"),
      secondary: t("Invitar miembros", "Invite members"),
    },
    confirm: {
      title: t("¿Silenciar a este miembro?", "Mute this member?"),
      description: t(
        "No podrá publicar ni comentar durante 7 días. Le avisaremos por correo.",
        "They won't be able to post or comment for 7 days. We'll let them know by email.",
      ),
      action: t("Silenciar", "Mute"),
    },
  },
  services: {
    primaryAction: t("Nueva reserva", "New booking"),
    subtitle: t("Tus reservas y tu ocupación de hoy.", "Today's bookings and occupancy."),
    search: t("Buscar clientes, reservas…", "Search clients, bookings…"),
    empty: {
      icon: "calendar",
      title: t("No hay reservas para hoy", "No bookings today"),
      description: t(
        "Comparte tu enlace de reserva y tus clientes podrán elegir hora en segundos.",
        "Share your booking link and clients can pick a time in seconds.",
      ),
      action: t("Compartir enlace", "Share booking link"),
      secondary: t("Añadir reserva", "Add booking"),
    },
    confirm: {
      title: t("¿Cancelar esta reserva?", "Cancel this booking?"),
      description: t(
        "Avisaremos al cliente y liberaremos el hueco en tu agenda.",
        "We'll notify the client and free up the slot in your schedule.",
      ),
      action: t("Cancelar reserva", "Cancel booking"),
      cancel: KEEP,
    },
  },
  consumer: {
    primaryAction: t("Enviar notificación", "Send notification"),
    subtitle: t("Uso y retención de tu app esta semana.", "Your app's usage and retention this week."),
    search: t("Buscar usuarios…", "Search users…"),
    empty: {
      icon: "users",
      title: t("Aún no hay usuarios", "No users yet"),
      description: t(
        "Comparte tu app y aquí verás quién se une, cuánto la usa y quién vuelve.",
        "Share your app and you'll see who joins, how much they use it and who comes back.",
      ),
      action: t("Compartir app", "Share app"),
      secondary: t("Ver guía de lanzamiento", "Read the launch guide"),
    },
    confirm: {
      title: t("¿Eliminar a este usuario?", "Delete this user?"),
      description: t(
        "Se borrarán su cuenta y su historial. Esta acción no se puede deshacer.",
        "Their account and history will be deleted. This can't be undone.",
      ),
      action: t("Eliminar usuario", "Delete user"),
    },
  },
  public: {
    primaryAction: t("Nueva convocatoria", "New program"),
    subtitle: t("Solicitudes y recursos de este mes.", "This month's requests and resources."),
    search: t("Buscar solicitudes, personas…", "Search requests, people…"),
    empty: {
      icon: "inbox",
      title: t("No hay solicitudes pendientes", "No pending requests"),
      description: t(
        "Cuando alguien presente una solicitud, aparecerá aquí con su documentación.",
        "When someone submits a request, it'll appear here with its documents.",
      ),
      action: t("Abrir convocatoria", "Open a program"),
      secondary: t("Ver solicitudes resueltas", "View resolved requests"),
    },
    confirm: {
      title: t("¿Denegar esta solicitud?", "Deny this request?"),
      description: t(
        "Notificaremos el motivo a la persona solicitante. Podrá recurrir en 30 días.",
        "We'll notify the applicant with the reason. They can appeal within 30 days.",
      ),
      action: t("Denegar solicitud", "Deny request"),
    },
  },
};
