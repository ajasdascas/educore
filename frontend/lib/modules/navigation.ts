/**
 * navigation.ts — Fuente única de verdad para los ítems de navegación.
 *
 * REGLA: Ningún layout debe hardcodear hrefs fuera de este archivo.
 * Todos los layouts importan su array de NavItem desde aquí.
 *
 * Filtrado: los ítems con `moduleKey` sólo se muestran si ese módulo
 * está habilitado para el tenant. Los ítems sin `moduleKey` siempre se muestran.
 */

import {
  // Core icons
  LayoutDashboard,
  GraduationCap,
  Users,
  Calendar,
  BookOpen,
  ClipboardCheck,
  NotebookPen,
  FileText,
  FileCheck2,
  FolderOpen,
  MessageCircle,
  CreditCard,
  Settings,
  Building2,
  Bell,
  User,
  KeyRound,
  Clock,
  Megaphone,
  Star,
  MessageSquare,
  // Kinder / guardería
  Baby,
  Apple,
  Moon,
  Droplets,
  Smile,
  Heart,
  AlertTriangle,
  LogIn,
  Milestone,
  Camera,
  // Preescolar
  ActivitySquare,
  Brain,
  Eye,
  Zap,
  BookMarked,
  ClipboardList,
  // Admin
  Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Clave del módulo — si se especifica, el ítem sólo aparece cuando el módulo está habilitado */
  moduleKey?: string;
};

// ─── School Admin ────────────────────────────────────────────────────────────

export const SCHOOL_ADMIN_NAV: NavItem[] = [
  // Core — siempre visible
  { href: "/school-admin/dashboard",    label: "Dashboard",            icon: LayoutDashboard },
  { href: "/school-admin/academic",     label: "Estructura",           icon: BookOpen,        moduleKey: "academic_core" },
  { href: "/school-admin/students",     label: "Estudiantes",          icon: GraduationCap,   moduleKey: "users" },
  { href: "/school-admin/teachers",     label: "Profesores",           icon: Users,           moduleKey: "users" },
  { href: "/school-admin/groups",       label: "Grupos",               icon: Users,           moduleKey: "academic_core" },
  { href: "/school-admin/schedule",     label: "Horarios",             icon: Calendar,        moduleKey: "schedules" },
  { href: "/school-admin/attendance",   label: "Asistencias",          icon: ClipboardCheck,  moduleKey: "attendance" },

  // Módulos Kinder / Guardería / Bebés (supervisión — operaciones diarias dentro de Registro diario)
  // NOTA: meals/naps/diapers/mood están como sub-tabs DENTRO de /school-admin/daily-logs.
  // Las URLs flat /school-admin/{meals,naps,diapers,mood} siguen funcionando como aliases para acceso directo.
  { href: "/school-admin/daily-logs",   label: "Registro diario",      icon: Baby,            moduleKey: "daily_logs" },
  { href: "/school-admin/health",       label: "Salud",                icon: Heart,           moduleKey: "health_checks" },
  { href: "/school-admin/incidents",    label: "Incidentes",           icon: AlertTriangle,   moduleKey: "incidents" },
  { href: "/school-admin/pickup",       label: "Autorizaciones",       icon: LogIn,           moduleKey: "pickup_authorizations" },
  { href: "/school-admin/milestones",   label: "Hitos",                icon: Milestone,       moduleKey: "milestones" },
  { href: "/school-admin/photos",       label: "Fotos/Evidencias",     icon: Camera,          moduleKey: "photos_evidence" },
  { href: "/school-admin/child-status", label: "Estado del niño",      icon: Star,            moduleKey: "child_status" },

  // Módulos Preescolar / Kinder
  { href: "/school-admin/qualitative",            label: "Evaluaciones",       icon: ActivitySquare, moduleKey: "qualitative_assessments" },
  { href: "/school-admin/development",            label: "Áreas de desarrollo",icon: Brain,          moduleKey: "development_areas" },
  { href: "/school-admin/observations",           label: "Observaciones",      icon: Eye,            moduleKey: "observations" },
  { href: "/school-admin/activities",             label: "Actividades",        icon: Zap,            moduleKey: "activities" },
  { href: "/school-admin/preschool-report-cards", label: "Boletas preescolar", icon: BookMarked,     moduleKey: "preschool_report_cards" },

  // Módulos Primaria
  { href: "/school-admin/grades",       label: "Calificaciones",       icon: NotebookPen,     moduleKey: "grading" },
  { href: "/school-admin/report-cards", label: "Boletas",              icon: FileCheck2,      moduleKey: "report_cards" },

  // Administración general
  { href: "/school-admin/documents",      label: "Documentos",         icon: FolderOpen,      moduleKey: "documents" },
  { href: "/school-admin/payments",       label: "Pagos",              icon: CreditCard,      moduleKey: "payments" },
  { href: "/school-admin/reports",        label: "Reportes",           icon: FileText,        moduleKey: "reports" },
  { href: "/school-admin/communications", label: "Comunicaciones",     icon: MessageCircle,   moduleKey: "communications" },
  { href: "/school-admin/database",       label: "Base de datos",      icon: Database,        moduleKey: "database_admin" },
  { href: "/school-admin/settings",       label: "Configuración",      icon: Settings },
];

