"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  GraduationCap,
  LayoutDashboard,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getSupportContext,
  setSupportContext,
  type SupportRole,
  type User,
} from "@/lib/auth";

type PortalDefinition = {
  key: string;
  label: string;
  description: string;
  roleLabel: string;
  icon: typeof LayoutDashboard;
  color: keyof typeof COLORS;
  supportRole: SupportRole;
  databaseRole: User["role"];
  dashboard: string;
  available: boolean;
};

const COLORS = {
  blue: {
    bg: "bg-blue-500/10",
    icon: "text-blue-400",
    border: "border-blue-500/20",
    button: "bg-blue-600 hover:bg-blue-500",
  },
  purple: {
    bg: "bg-purple-500/10",
    icon: "text-purple-400",
    border: "border-purple-500/20",
    button: "bg-purple-600 hover:bg-purple-500",
  },
  green: {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-400",
    border: "border-emerald-500/20",
    button: "bg-emerald-600 hover:bg-emerald-500",
  },
  orange: {
    bg: "bg-orange-500/10",
    icon: "text-orange-400",
    border: "border-orange-500/20",
    button: "bg-orange-600 hover:bg-orange-500",
  },
} as const;

const PORTALS: PortalDefinition[] = [
  {
    key: "school-admin",
    label: "Administración Escolar",
    description: "Gestión institucional del núcleo académico y de los módulos liberados para la escuela.",
    roleLabel: "administrador escolar",
    icon: LayoutDashboard,
    color: "blue",
    supportRole: "school_admin",
    databaseRole: "SCHOOL_ADMIN",
    dashboard: "/school-admin/dashboard",
    available: true,
  },
  {
    key: "teachers",
    label: "Portal de Profesores",
    description: "Cerrado hasta completar la validación PostgreSQL, el aislamiento entre escuelas y el E2E publicado.",
    roleLabel: "profesor",
    icon: GraduationCap,
    color: "purple",
    supportRole: "teacher",
    databaseRole: "TEACHER",
    dashboard: "/teacher/dashboard",
    available: false,
  },
  {
    key: "parents",
    label: "Portal de Padres",
    description: "Cerrado hasta completar la auditoría padre-hijo y las dependencias de documentos, pagos y comunicación.",
    roleLabel: "padre o tutor",
    icon: Users,
    color: "green",
    supportRole: "parent",
    databaseRole: "PARENT",
    dashboard: "/parent/dashboard",
    available: false,
  },
  {
    key: "students",
    label: "Portal de Estudiantes",
    description: "Cerrado hasta completar la validación PostgreSQL, el aislamiento entre escuelas y el E2E publicado.",
    roleLabel: "estudiante",
    icon: UserCheck,
    color: "orange",
    supportRole: "student",
    databaseRole: "STUDENT",
    dashboard: "/student/dashboard",
    available: false,
  },
];

export default function SchoolPortalPage() {
  const { user } = useAuth();
  const router = useRouter();

  const openPortal = (portal: PortalDefinition) => {
    if (!user) return;

    if (user.role === "SUPER_ADMIN") {
      const support = getSupportContext();
      if (!support?.tenantId) {
        router.push("/super-admin/schools");
        return;
      }

      setSupportContext(
        support.tenantId,
        support.schoolSlug,
        support.schoolName,
        portal.supportRole,
      );
      const params = new URLSearchParams({
        supportTenantId: support.tenantId,
        supportSlug: support.schoolSlug,
        supportName: support.schoolName,
        supportRole: portal.supportRole,
      });
      router.push(`${portal.dashboard}?${params.toString()}`);
      return;
    }

    if (user.role === portal.databaseRole) {
      router.push(portal.dashboard);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-white">Portales por rol</h1>
        <p className="text-sm text-slate-400">
          Solo los portales que completaron su gate de producción pueden abrirse. Los demás permanecen visibles con su bloqueo explícito.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PORTALS.map((portal) => {
          const colors = COLORS[portal.color];
          const Icon = portal.icon;
          const canOpen = portal.available && (user?.role === "SUPER_ADMIN" || user?.role === portal.databaseRole);

          return (
            <section
              key={portal.key}
              className={`flex flex-col gap-5 rounded-2xl border bg-slate-900/60 p-6 ${colors.border}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg}`}>
                <Icon className={`h-6 w-6 ${colors.icon}`} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="mb-1.5 font-semibold text-white">{portal.label}</h2>
                <p className="text-sm leading-relaxed text-slate-400">{portal.description}</p>
              </div>
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => openPortal(portal)}
                className={`inline-flex self-start items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 ${canOpen ? colors.button : ""}`}
              >
                {canOpen ? "Abrir portal" : portal.available ? `Requiere rol ${portal.roleLabel}` : "Auditoría pendiente"}
                {canOpen && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
