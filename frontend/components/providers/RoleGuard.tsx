"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getDashboardPath, User } from "@/lib/auth";

type RoleGuardProps = {
  allowedRoles: Array<"SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT">;
  children: ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  // SUPER_ADMIN tiene acceso universal a todas las rutas sin excepción
  const allowed = !!user && (user.role === "SUPER_ADMIN" || allowedRoles.includes(user.role));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!allowed) {
      router.replace(getDashboardPath(user.role));
    }
  }, [allowed, allowedRoles, loading, router, user]);

  if (loading || !user || !allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return <>{children}</>;
}