// ─── Teacher ─────────────────────────────────────────────────────────────────

export const TEACHER_NAV: NavItem[] = [
  // Core — siempre visible
  { href: "/teacher/dashboard",     label: "Dashboard",        icon: LayoutDashboard },
  { href: "/teacher/classes",       label: "Mis Grupos",       icon: BookOpen,       moduleKey: "academic_core" },

  // Kinder / Guardería — operaciones diarias
  { href: "/teacher/kinder/daily-logs",            label: "Registro diario",  icon: Baby,           moduleKey: "daily_logs" },
  { href: "/teacher/kinder/meals",                 label: "Comidas",          icon: Apple,          moduleKey: "meals" },
  { href: "/teacher/kinder/naps",                  label: "Siestas",          icon: Moon,           moduleKey: "naps" },
  { href: "/teacher/kinder/diapers",               label: "Higiene",          icon: Droplets,       moduleKey: "diapers" },
  { href: "/teacher/kinder/mood",                  label: "Estado emocional", icon: Smile,          moduleKey: "mood" },
  { href: "/teacher/kinder/health-checks",         label: "Salud",            icon: Heart,          moduleKey: "health_checks" },
  { href: "/teacher/kinder/incidents",             label: "Incidentes",       icon: AlertTriangle,  moduleKey: "incidents" },
  { href: "/teacher/kinder/pickup-authorizations", label: "Autorizaciones",   icon: LogIn,          moduleKey: "pickup_authorizations" },
  { href: "/teacher/kinder/milestones",            label: "Hitos",            icon: Milestone,      moduleKey: "milestones" },
  { href: "/teacher/kinder/photos-evidence",       label: "Fotos/Evidencias", icon: Camera,         moduleKey: "photos_evidence" },
  { href: "/teacher/kinder/child-status",          label: "Estado del niño",  icon: Star,           moduleKey: "child_status" },

  // Preescolar — módulos académicos
  { href: "/teacher/preschool/qualitative-assessments", label: "Evaluaciones",       icon: ActivitySquare, moduleKey: "qualitative_assessments" },
  { href: "/teacher/preschool/development-areas",       label: "Áreas de desarrollo",icon: Brain,          moduleKey: "development_areas" },
  { href: "/teacher/preschool/observations",            label: "Observaciones",      icon: Eye,            moduleKey: "observations" },
  { href: "/teacher/preschool/activities",              label: "Actividades",        icon: Zap,            moduleKey: "activities" },
  { href: "/teacher/preschool/behavior-notes",          label: "Conducta",           icon: AlertTriangle,  moduleKey: "behavior_notes" },
  { href: "/teacher/preschool/report-cards",            label: "Boletas Preescolar", icon: BookMarked,     moduleKey: "preschool_report_cards" },
  { href: "/teacher/preschool/socioemotional",          label: "Socioemocional",     icon: Smile,          moduleKey: "socioemotional" },

  // Primaria — académico
  { href: "/teacher/grades",        label: "Calificaciones",   icon: FileText,       moduleKey: "grading" },
  { href: "/teacher/attendance",    label: "Asistencia",       icon: Calendar,       moduleKey: "attendance" },
  { href: "/teacher/schedule",      label: "Mi Horario",       icon: Clock,          moduleKey: "schedules" },

  // Comunes
  { href: "/teacher/messages",      label: "Mensajes",         icon: MessageCircle,  moduleKey: "communications" },
  { href: "/teacher/notifications", label: "Avisos",           icon: Megaphone },
  { href: "/teacher/profile",       label: "Mi Perfil",        icon: User },
  { href: "/teacher/security",      label: "Seguridad",        icon: KeyRound },
  { href: "/teacher/settings",      label: "Configuración",    icon: Settings },
];

// ─── Parent ───────────────────────────────────────────────────────────────────

