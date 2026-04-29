"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getDashboardPath, User } from "@/lib/auth";

type RoleGuardProps = {
  allowedRoles: User["role"][];
  children: ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = !!user && allowedRoles.includes(user.role);

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
