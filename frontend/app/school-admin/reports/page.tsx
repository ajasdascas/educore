"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar, Download, Eye, FileText, Loader2, Plus, RefreshCw, Search, Trash2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";
import { ModuleGuard } from "@/components/providers/ModuleGuard";

type ReportStatus = "completed" | "scheduled" | "failed" | "pending";

type SchoolReport = {
  id: string;
  name: string;
  type: string;
  status: ReportStatus;
  format: string;
  group_id: string;
  group_name: string;
  start_date: string;
  end_date: string;
  generated_by: string;
  created_at: string;
  completed_at?: string;
  summary: {
    attendance_rate: number;
    average_grade: number;
    total_students: number;
    risk_students: number;
    generated_files: number;
  };
  insights: string[];
};

type SchoolGroup = {
  id: string;
  name: string;
  grade_name: string;
  status: string;
};

type ReportFormState = {
  type: string;
  format: string;
  group_id: string;
  start_date: string;
  end_date: string;
  include_charts: boolean;
  include_details: boolean;
};

const reportTypes = [
  { value: "academic_summary", label: "Resumen academico" },
  { value: "attendance", label: "Asistencia" },
  { value: "grades", label: "Calificaciones" },
  { value: "behavior", label: "Conducta" },
  { value: "financial", label: "Financiero" },
];

const formats = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel/CSV" },
  { value: "csv", label: "CSV" },
];

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

const emptyForm: ReportFormState = {
  type: "academic_summary",
  format: "pdf",
  group_id: "all",
  start_date: monthStart,
  end_date: today,
  include_charts: true,
  include_details: true,
};