export const PARENT_NAV: NavItem[] = [
  // Core — siempre visible
  { href: "/parent/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/parent/children",   label: "Mis Hijos",    icon: GraduationCap },

  // Kinder / Guardería — consulta diaria
  { href: "/parent/daily-logs",  label: "Registro Diario",  icon: ClipboardList,  moduleKey: "daily_logs" },
  { href: "/parent/meals",       label: "Comidas",           icon: Apple,          moduleKey: "meals" },
  { href: "/parent/naps",        label: "Siestas",           icon: Moon,           moduleKey: "naps" },
  { href: "/parent/diapers",     label: "Higiene",           icon: Droplets,       moduleKey: "diapers" },
  { href: "/parent/mood",        label: "Estado Emocional",  icon: Smile,          moduleKey: "mood" },
  { href: "/parent/incidents",   label: "Incidentes",        icon: AlertTriangle,  moduleKey: "incidents" },

  // Kinder adicionales
  { href: "/parent/kinder/health-checks",          label: "Salud",            icon: Heart,          moduleKey: "health_checks" },
  { href: "/parent/kinder/pickup-authorizations",  label: "Autorizaciones",   icon: LogIn,          moduleKey: "pickup_authorizations" },
  { href: "/parent/kinder/milestones",             label: "Hitos",            icon: Milestone,      moduleKey: "milestones" },
  { href: "/parent/kinder/photos-evidence",        label: "Fotos/Evidencias", icon: Camera,         moduleKey: "photos_evidence" },
  { href: "/parent/kinder/child-status",           label: "Estado del niño",  icon: Star,           moduleKey: "child_status" },

  // Preescolar
  { href: "/parent/preschool/qualitative-assessments", label: "Evaluaciones",       icon: ActivitySquare, moduleKey: "qualitative_assessments" },
  { href: "/parent/preschool/development-areas",       label: "Áreas de desarrollo",icon: Brain,          moduleKey: "development_areas" },
  { href: "/parent/preschool/observations",            label: "Observaciones",      icon: Eye,            moduleKey: "observations" },
  { href: "/parent/preschool/activities",              label: "Actividades",        icon: Zap,            moduleKey: "activities" },
  { href: "/parent/preschool/report-cards",            label: "Boletas Preescolar", icon: BookMarked,     moduleKey: "preschool_report_cards" },

  // Primaria / General
  { href: "/parent/grades",      label: "Calificaciones",    icon: FileText,       moduleKey: "grading" },
  { href: "/parent/attendance",  label: "Asistencia",        icon: Calendar,       moduleKey: "attendance" },
  { href: "/parent/messages",    label: "Mensajes",          icon: MessageCircle,  moduleKey: "communications" },
  { href: "/parent/documents",   label: "Documentos",        icon: FolderOpen,     moduleKey: "documents" },
  { href: "/parent/payments",    label: "Pagos",             icon: CreditCard,     moduleKey: "payments" },
  { href: "/parent/consents",    label: "Permisos",          icon: ClipboardCheck },
  { href: "/parent/notifications", label: "Notificaciones",  icon: Bell },
  { href: "/parent/profile",     label: "Mi Perfil",         icon: User },
  { href: "/parent/settings",    label: "Configuración",     icon: Settings },
];

// ─── Student ──────────────────────────────────────────────────────────────────

export const STUDENT_NAV: NavItem[] = [
  // Core — siempre visible
  { href: "/student/dashboard",  label: "Dashboard",          icon: LayoutDashboard },
  { href: "/student/profile",    label: "Mi Perfil",          icon: User },

  // Preescolar / Kinder — evaluaciones y desarrollo
  { href: "/student/qualitative-assessments", label: "Mis Evaluaciones",  icon: Star,          moduleKey: "qualitative_assessments" },
  { href: "/student/development-areas",       label: "Campos Formativos", icon: BookMarked,    moduleKey: "development_areas" },
  { href: "/student/observations",            label: "Observaciones",     icon: MessageSquare, moduleKey: "observations" },
  { href: "/student/preschool/evidence",      label: "Evidencias",        icon: FolderOpen,    moduleKey: "photos_evidence" },

  // Primaria — académico
  { href: "/student/grades",      label: "Calificaciones",    icon: BookOpen,       moduleKey: "grading" },
  { href: "/student/assignments", label: "Tareas",            icon: BookMarked,     moduleKey: "assignments" },
  { href: "/student/attendance",  label: "Asistencia",        icon: ClipboardCheck, moduleKey: "attendance" },
  { href: "/student/schedule",    label: "Horario",           icon: Calendar,       moduleKey: "schedules" },

  // Comunes
  { href: "/student/messages",      label: "Mensajes",        icon: MessageCircle,  moduleKey: "communications" },
  { href: "/student/notifications", label: "Notificaciones",  icon: Bell },
  { href: "/student/settings",      label: "Configuración",   icon: Settings },
];
