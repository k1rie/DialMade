import { t } from "../t";
import type { ContentProfile } from "../types";

export const education: ContentProfile = {
  id: "education",
  b2b: false,
  hero: {
    eyebrows: [t("Aprende a tu ritmo", "Learn at your own pace"), t("Nuevos cursos cada mes", "New courses every month")],
    titles: [
      t("Aprende lo que te hace avanzar", "Learn what moves you forward"),
      t("Habilidades reales, a tu ritmo", "Real skills, at your pace"),
      t("De cero a experto, paso a paso", "From zero to expert, step by step"),
    ],
    subtitles: [
      t(
        "{name} combina lecciones cortas, práctica guiada y feedback de mentores para que aprendas de verdad, no solo veas vídeos.",
        "{name} combines short lessons, guided practice and mentor feedback so you actually learn, not just watch videos.",
      ),
      t(
        "Rutas claras, proyectos reales y un certificado que puedes enseñar.",
        "Clear paths, real projects and a certificate you can show.",
      ),
    ],
    primaryCta: t("Empieza gratis", "Start learning free"),
    secondaryCta: t("Ver el temario", "View the curriculum"),
  },
  landingNav: [t("Cursos", "Courses"), t("Para equipos", "For teams"), t("Precios", "Pricing"), t("Blog", "Blog")],
  proofTitle: t("Equipos que forman a su gente con {name}", "Teams that train their people with {name}"),
  features: [
    {
      icon: "calendar",
      title: t("Lecciones de 10 minutos", "10-minute lessons"),
      description: t(
        "Aprende en tus ratos libres: cada lección cabe en un café.",
        "Learn in your spare moments: every lesson fits in a coffee break.",
      ),
    },
    {
      icon: "edit",
      title: t("Práctica guiada", "Guided practice"),
      description: t(
        "Ejercicios con corrección al instante para fijar lo aprendido.",
        "Exercises with instant feedback to lock in what you learn.",
      ),
    },
    {
      icon: "users",
      title: t("Mentores que responden", "Mentors who reply"),
      description: t(
        "Dudas resueltas por profesionales en menos de 24 horas.",
        "Questions answered by professionals in under 24 hours.",
      ),
    },
    {
      icon: "bar-chart",
      title: t("Progreso visible", "Visible progress"),
      description: t(
        "Rachas, objetivos semanales y un mapa de lo que ya dominas.",
        "Streaks, weekly goals and a map of what you've mastered.",
      ),
    },
    {
      icon: "file",
      title: t("Certificados verificables", "Verifiable certificates"),
      description: t(
        "Comparte tus logros con un enlace que cualquiera puede comprobar.",
        "Share your achievements with a link anyone can verify.",
      ),
    },
    {
      icon: "download",
      title: t("Aprende sin conexión", "Learn offline"),
      description: t(
        "Descarga las lecciones y sigue estudiando en el metro o en el avión.",
        "Download lessons and keep learning on the subway or the plane.",
      ),
    },
  ],
  stats: [
    { value: 250000, suffix: "+", label: t("estudiantes", "learners") },
    { value: 180, suffix: "+", label: t("cursos", "courses") },
    { value: 92, format: "percent", label: t("terminan lo que empiezan", "finish what they start") },
  ],
  quotes: [
    t("Por fin terminé un curso. Las lecciones cortas encajan con mi día a día.", "I finally finished a course. The short lessons fit my everyday life."),
    t("El feedback de los mentores marcó la diferencia en mi primer proyecto.", "Mentor feedback made all the difference on my first project."),
    t("Usamos {name} con todo el equipo y el nivel subió en un trimestre.", "We use {name} across the team and skills jumped in one quarter."),
  ],
  roles: [
    t("Estudiante", "Student"),
    t("Profesora de secundaria", "High school teacher"),
    t("Responsable de formación", "L&D Lead"),
    t("Desarrollador junior", "Junior developer"),
  ],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Gratis", "Free"),
        price: 0,
        description: t("Para probar sin compromiso.", "Try it with no commitment."),
        features: [t("Lecciones introductorias", "Intro lessons"), t("Ejercicios básicos", "Basic exercises"), t("Comunidad de estudiantes", "Learner community")],
      },
      {
        name: t("Pro", "Pro"),
        price: 15,
        description: t("Para aprender en serio.", "For serious learners."),
        features: [
          t("Todos los cursos", "All courses"),
          t("Proyectos con feedback", "Projects with feedback"),
          t("Certificados", "Certificates"),
          t("Modo sin conexión", "Offline mode"),
        ],
      },
      {
        name: t("Equipos", "Teams"),
        price: 29,
        description: t("Para formar a tu equipo.", "To upskill your team."),
        features: [
          t("Todo lo del plan Pro", "Everything in Pro"),
          t("Panel de progreso del equipo", "Team progress dashboard"),
          t("Rutas personalizadas", "Custom learning paths"),
          t("Facturación centralizada", "Centralized billing"),
        ],
      },
    ],
    note: t("Ahorra un 20 % con el pago anual.", "Save 20% with annual billing."),
  },
  cta: {
    titles: [t("Tu próxima habilidad empieza hoy", "Your next skill starts today"), t("Aprende algo nuevo esta semana", "Learn something new this week")],
    subtitle: t("Únete a {name} y completa tu primera lección en diez minutos.", "Join {name} and finish your first lesson in ten minutes."),
    button: t("Empezar a aprender", "Start learning"),
  },
  kpis: [
    { id: "learners", label: t("Estudiantes activos", "Active learners"), format: "number", min: 1200, max: 8600, deltaMax: 14, icon: "users" },
    { id: "lessons", label: t("Lecciones completadas", "Lessons completed"), format: "number", min: 6000, max: 42000, deltaMax: 18, icon: "check-circle" },
    { id: "completion", label: t("Tasa de finalización", "Completion rate"), format: "percent", min: 54, max: 88, deltaMax: 6, icon: "bar-chart" },
    { id: "session", label: t("Tiempo medio por sesión", "Avg. time per session"), format: "duration", min: 480, max: 1800, deltaMax: 9, icon: "calendar" },
  ],
  chart: {
    title: t("Lecciones completadas por semana", "Lessons completed per week"),
    period: "week",
    series: [t("Web", "Web"), t("Móvil", "Mobile")],
    format: "number",
    min: 400,
    max: 3200,
  },
  table: {
    title: t("Progreso del alumnado", "Learner progress"),
    columns: [
      { key: "learner", label: t("Estudiante", "Learner"), kind: "person" },
      {
        key: "course",
        label: t("Curso", "Course"),
        kind: "choice",
        options: [
          t("Fundamentos de diseño", "Design Fundamentals"),
          t("Python desde cero", "Python from Scratch"),
          t("Inglés para el trabajo", "Business English"),
          t("Análisis de datos", "Data Analysis"),
          t("Hablar en público", "Public Speaking"),
        ],
      },
      { key: "progress", label: t("Progreso", "Progress"), kind: "percent", min: 8, max: 100 },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Al día", "On track"), tone: "success", weight: 5 },
          { label: t("En riesgo", "At risk"), tone: "warning", weight: 2 },
          { label: t("Completado", "Completed"), tone: "info", weight: 2 },
          { label: t("Inactivo", "Inactive"), tone: "neutral", weight: 1 },
        ],
      },
      { key: "last", label: t("Última actividad", "Last active"), kind: "relative" },
    ],
  },
  activity: [
    {
      text: t("completó {target}", "completed {target}"),
      targets: [t("el módulo 3 de Análisis de datos", "module 3 of Data Analysis")],
      tone: "success",
      icon: "check-circle",
    },
    {
      text: t("se inscribió en {target}", "enrolled in {target}"),
      targets: [t("Python desde cero", "Python from Scratch"), t("Hablar en público", "Public Speaking")],
      tone: "info",
      icon: "user",
    },
    {
      text: t("entregó {target}", "submitted {target}"),
      targets: [t("el proyecto final", "the final project")],
      tone: "info",
      icon: "file",
    },
    {
      text: t("obtuvo {target}", "earned {target}"),
      targets: [t("el certificado de Fundamentos de diseño", "the Design Fundamentals certificate")],
      tone: "success",
      icon: "sparkle",
    },
    {
      text: t("preguntó en {target}", "asked a question in {target}"),
      targets: [t("el foro de la lección 12", "the lesson 12 forum")],
      tone: "neutral",
      icon: "mail",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "folder", label: t("Cursos", "Courses") },
    { icon: "users", label: t("Estudiantes", "Learners") },
    { icon: "calendar", label: t("Calendario", "Calendar") },
    { icon: "bar-chart", label: t("Progreso", "Progress") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
