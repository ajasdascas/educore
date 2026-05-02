"use client";

import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { ModuleBoundary } from "@/components/providers/ModuleBoundary";
import { ModuleKey } from "@/lib/modules/registry";
import { useEnabledModules } from "@/lib/modules/use-enabled-modules";

type ModuleGuardProps = {
  moduleKey: ModuleKey;
  moduleName?: string;
  children: ReactNode;
};

export function ModuleGuard({ moduleKey, moduleName, children }: ModuleGuardProps) {
  const { loading, isModuleEnabled } = useEnabledModules();

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-muted-foreground">
        <div className="animate-pulse">Cargando modulo...</div>
      </div>
    );
  }

  if (!isModuleEnabled(moduleKey)) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-semibold">{moduleName || moduleKey} no esta activo para esta institucion</p>
          <p className="mt-1 text-sm text-muted-foreground">Pide al SuperAdmin activar el modulo en la ficha de la escuela.</p>
        </div>
      </div>
    );
  }

  return <ModuleBoundary moduleName={moduleName || String(moduleKey)}>{children}</ModuleBoundary>;
}