function normalizeReports(response: any): SchoolReport[] {
  const raw = response?.data?.reports || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeGroups(response: any): SchoolGroup[] {
  const raw = response?.data?.groups || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function reportTypeLabel(type: string) {
  return reportTypes.find((item) => item.value === type)?.label || type;
}

function statusLabel(status: ReportStatus) {
  return {
    completed: "Completado",
    scheduled: "Programado",
    failed: "Fallido",
    pending: "Pendiente",
  }[status] || status;
}

function statusVariant(status: ReportStatus) {
  return status === "completed" ? "default" : status === "failed" ? "destructive" : "outline";
}

function formatDate(value: string) {
  if (!value) return "No disponible";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function SchoolReportsContent() {
  const { toast } = useToast();
  const [reports, setReports] = useState<SchoolReport[]>([]);
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SchoolReport | null>(null);
  const [form, setForm] = useState<ReportFormState>(emptyForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsResponse, groupsResponse] = await Promise.all([
        authFetch("/api/v1/school-admin/reports"),
        authFetch("/api/v1/school-admin/academic/groups"),
      ]);
      setReports(normalizeReports(reportsResponse));
      setGroups(normalizeGroups(groupsResponse));
    } catch (error) {
      toast({
        title: "No se pudieron cargar reportes",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch = !term || `${report.name} ${report.group_name} ${report.generated_by}`.toLowerCase().includes(term);
      const matchesType = typeFilter === "all" || report.type === typeFilter;
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const completed = reports.filter((report) => report.status === "completed");
    const scheduled = reports.filter((report) => report.status === "scheduled");
    const latestSummary = completed[0]?.summary;
    return {
      total: reports.length,
      completed: completed.length,
      scheduled: scheduled.length,
      attendance: Math.round(latestSummary?.attendance_rate || 0),
      average: Math.round(latestSummary?.average_grade || 0),
      risk: latestSummary?.risk_students || 0,
    };
  }, [reports]);

  const openGenerate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openDetail = async (report: SchoolReport) => {
    setSelectedReport(report);
    setDetailOpen(true);
    try {
      const response = await authFetch(`/api/v1/school-admin/reports/${report.id}`);
      if (response?.success && response.data) setSelectedReport(response.data);
    } catch {
      setSelectedReport(report);
    }
  };

  const generateReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.start_date > form.end_date) {
      toast({ title: "Rango invalido", description: "La fecha inicial debe ser anterior a la fecha final.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const response = await authFetch("/api/v1/school-admin/reports/generate", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo generar el reporte.");
      toast({ title: "Reporte generado", description: "El reporte quedo disponible en el historial." });
      setFormOpen(false);
      await loadData();
    } catch (error) {
      toast({
        title: "No se pudo generar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const rerunReport = async (report: SchoolReport) => {
    try {
      setSaving(true);
      const response = await authFetch("/api/v1/school-admin/reports/generate", {
        method: "POST",
        body: JSON.stringify({
          type: report.type,
          format: report.format,
          group_id: report.group_id,
          start_date: report.start_date,
          end_date: report.end_date,
          include_charts: true,
          include_details: true,
        }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo reprocesar.");
      toast({ title: "Reporte reprocesado", description: "Se genero una copia actualizada." });
      await loadData();
    } catch (error) {
      toast({
        title: "No se pudo reprocesar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportReport = async (report: SchoolReport) => {
    try {
      const response = await authFetch(`/api/v1/school-admin/reports/${report.id}/export`, { method: "POST" });
      if (!response?.success) throw new Error(response?.message || "No se pudo exportar.");
      downloadTextFile(response.data.filename, response.data.content, response.data.mime_type);
      toast({ title: "Descarga lista", description: `${response.data.filename} fue generado.` });
    } catch (error) {
      toast({
        title: "No se pudo descargar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const deleteReport = async () => {
    if (!selectedReport) return;
    try {
      setSaving(true);
      const response = await authFetch(`/api/v1/school-admin/reports/${selectedReport.id}`, { method: "DELETE" });
      if (!response?.success) throw new Error(response?.message || "No se pudo eliminar.");
      setReports((current) => current.filter((report) => report.id !== selectedReport.id));
      toast({ title: "Reporte eliminado", description: "El historial fue actualizado." });
      setDeleteOpen(false);
      setSelectedReport(null);
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Genera, consulta y exporta indicadores academicos de la escuela.</p>
        </div>
        <Button onClick={openGenerate} className="w-full md:w-auto"><Plus className="mr-2 h-4 w-4" />Generar reporte</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Reportes</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">{stats.completed} completados, {stats.scheduled} programados</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Asistencia</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.attendance}%</div><p className="text-xs text-muted-foreground">Ultimo reporte generado</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Promedio</CardTitle><BarChart3 className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.average}</div><p className="text-xs text-muted-foreground">Calificacion global</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Riesgo</CardTitle><Calendar className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.risk}</div><p className="text-xs text-muted-foreground">Estudiantes a revisar</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Historial de reportes</CardTitle>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_170px_150px_auto]">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar reporte" className="pl-9" /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{reportTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="completed">Completados</SelectItem><SelectItem value="scheduled">Programados</SelectItem><SelectItem value="pending">Pendientes</SelectItem><SelectItem value="failed">Fallidos</SelectItem></SelectContent></Select>
              <Button variant="outline" onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); }}>Limpiar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando reportes</div>
          ) : filteredReports.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><FileText className="h-10 w-10 text-muted-foreground" /><div><p className="font-medium">No hay reportes con esos filtros</p><p className="text-sm text-muted-foreground">Genera un nuevo reporte para iniciar el historial.</p></div><Button onClick={openGenerate}><Plus className="mr-2 h-4 w-4" />Generar reporte</Button></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Reporte</TableHead><TableHead>Tipo</TableHead><TableHead>Periodo</TableHead><TableHead>Grupo</TableHead><TableHead>Formato</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell><div className="font-medium">{report.name}</div><div className="text-xs text-muted-foreground">Generado por {report.generated_by} - {formatDate(report.created_at)}</div></TableCell>
                    <TableCell>{reportTypeLabel(report.type)}</TableCell>
                    <TableCell>{formatDate(report.start_date)} - {formatDate(report.end_date)}</TableCell>
                    <TableCell>{report.group_name}</TableCell>
                    <TableCell className="uppercase">{report.format}</TableCell>
                    <TableCell><Badge variant={statusVariant(report.status)}>{statusLabel(report.status)}</Badge></TableCell>
                    <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => openDetail(report)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Descargar" onClick={() => exportReport(report)}><Download className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Reprocesar" onClick={() => rerunReport(report)} disabled={saving}><RefreshCw className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => { setSelectedReport(report); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Generar reporte</DialogTitle><DialogDescription>Selecciona periodo, alcance y formato de salida.</DialogDescription></DialogHeader>
          <form onSubmit={generateReport} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Tipo</Label><Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{reportTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Formato</Label><Select value={form.format} onValueChange={(value) => setForm((current) => ({ ...current, format: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{formats.map((format) => <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Grupo</Label><Select value={form.group_id} onValueChange={(value) => setForm((current) => ({ ...current, group_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los grupos</SelectItem>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.grade_name} {group.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="start_date">Inicio</Label><Input id="start_date" type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="end_date">Fin</Label><Input id="end_date" type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} /></div>
              <div className="space-y-3 rounded-lg border p-4 md:col-span-2">
                <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Incluir graficas</p><p className="text-xs text-muted-foreground">Agrega visualizaciones para direccion.</p></div><Switch checked={form.include_charts} onCheckedChange={(checked) => setForm((current) => ({ ...current, include_charts: checked }))} /></div>
                <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Incluir detalle</p><p className="text-xs text-muted-foreground">Incluye filas por alumno/grupo cuando aplique.</p></div><Switch checked={form.include_details} onCheckedChange={(checked) => setForm((current) => ({ ...current, include_details: checked }))} /></div>
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{selectedReport?.name || "Detalle del reporte"}</DialogTitle><DialogDescription>Resumen ejecutivo e indicadores clave.</DialogDescription></DialogHeader>
          {selectedReport && <div className="space-y-4"><div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">Asistencia</p><p className="text-xl font-bold">{selectedReport.summary.attendance_rate}%</p></div><div><p className="text-xs text-muted-foreground">Promedio</p><p className="text-xl font-bold">{selectedReport.summary.average_grade}</p></div><div><p className="text-xs text-muted-foreground">Alumnos</p><p className="text-xl font-bold">{selectedReport.summary.total_students}</p></div><div><p className="text-xs text-muted-foreground">Riesgo</p><p className="text-xl font-bold">{selectedReport.summary.risk_students}</p></div></div><div><p className="mb-2 text-sm font-medium">Hallazgos</p><div className="space-y-2">{selectedReport.insights.map((insight, index) => <div key={index} className="rounded-md border p-3 text-sm">{insight}</div>)}</div></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>{selectedReport && <Button onClick={() => exportReport(selectedReport)}><Download className="mr-2 h-4 w-4" />Descargar</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Eliminar reporte</DialogTitle><DialogDescription>Esta accion retira el reporte del historial.</DialogDescription></DialogHeader>
          <div className="rounded-lg border p-3 text-sm">{selectedReport?.name || "Reporte seleccionado"}</div>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button><Button variant="destructive" onClick={deleteReport} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchoolReportsPage() {
  return (
    <ModuleGuard moduleKey="reports" moduleName="Reportes">
      <SchoolReportsContent />
    </ModuleGuard>
  );
}
