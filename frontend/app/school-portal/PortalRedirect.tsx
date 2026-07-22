"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getDashboardPath,
  getSupportContext,
  setSupportContext,
  type SupportRole,
} from "@/lib/auth";

type PortalRedirectProps = {
  role: SupportRole;
};

const portalConfig: Record<
  SupportRole,
  { dashboard: string; databaseRole: "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT"; label: string }
> = {
  school_admin: {
    dashboard: "/school-admin/dashboard",
    databaseRole: "SCHOOL_ADMIN",
    label: "Administración escolar",
  },
  teacher: {
    dashboard: "/teacher/dashboard",
    databaseRole: "TEACHER",
    label: "Portal de profesores",
  },
  parent: {
    dashboard: "/parent/dashboard",
    databaseRole: "PARENT",
    label: "Portal de padres",
  },
  student: {
    dashboard: "/student/dashboard",
    databaseRole: "STUDENT",
    label: "Portal de estudiantes",
  },
};

export function PortalRedirect({ role }: PortalRedirectProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = portalConfig[role];

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const params = new URLSearchParams({ role });
      const slug = searchParams.get("slug");
      if (slug) params.set("slug", slug);
      router.replace(`/login?${params.toString()}`);
      return;
    }

    if (user.role === "SUPER_ADMIN") {
      const support = getSupportContext();
      if (!support?.tenantId) {
        router.replace("/super-admin/schools");
        return;
      }

      setSupportContext(support.tenantId, support.schoolSlug, support.schoolName, role);
      const params = new URLSearchParams({
        supportTenantId: support.tenantId,
        supportSlug: support.schoolSlug,
        supportName: support.schoolName,
        supportRole: role,
      });
      router.replace(`${config.dashboard}?${params.toString()}`);
      return;
    }

    if (user.role !== config.databaseRole) {
      router.replace(getDashboardPath(user.role));
      return;
    }

    router.replace(config.dashboard);
  }, [config, loading, role, router, searchParams, user]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 text-sm text-slate-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" aria-hidden="true" />
        Abriendo {config.label}…
      </div>
    </div>
  );
}
