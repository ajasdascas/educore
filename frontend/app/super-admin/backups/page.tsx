"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Copy, DatabaseBackup, Download, Edit2, ExternalLink,
  Info, Loader2, MoreHorizontal, RefreshCw, Rocket, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

type BackupJob = {
  id: string;
  tenant_name: string;
  type: string;
  status: string;
  title?: string;
  description?: string;
  size_mb: number;
  size_bytes?: number;
  created_at: string;
  completed_at?: string;
  error?: string;
  storage_provider?: string;
  storage_key?: string;
  file_name?: string;
  downloadable?: boolean;
};

type DeploymentRecord = {
  id: string;
  environment: string;
  service: string;
  status: string;
  title: string;
  description?: string;
  commit_sha?: string;
  commit_short_sha?: string;
  branch?: string;
  actor?: string;
  run_url?: string;
  deployed_at: string;
};

const statusClass: Record<string, string> = {
  completed: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
  failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  running: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  queued: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
  restore_requested: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
  failure: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  cancelled: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function shortText(value = "", max = 120) {
  const c = value.trim();
  return c.length > max ? `${c.slice(0, max)}...` : c || "Sin descripción.";
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupJob[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [backupError, setBackupError] = useState("");
  const [deploymentError, setDeploymentError] = useState("");
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create backup modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");

  // Edit modal
  const [editBackup, setEditBackup] = useState<BackupJob | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Detail modal
  const [detailBackup, setDetailBackup] = useState<BackupJob | null>(null);

  // Delete confirm
  const [deleteBackup, setDeleteBackup] = useState<BackupJob | null>(null);

  const { toast } = useToast();

  const loadBackups = async () => {
    setLoadingBackups(true);
    setBackupError("");
    try {
      const res = await authFetch("/api/v1/super-admin/backups");
      if (!res.success) throw new Error(res.error || res.message || "No se pudo cargar respaldos");
      setBackups(Array.isArray(res.data?.backups) ? res.data.backups : []);
    } catch (error: any) {
      setBackups([]);
      setBackupError(error.message || "No se pudo cargar respaldos");
    } finally {
      setLoadingBackups(false);
    }
  };

  const loadDeployments = async () => {
    setLoadingDeployments(true);
    setDeploymentError("");
    try {
      const res = await authFetch("/api/v1/super-admin/deployments?service=frontend&limit=50");
      if (!res.success) throw new Error(res.error || res.message || "No se pudo cargar despliegues.");
      setDeployments(Array.isArray(res.data?.deployments) ? res.data.deployments : []);
    } catch {
      setDeployments([]);
      setDeploymentError("No se pudo cargar el historial de despliegues.");
    } finally {
      setLoadingDeployments(false);
    }
  };

  useEffect(() => {
    loadBackups();
    loadDeployments();
  }, []);

  const latestDeployment = useMemo(() => deployments[0], [deployments]);

  const storageNotConfigured = backups.some(b => b.status === "failed" && b.error?.includes("not configured"));
  const mysqldumpMissing = backups.some(b => b.status === "failed" && b.error?.includes("mysqldump not available"));

  const stats = useMemo(() => ({
    total: backups.length,
    completed: backups.filter(b => b.status === "completed").length,
    failed: backups.filter(b => b.status === "failed").length,
    blocked: backups.filter(b => b.status === "queued").length,
    lastCompleted: backups.find(b => b.status === "completed")?.completed_at,
  }), [backups]);

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await authFetch("/api/v1/super-admin/backups", {
        method: "POST",
        body: JSON.stringify({ type: "full", title: createTitle.trim() || undefined, description: createDesc.trim() || undefined }),
      });
      if (!res.success) throw new Error(res.error || res.message || "No se pudo crear el backup");
      toast({ title: "Backup solicitado", description: "El job de respaldo quedó registrado." });
      setShowCreateModal(false);
      setCreateTitle("");
      setCreateDesc("");
      await loadBackups();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo crear el backup", variant: "destructive" });
    } finally {
      setCreatingBackup(false);
    }
  };

  const saveEdit = async () => {
    if (!editBackup) return;
    setSavingEdit(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/backups/${editBackup.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      if (!res.success) throw new Error(res.error || res.message || "Error al guardar");
      setBackups(prev => prev.map(b => b.id === editBackup.id ? { ...b, title: editTitle, description: editDesc } : b));
      toast({ title: "Backup actualizado" });
      setEditBackup(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteBackup) return;
    setActionLoading(deleteBackup.id);
    setDeleteBackup(null);
    try {
      const res = await authFetch(`/api/v1/super-admin/backups/${deleteBackup.id}`, { method: "DELETE" });
      if (!res.success) throw new Error(res.error || res.message || "Error al eliminar");
      setBackups(prev => prev.filter(b => b.id !== deleteBackup.id));
      toast({ title: "Backup eliminado" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const downloadBackup = async (backup: BackupJob) => {
    if (!backup.downloadable) {
      toast({ title: "No disponible", description: "Este backup no tiene archivo guardado en almacenamiento.", variant: "destructive" });
      return;
    }
    setActionLoading(backup.id);
    try {
      const response = await authFetch(`/api/v1/super-admin/backups/${backup.id}/download-url`);
      if (!response.success) {
        toast({ title: "Error al generar descarga", description: response.error || response.message || "No se pudo obtener la URL de descarga.", variant: "destructive" });
        return;
      }
      const signedUrl: string = response.data?.url;
      if (!signedUrl) {
        toast({ title: "Error", description: "Respuesta inesperada del servidor.", variant: "destructive" });
        return;
      }
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast({ title: "Error de red", description: "No se pudo conectar con el servidor.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const copyCommit = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado", description: text });
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Respaldos</h1>
          <p className="text-muted-foreground">Backups operativos separados del historial de actualizaciones.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { loadBackups(); loadDeployments(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            <DatabaseBackup className="mr-2 h-4 w-4" />
            Crear backup
          </Button>
        </div>
      </div>

      {/* Latest deploy banner */}
      {latestDeployment && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última actualización registrada</p>
                <p className="font-semibold">{latestDeployment.title}</p>
                <p className="text-sm text-muted-foreground">{formatDate(latestDeployment.deployed_at)}</p>
              </div>
            </div>
            <Badge variant="outline" className={statusClass[latestDeployment.status] || ""}>{latestDeployment.status}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total backups", value: stats.total },
          { label: "Completados", value: stats.completed, color: "text-green-600" },
          { label: "Fallidos", value: stats.failed, color: "text-red-600" },
          { label: "En cola", value: stats.blocked, color: "text-slate-500" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {stats.lastCompleted && (
        <p className="text-xs text-muted-foreground">
          Último backup completado: {formatDate(stats.lastCompleted)}
        </p>
      )}

      {/* Backups table */}
      <Card>
        <CardHeader>
          <CardTitle>Respaldos de datos</CardTitle>
          <CardDescription>Jobs de backup y restore. Esta sección no representa despliegues de código.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBackups ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando respaldos
            </div>
          ) : backupError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">
              {backupError}
            </div>
          ) : (
            <>
              {storageNotConfigured && (
                <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">Backups no configurados</p>
                    <p className="mt-1 text-amber-700 dark:text-amber-400">
                      Configura <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">BACKUP_STORAGE_PROVIDER</code> (r2|s3) y las credenciales del bucket. Ver <code>docs/BACKUPS_AND_RESTORE.md</code>.
                    </p>
                  </div>
                </div>
              )}
              {mysqldumpMissing && (
                <div className="mb-4 flex items-start gap-3 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900 dark:bg-orange-950">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <p className="text-orange-700 dark:text-orange-400">
                    El runtime no tiene <code className="rounded bg-orange-100 px-1 dark:bg-orange-900">mysqldump</code>. Configura un worker en VPS o usa la variable <code>MYSQLDUMP_PATH</code>. Ver <code>docs/BACKUPS_AND_RESTORE.md</code>.
                  </p>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título / Fecha</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Completado</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="w-[50px]">Acc.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          Sin respaldos por mostrar. Presiona "Crear backup" para iniciar el primero.
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{backup.title || "—"}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(backup.created_at)}</div>
                          </TableCell>
                          <TableCell>{backup.tenant_name || "Global"}</TableCell>
                          <TableCell><Badge variant="outline">{backup.type}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusClass[backup.status] || ""}>
                              {backup.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{Number(backup.size_mb || 0).toFixed(2)} MB</TableCell>
                          <TableCell>{formatDate(backup.completed_at)}</TableCell>
                          <TableCell className="max-w-[200px]">
                            {backup.error ? (
                              <span className="block truncate text-xs text-destructive" title={backup.error}>
                                {backup.error}
                              </span>
                            ) : backup.status === "completed" && !backup.storage_key ? (
                              <span className="text-xs text-amber-600">Sin archivo guardado</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                                disabled={actionLoading === backup.id}
                                aria-label="Acciones del backup"
                              >
                                {actionLoading === backup.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDetailBackup(backup)}>
                                  Ver detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setEditBackup(backup); setEditTitle(backup.title || ""); setEditDesc(backup.description || ""); }}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Editar título
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => downloadBackup(backup)}
                                  disabled={!backup.downloadable}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  {backup.downloadable ? "Descargar" : "No disponible"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => copyCommit(backup.id)}
                                >
                                  Copiar ID
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteBackup(backup)}
                                  variant="destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Deployment history */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de actualizaciones</CardTitle>
          <CardDescription>Despliegues exitosos o fallidos reportados automáticamente por GitHub Actions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDeployments ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando historial
            </div>
          ) : deploymentError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">
              {deploymentError}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
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
                        Aún no hay despliegues registrados. Se registrarán automáticamente después del próximo deploy.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deployments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="min-w-[220px]">
                          <div className="font-medium">{d.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{shortText(d.description)}</div>
                        </TableCell>
                        <TableCell>{d.service}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusClass[d.status] || ""}>{d.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(d.deployed_at)}</TableCell>
                        <TableCell>{d.commit_short_sha || "—"}</TableCell>
                        <TableCell>{d.branch || "—"}</TableCell>
                        <TableCell>{d.actor || "—"}</TableCell>
                        <TableCell>{d.environment || "production"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" disabled={!d.run_url} onClick={() => d.run_url && window.open(d.run_url, "_blank", "noopener,noreferrer")}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Ver workflow
                            </Button>
                            <Button variant="outline" size="sm" disabled={!d.commit_sha && !d.commit_short_sha} onClick={() => copyCommit(d.commit_sha || d.commit_short_sha || "")}>
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

      {/* Create backup modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Crear backup</DialogTitle>
            <DialogDescription>Se registrará un job de respaldo global completo.</DialogDescription>
          </DialogHeader>
          {storageNotConfigured && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>El almacenamiento externo no está configurado. El backup fallará hasta que se configure <code>BACKUP_STORAGE_PROVIDER</code>.</span>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-title">Título (opcional)</Label>
              <Input id="create-title" value={createTitle} onChange={e => setCreateTitle(e.target.value)} placeholder="Ej: Antes de actualización v2.1" />
            </div>
            <div>
              <Label htmlFor="create-desc">Descripción (opcional)</Label>
              <Textarea id="create-desc" value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Motivo del respaldo..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={creatingBackup}>Cancelar</Button>
            <Button onClick={createBackup} disabled={creatingBackup}>
              {creatingBackup ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : "Crear backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit backup modal */}
      {editBackup && (
        <Dialog open onOpenChange={() => setEditBackup(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Editar backup</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Título</Label>
                <Input id="edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-desc">Descripción</Label>
                <Textarea id="edit-desc" value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditBackup(null)} disabled={savingEdit}>Cancelar</Button>
              <Button onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail modal */}
      {detailBackup && (
        <Dialog open onOpenChange={() => setDetailBackup(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Detalle del backup</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs break-all">{detailBackup.id}</span>
                <span className="text-muted-foreground">Título</span>
                <span>{detailBackup.title || "—"}</span>
                <span className="text-muted-foreground">Descripción</span>
                <span>{detailBackup.description || "—"}</span>
                <span className="text-muted-foreground">Estado</span>
                <Badge variant="outline" className={`w-fit ${statusClass[detailBackup.status] || ""}`}>{detailBackup.status}</Badge>
                <span className="text-muted-foreground">Tipo</span>
                <span>{detailBackup.type}</span>
                <span className="text-muted-foreground">Scope</span>
                <span>{detailBackup.tenant_name || "Global"}</span>
                <span className="text-muted-foreground">Tamaño</span>
                <span>{Number(detailBackup.size_mb || 0).toFixed(2)} MB</span>
                <span className="text-muted-foreground">Creado</span>
                <span>{formatDate(detailBackup.created_at)}</span>
                <span className="text-muted-foreground">Completado</span>
                <span>{formatDate(detailBackup.completed_at)}</span>
                <span className="text-muted-foreground">Storage</span>
                <span>{detailBackup.storage_provider || "—"}</span>
                <span className="text-muted-foreground">Archivo</span>
                <span className="font-mono text-xs break-all">{detailBackup.storage_key ? "✓ guardado" : "—"}</span>
                {detailBackup.error && (
                  <>
                    <span className="text-muted-foreground">Error</span>
                    <span className="text-destructive text-xs">{detailBackup.error}</span>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailBackup(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirm */}
      {deleteBackup && (
        <Dialog open onOpenChange={() => setDeleteBackup(null)}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle>Eliminar backup</DialogTitle>
              <DialogDescription>{deleteBackup.title || deleteBackup.id}</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta acción ocultará el backup del sistema. El registro de auditoría se conservará. El archivo en almacenamiento externo NO se borrará automáticamente.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteBackup(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
