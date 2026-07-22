"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, DatabaseBackup, ExternalLink, Loader2, RefreshCw, Rocket } from "lucide-react";
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
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";
import { errorMessage } from "@/lib/api-response";

type BackupJob = {
  id: string;
  tenant_name: string;
  type: string;
  status: string;
  size_mb: number;
  created_at: string;
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
  deployed_at: string;
};

const statusClass: Record<string, string> = {
  success: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
  failure: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  cancelled: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function shortText(value = "", max = 120) {
  const clean = value.trim();
  if (!clean) return "Sin descripcion breve.";
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupJob[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [backupError, setBackupError] = useState("");
  const [deploymentError, setDeploymentError] = useState("");
  const [creatingBackup, setCreatingBackup] = useState(false);
  const { toast } = useToast();

  const loadBackups = useCallback(async () => {
    setLoadingBackups(true);
    setBackupError("");
    try {
      const res = await authFetch("/api/v1/super-admin/backups");
      if (!res.success) throw new Error(res.error || res.message || "No se pudo cargar respaldos");
      setBackups(Array.isArray(res.data?.backups) ? res.data.backups : []);
    } catch (error: unknown) {
      setBackups([]);
      setBackupError(errorMessage(error, "No se pudo cargar respaldos"));
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  const loadDeployments = useCallback(async () => {
    setLoadingDeployments(true);
    setDeploymentError("");
    try {
      const res = await authFetch("/api/v1/super-admin/deployments?service=frontend&limit=50");
      if (!res.success) throw new Error(res.error || res.message || "No se pudo cargar el historial de despliegues.");
      setDeployments(Array.isArray(res.data?.deployments) ? res.data.deployments : []);
    } catch {
      setDeployments([]);
      setDeploymentError("No se pudo cargar el historial de despliegues.");
    } finally {
      setLoadingDeployments(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadBackups(), loadDeployments()]);
  }, [loadBackups, loadDeployments]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const latestDeployment = useMemo(() => deployments[0], [deployments]);

  const createBackup = async () => {
    if (!window.confirm("Se registrara un job de backup global. Confirma que quieres continuar.")) return;
    setCreatingBackup(true);
    try {
      const res = await authFetch("/api/v1/super-admin/backups", {
        method: "POST",
        body: JSON.stringify({ type: "full" }),
      });
      if (!res.success) throw new Error(res.error || res.message || "No se pudo crear el backup");
      toast({ title: "Backup solicitado", description: "El job de respaldo quedo registrado." });
      await loadBackups();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: errorMessage(error, "No se pudo crear el backup"),
        variant: "destructive",
      });
    } finally {
      setCreatingBackup(false);
    }
  };

  const copyCommit = async (commit?: string) => {
    if (!commit) return;
    try {
      await navigator.clipboard.writeText(commit);
      toast({ title: "Commit copiado", description: commit });
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Respaldos</h1>
          <p className="text-muted-foreground">
            Backups operativos separados del historial automatico de actualizaciones.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={createBackup} disabled={creatingBackup}>
            {creatingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
            Crear backup
          </Button>
        </div>
      </div>

      {latestDeployment && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ultima actualizacion registrada</p>
                <p className="font-semibold">{latestDeployment.title}</p>
                <p className="text-sm text-muted-foreground">{formatDate(latestDeployment.deployed_at)}</p>
              </div>
            </div>
            <Badge variant="outline" className={statusClass[latestDeployment.status] || ""}>
              {latestDeployment.status}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Respaldos de datos</CardTitle>
          <CardDescription>Jobs de backup y restore. Esta seccion no representa despliegues de codigo.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBackups ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando respaldos
            </div>
          ) : backupError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">
              No se pudo cargar esta vista.
            </div>
          ) : (
            <div className="rounded-md border">
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
                    backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>{formatDate(backup.created_at)}</TableCell>
                        <TableCell>{backup.tenant_name || "Global"}</TableCell>
                        <TableCell><Badge variant="outline">{backup.type}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{backup.status}</Badge></TableCell>
                        <TableCell>{Number(backup.size_mb || 0).toFixed(2)}</TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle>Historial de actualizaciones</CardTitle>
          <CardDescription>
            Despliegues exitosos o fallidos reportados automaticamente por GitHub Actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDeployments ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando historial
            </div>
          ) : deploymentError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">
              No se pudo cargar el historial de despliegues.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
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
                  {deployments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        Aún no hay despliegues registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deployments.map((deployment) => (
                      <TableRow key={deployment.id}>
                        <TableCell className="min-w-[260px]">
                          <div className="font-medium">{deployment.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {shortText(deployment.description)}
                          </div>
                        </TableCell>
                        <TableCell>{deployment.service}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusClass[deployment.status] || ""}>
                            {deployment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(deployment.deployed_at)}</TableCell>
                        <TableCell>{deployment.commit_short_sha || "-"}</TableCell>
                        <TableCell>{deployment.branch || "-"}</TableCell>
                        <TableCell>{deployment.actor || "-"}</TableCell>
                        <TableCell>{deployment.environment || "production"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!deployment.run_url}
                              onClick={() => deployment.run_url && window.open(deployment.run_url, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Ver workflow
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!deployment.commit_sha && !deployment.commit_short_sha}
                              onClick={() => copyCommit(deployment.commit_sha || deployment.commit_short_sha)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar commit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
