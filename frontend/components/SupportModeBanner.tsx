"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupportContext, clearSupportContext, isSupportMode, type SupportRole } from "@/lib/auth";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X } from "lucide-react";

const ROLE_LABELS: Record<SupportRole, string> = {
  school_admin: "Director / Coordinador",
  teacher: "Profesor",
  parent: "Padre de familia",
  student: "Estudiante",
};

export function SupportModeBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [ctx, setCtx] = useState<{
    tenantId: string;
    schoolSlug: string;
    schoolName: string;
    supportRole?: SupportRole;
  } | null>(null);

  useEffect(() => {
    if (isSupportMode() && user?.role === "SUPER_ADMIN") {
      setCtx(getSupportContext());
    }
  }, [user]);

  if (!ctx) return null;

  const roleLabel = ctx.supportRole ? ROLE_LABELS[ctx.supportRole] : null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="font-semibold">Modo Soporte:</span>
        {roleLabel && (
          <>
            <span className="bg-amber-500/20 px-1.5 py-0.5 rounded text-xs font-semibold">
              viendo como {roleLabel}
            </span>
            <span className="text-amber-600 dark:text-amber-400">en</span>
          </>
        )}
        <span>{ctx.schoolName}</span>
        <span className="font-mono text-xs opacity-70">({ctx.schoolSlug})</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
        onClick={() => {
          clearSupportContext();
          router.push("/super-admin/schools");
        }}
      >
        <X className="w-3 h-3 mr-1" /> Salir
      </Button>
    </div>
  );
}
