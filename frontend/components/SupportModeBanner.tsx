"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupportContext, clearSupportContext, isSupportMode } from "@/lib/auth";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X } from "lucide-react";

export function SupportModeBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [ctx, setCtx] = useState<{ tenantId: string; schoolSlug: string; schoolName: string } | null>(null);

  useEffect(() => {
    if (isSupportMode() && user?.role === "SUPER_ADMIN") {
      setCtx(getSupportContext());
    }
  }, [user]);

  if (!ctx) return null;

  return (
    <div className="bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="font-semibold">Modo Soporte:</span>
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
