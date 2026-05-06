"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Clipboard,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

type BackupJob = {
  id?: string;
  created_at?: string;
  tenant_name?: string;
  type?: string;
  status?: string;
  size_mb?: number | string;
  completed_at?: string;
};

type DeploymentRecord = {
  id: string;
  environment: string;
  service: string;
  provider: string;
  status: "success" | "failure" | "in_progress" | "cancelled" | string;
  title: string;
  description?: string;
  commit_sha?: string;
  commit_short_sha?: string;
  branch?: string;
  actor?: string;
  repository?: string;
  workflow_name?: string;
  run_id?: string;
  run_number?: string;
  run_attempt?: string;
  run_url?: string;
  deployed_at?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function shortText(value?: string, max = 150) {
  const text = (value || "").trim();
  if (!text) return "-";
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function statusClass(status?: string) {
  switch (status) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300";
    case "failure":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300";
    case "in_progress":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300";
    case "cancelled":
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
    default:
      return "";
  }
}

function readBackups(payload: unknown): BackupJob[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { backups?: BackupJob[] };
  return Array.isArray(data.backups) ? data.backups : [];
}

function readDeployments(payload: unknown): DeploymentRecord[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { deployments?: DeploymentRecord[] };
  return Array.isArray(data.deployments) ? data.deployments : [];
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupJob[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [backupsError, setBackupsError] = useState("");
  const [deploymentsError, setDeploymentsError] = useState("");
  const [creatingBackup, setCreatingBackup] = useState(false);
  const { toast } = useToast();

  const latestDeployment = useMemo(() => deployments[0], [deployments]);

  const loadBackups = useCallback(async () => {
    setLoadingBackups(true);
    setBackupsError("");
    try {
      const res = await authFetch("/api/v1/super-admin/backups");
      if (!res.success) throw new Error(res.message || res.error || "No se pudo cargar respaldos.");
      setBackups(readBackups(res.data));
    } catch (error: any) {
      setBackups([]);
      setBackupsError(error.message || "No se pudo cargar respaldos.");
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  const loadDeployments = useCallback(async () => {
    setLoadingDeployments(true);
    setDeploymentsError("");
    try {
      const res = await authFetch("/api/v1/super-admin/deployments?service=frontend&limit=50");
      if (!res.success) {
        throw new Error(res.message || res.error || "No se pudo cargar el historial de despliegues.");
      }
      setDeployments(readDeployments(res.data));
    } catch {
      setDeployments([]);
      setDeploymentsError("No se pudo cargar el historial de despliegues.");
    } finally {
      setLoadingDeployments(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    void loadBackups();
    void loadDeployments();
  }, [loadBackups, loadDeployments]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const createBackup = async () => {
    if (!window.confirm("Se registrara un job de backup global. Confirma que quieres continuar.")) return;
    setCreatingBackup(true);
    try {
      const res = await authFetch("/api/v1/super-admin/backups", {
        method: "POST",
        body: JSON.stringify({ type: "full" }),
      });
      if (!res.success) throw new Error(res.message || res.error || "No se pudo crear el backup.");
      toast({ title: "Backup solicitado", description: "El job de respaldo quedo registrado." });
      await loadBackups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el backup.",
        variant: "destructive",
      });
    } finally {
      setCreatingBackup(false);
    }
  };

  const copyCommit = async (deployment: DeploymentRecord) => {
    const commit = deployment.commit_sha || deployment.commit_short_sha;
    if (!commit) return;
    try {
      await navigator.clipboard.writeText(commit);
      toast({ title: "Commit copiado", description: deployment.commit_short_sha || commit });
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Copia el commit manualmente desde el registro.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Respaldos</h1>
          <p className="text-sm text-muted-foreground">
            Jobs de respaldo y registro operativo de actualizaciones en produccion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={createBackup} disabled={creatingBackup}>
            {creatingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Crear backup
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Respaldos de datos</h2>
            <p className="text-sm text-muted-foreground">Backups y solicitudes protegidas de restore.</p>
          </div>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Jobs de backup</CardTitle>
            <CardDescription>{backups.length} registros visibles</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBackups ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando respaldos
              </div>
            ) : backupsError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="font-medium text-destructive">No se pudo cargar respaldos.</p>
                <Button variant="outline" className="mt-4" onClick={loadBackups}>
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tamano MB</TableHead>
                      <TableHead>Completado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Sin respaldos por mostrar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup, index) => (
                        <TableRow key={backup.id || index}>
                          <TableCell>{formatDate(backup.created_at)}</TableCell>
                          <TableCell>{backup.tenant_name || "Global"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{backup.type || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{backup.status || "-"}</Badge>
                          </TableCell>
                          <TableCell>{backup.size_mb ?? "-"}</TableCell>
                          <TableCell>{formatDate(backup.completed_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Historial de actualizaciones</h2>
            <p className="text-sm text-muted-foreground">
              Deploys reportados por GitHub Actions despues de subir el frontend a Hostinger.
            </p>
          </div>
        </div>
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Despliegues registrados</CardTitle>
                <CardDescription>
                  {latestDeployment
                    ? `Ultimo deploy: ${formatDate(latestDeployment.deployed_at)}`
                    : `${deployments.length} registros visibles`}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadDeployments}>
                <RefreshCw className="h-4 w-4" />
                Actualizar historial
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDeployments ? (
              <div className="flex h-36 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando historial
              </div>
            ) : deploymentsError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="font-medium text-destructive">No se pudo cargar el historial de despliegues.</p>
                <Button variant="outline" className="mt-4" onClick={loadDeployments}>
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : deployments.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                Aún no hay despliegues registrados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[260px]">Actualizacion</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha/hora</TableHead>
                      <TableHead>Commit</TableHead>
                      <TableHead>Rama</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Ambiente</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deployments.map((deployment) => (
                      <TableRow key={deployment.id}>
                        <TableCell className="max-w-[320px]">
                          <div className="font-medium">{shortText(deployment.title, 80)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {shortText(deployment.description, 180)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{deployment.service || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusClass(deployment.status)}>
                            {deployment.status || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(deployment.deployed_at)}</TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {deployment.commit_short_sha || "-"}
                          </code>
                        </TableCell>
                        <TableCell>{deployment.branch || "-"}</TableCell>
                        <TableCell>{deployment.actor || "-"}</TableCell>
                        <TableCell>{deployment.environment || "-"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!deployment.run_url}
                              onClick={() => deployment.run_url && window.open(deployment.run_url, "_blank", "noreferrer")}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ver workflow
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!deployment.commit_sha && !deployment.commit_short_sha}
                              onClick={() => copyCommit(deployment)}
                            >
                              <Clipboard className="h-4 w-4" />
                              Copiar commit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
