"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ENABLED_MODULES,
  EnabledModule,
  ModuleKey,
  fetchEnabledModules,
  moduleMatches,
} from "@/lib/modules/registry";

export function useEnabledModules() {
  const [modules, setModules] = useState<EnabledModule[]>(DEFAULT_ENABLED_MODULES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setModules(await fetchEnabledModules());
    } catch (err) {
      setModules(DEFAULT_ENABLED_MODULES);
      setError(err instanceof Error ? err.message : "No se pudo cargar la configuracion modular.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enabledKeys = useMemo(() => new Set(modules.map((module) => module.key)), [modules]);

  const isModuleEnabled = useCallback(
    (moduleKey: ModuleKey) => moduleMatches(modules, moduleKey),
    [modules]
  );

  return {
    modules,
    enabledKeys,
    loading,
    error,
    refresh,
    isModuleEnabled,
  };
}
