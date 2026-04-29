"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Columns3,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type TenantTable = {
  name: string;
  label: string;
  description?: string;
  estimated_rows: number;
  is_read_only?: boolean;
  is_custom?: boolean;
};

type TenantColumn = {
  name: string;
  type: string;
  nullable?: boolean;
  is_primary?: boolean;
  is_protected?: boolean;
  is_virtual?: boolean;
};

type Relationship = {
  column: string;
  foreign_table: string;
  foreign_column: string;
};

const protectedEditKeys = new Set(["id", "tenant_id", "created_at", "updated_at"]);

function normalizeCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function downloadWorkbook(filename: string, sheets: Record<string, Record<string, unknown>[]>) {
  const workbook = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([sheetName, rows]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ empty: "Sin registros" }]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  });
  XLSX.writeFile(workbook, filename);
}

function parseEditableValue(raw: string) {
  const value = raw.trim();
  if (value === "") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (!Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return raw;
}

export default function TenantDatabasePage() {
  const [tables, setTables] = useState<TenantTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columns, setColumns] = useState<TenantColumn[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [rowQuery, setRowQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [customFieldOpen, setCustomFieldOpen] = useState(false);
  const [customTableOpen, setCustomTableOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, unknown>[]>([]);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const { toast } = useToast();

  const selected = tables.find((table) => table.name === selectedTable);
  const visibleTables = useMemo(() => {
    const value = query.trim().toLowerCase();
    return tables.filter((table) =>
      !value || table.name.toLowerCase().includes(value) || table.label.toLowerCase().includes(value)
    );
  }, [tables, query]);
  const rowKeys = rows[0]
    ? Object.keys(rows[0]).slice(0, 8)
    : columns.slice(0, 8).map((column) => column.name);
  const editableColumns = columns.filter((column) => !protectedEditKeys.has(column.name) && !column.is_protected && !column.is_virtual);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/school-admin/database/tables");
      if (!res.success) throw new Error(res.message || res.error || "No se pudieron cargar tablas");
      const nextTables = res.data?.tables || [];
      setTables(nextTables);
      if (!selectedTable && nextTables.length > 0) setSelectedTable(nextTables[0].name);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudieron cargar tablas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadTable = async (tableName: string) => {
    if (!tableName) return;
    setTableLoading(true);
    try {
      const search = rowQuery.trim() ? `&search=${encodeURIComponent(rowQuery.trim())}` : "";
      const [schemaRes, rowsRes] = await Promise.all([
        authFetch(`/api/v1/school-admin/database/tables/${tableName}/schema`),
        authFetch(`/api/v1/school-admin/database/tables/${tableName}/rows?per_page=50${search}`),
      ]);
      if (!schemaRes.success) throw new Error(schemaRes.message || schemaRes.error || "No se pudo cargar schema");
      if (!rowsRes.success) throw new Error(rowsRes.message || rowsRes.error || "No se pudieron cargar datos");
      setColumns([...(schemaRes.data?.columns || []), ...(schemaRes.data?.custom_fields || [])]);
      setRelationships(schemaRes.data?.relationships || []);
      setRows(rowsRes.data?.rows || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo cargar tabla", variant: "destructive" });
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) loadTable(selectedTable);
  }, [selectedTable]);

  const openCreate = () => {
    const initial: Record<string, string> = {};
    editableColumns.slice(0, 18).forEach((column) => {
      initial[column.name] = "";
    });
    setEditingRow(null);
    setFormValues(initial);
    setEditOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    const next: Record<string, string> = {};
    editableColumns.slice(0, 18).forEach((column) => {
      const value = row[column.name];
      next[column.name] = typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value ?? "");
    });
    setEditingRow(row);
    setFormValues(next);
    setEditOpen(true);
  };

  const saveRow = async () => {
    const values = Object.fromEntries(Object.entries(formValues).map(([key, value]) => [key, parseEditableValue(value)]));
    const id = String(editingRow?.id || "");
    const endpoint = editingRow
      ? `/api/v1/school-admin/database/tables/${selectedTable}/rows/${encodeURIComponent(id)}`
      : `/api/v1/school-admin/database/tables/${selectedTable}/rows`;
    const res = await authFetch(endpoint, {
      method: editingRow ? "PUT" : "POST",
      body: JSON.stringify({ values }),
    });
    if (!res.success) {
      toast({ title: "Error", description: res.message || res.error || "No se pudo guardar", variant: "destructive" });
      return;
    }
    toast({ title: "Guardado", description: "Los cambios quedaron registrados en el tenant." });
    setEditOpen(false);
    loadTable(selectedTable);
    loadTables();
  };

  const deleteRow = async (row: Record<string, unknown>) => {
    if (!window.confirm("¿Aplicar soft delete a esta fila?")) return;
    const id = String(row.id || "");
    const res = await authFetch(`/api/v1/school-admin/database/tables/${selectedTable}/rows/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.success) {
      toast({ title: "Error", description: res.message || res.error || "No se pudo eliminar", variant: "destructive" });
      return;
    }
    toast({ title: "Soft delete aplicado", description: "La fila ya no queda activa." });
    loadTable(selectedTable);
    loadTables();
  };

  const exportSelected = async () => {
    const res = await authFetch(`/api/v1/school-admin/database/export/table/${selectedTable}`);
    if (!res.success) {
      toast({ title: "Error", description: res.message || res.error || "No se pudo exportar", variant: "destructive" });
      return;
    }
    downloadWorkbook(`educore-${selectedTable}-tenant.xlsx`, res.data?.tables || { [selectedTable]: rows });
    toast({ title: "Export listo", description: `${selected?.label || selectedTable} descargado como Excel.` });
  };

  const exportAll = async () => {
    const res = await authFetch("/api/v1/school-admin/database/export/all");
    if (!res.success) {
      toast({ title: "Error", description: res.message || res.error || "No se pudo exportar", variant: "destructive" });
      return;
    }
    downloadWorkbook("educore-tenant-database.xlsx", res.data?.tables || {});
    toast({ title: "Export completo", description: "Datos del tenant descargados con una hoja por tabla." });
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.SheetNames[0];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheet], { defval: "" });
    setImportPreview(json.slice(0, 8));
    setImportColumns(json[0] ? Object.keys(json[0]) : []);
    const res = await authFetch("/api/v1/school-admin/database/import/validate", {
      method: "POST",
      body: JSON.stringify({ table: selectedTable, sheet, rows: json.slice(0, 25) }),
    });
    toast({
      title: res.success ? "Archivo validado" : "Validacion pendiente",
      description: `${json.length} filas detectadas en ${sheet}.`,
      variant: res.success ? "default" : "destructive",
    });
  };

  const createCustomField = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await authFetch("/api/v1/school-admin/database/custom-fields", {
      method: "POST",
      body: JSON.stringify({
        table_name: selectedTable,
        field_key: form.get("field_key"),
        label: form.get("label"),
        field_type: form.get("field_type") || "text",
      }),
    });
    if (!res.success) {
      toast({ title: "Error", description: res.message || res.error || "No se pudo crear campo", variant: "destructive" });
      return;
    }
    toast({ title: "Campo agregado", description: "Se agrego como columna virtual segura." });
    setCustomFieldOpen(false);
    loadTable(selectedTable);
  };

  const createCustomTable = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await authFetch("/api/v1/school-admin/database/custom-tables", {
      method: "POST",
      body: JSON.stringify({
        table_key: form.get("table_key"),
        name: form.get("name"),
        description: form.get("description"),
        schema: [{ key: "nombre", label: "Nombre", type: "text" }],
      }),
    });
    if (!res.success) {
      toast({ title: "Error", description: res.message || res.error || "No se pudo crear tabla", variant: "destructive" });
      return;
    }
    toast({ title: "Tabla virtual creada", description: "Quedo aislada dentro de esta escuela." });
    setCustomTableOpen(false);
    loadTables();
  };

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Base de datos de la escuela</h1>
          <p className="text-muted-foreground">
            Entorno virtual tenant-scoped: datos, campos personalizados, importacion y exportacion sin mezclar escuelas.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
          <Button variant="outline" onClick={loadTables}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportSelected} disabled={!selectedTable}>
            <Download className="mr-2 h-4 w-4" />
            Tabla
          </Button>
          <Button variant="outline" onClick={exportAll}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Todo
          </Button>
          <Button onClick={openCreate} disabled={!selectedTable || selected?.is_read_only}>
            <Plus className="mr-2 h-4 w-4" />
            Fila
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 md:grid-cols-3">
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3 p-5">
            <Database className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Tablas disponibles</p>
              <p className="text-2xl font-bold">{tables.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3 p-5">
            <Table2 className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Filas visibles</p>
              <p className="text-2xl font-bold">{rows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3 p-5">
            <Columns3 className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Columnas</p>
              <p className="text-2xl font-bold">{columns.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 max-w-full gap-5 xl:grid-cols-[minmax(230px,320px)_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Tablas</CardTitle>
            <CardDescription>Solo datos de esta escuela.</CardDescription>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tabla" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setCustomTableOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tabla virtual
            </Button>
            {loading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : visibleTables.map((table) => (
              <button
                key={table.name}
                onClick={() => setSelectedTable(table.name)}
                className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                  selectedTable === table.name ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">{table.label || table.name}</span>
                  {table.is_read_only ? <Badge variant="outline">Lectura</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{table.estimated_rows || 0} filas · {table.name}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="min-w-0 max-w-full space-y-5 overflow-hidden">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <CardTitle>{selected?.label || selectedTable || "Sin tabla seleccionada"}</CardTitle>
                  <CardDescription>{selected?.description || "Schema y datos aislados por tenant_id."}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCustomFieldOpen(true)} disabled={!selectedTable || selected?.is_read_only}>
                    <Columns3 className="mr-2 h-4 w-4" />
                    Campo virtual
                  </Button>
                  <Badge variant="outline" className="w-fit">tenant_id aislado</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <div className="min-w-0 overflow-x-auto rounded-md border">
                  <Table className="min-w-[520px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Columna</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Reglas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columns.map((column) => (
                        <TableRow key={column.name}>
                          <TableCell className="max-w-[180px] truncate font-medium">{column.name}</TableCell>
                          <TableCell className="max-w-[160px] truncate">{column.type}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {column.is_primary ? <Badge variant="outline">PK</Badge> : null}
                              {column.is_virtual ? <Badge variant="outline">Virtual</Badge> : null}
                              {column.is_protected ? <Badge variant="outline">Lock</Badge> : null}
                              {column.nullable === false ? <Badge variant="outline">Required</Badge> : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="min-w-0 rounded-md border p-4">
                  <h2 className="mb-2 text-sm font-semibold">Relaciones</h2>
                  {relationships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin foreign keys directas.</p>
                  ) : (
                    <div className="space-y-2">
                      {relationships.map((rel) => (
                        <div key={`${rel.column}-${rel.foreign_table}`} className="break-words rounded-md bg-muted px-3 py-2 text-sm">
                          {rel.column} -> {rel.foreign_table}.{rel.foreign_column}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex min-w-0 gap-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Las tablas y columnas personalizadas son virtuales y seguras; no alteran el schema global.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Datos</CardTitle>
                  <CardDescription>Edicion tenant-scoped con auditoria.</CardDescription>
                </div>
                <div className="flex min-w-0 gap-2">
                  <Input value={rowQuery} onChange={(event) => setRowQuery(event.target.value)} placeholder="Buscar filas" className="min-w-0 lg:w-72" />
                  <Button variant="outline" onClick={() => loadTable(selectedTable)}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tableLoading ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando tabla
                </div>
              ) : (
                <div className="max-w-full overflow-x-auto rounded-md border">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        {rowKeys.map((key) => <TableHead key={key}>{key}</TableHead>)}
                        <TableHead className="w-[110px] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={Math.max(rowKeys.length + 1, 1)} className="h-24 text-center text-muted-foreground">
                            Sin filas visibles
                          </TableCell>
                        </TableRow>
                      ) : rows.slice(0, 20).map((row, index) => (
                        <TableRow key={String(row.id || index)}>
                          {rowKeys.map((key) => <TableCell key={key} className="max-w-[220px] truncate">{normalizeCell(row[key])}</TableCell>)}
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => openEdit(row)} disabled={selected?.is_read_only}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => deleteRow(row)} disabled={selected?.is_read_only}>
                                <Trash2 className="h-4 w-4" />
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

          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>Import Excel</CardTitle>
              <CardDescription>Preview, validacion y mapeo antes de importar datos masivos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted">
                <Upload className="mr-2 h-4 w-4" />
                Subir .xlsx para preview
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleImportFile(event.target.files?.[0])} />
              </label>
              {importColumns.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {importColumns.map((column) => <Badge key={column} variant="outline">{column}</Badge>)}
                  </div>
                  <div className="max-w-full overflow-x-auto rounded-md border">
                    <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow>{importColumns.slice(0, 6).map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.slice(0, 4).map((row, index) => (
                          <TableRow key={index}>
                            {importColumns.slice(0, 6).map((column) => <TableCell key={column} className="max-w-[180px] truncate">{normalizeCell(row[column])}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Editar fila" : "Nueva fila"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(formValues).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label>{key}</Label>
                {value.length > 80 || value.startsWith("{") || value.startsWith("[") ? (
                  <Textarea value={value} onChange={(event) => setFormValues((prev) => ({ ...prev, [key]: event.target.value }))} />
                ) : (
                  <Input value={value} onChange={(event) => setFormValues((prev) => ({ ...prev, [key]: event.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveRow}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customFieldOpen} onOpenChange={setCustomFieldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Campo virtual</DialogTitle>
          </DialogHeader>
          <form onSubmit={createCustomField} className="space-y-4">
            <div className="space-y-2">
              <Label>Clave</Label>
              <Input name="field_key" placeholder="seguro_medico" required />
            </div>
            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <Input name="label" placeholder="Seguro medico" required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input name="field_type" placeholder="text" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCustomFieldOpen(false)}>Cancelar</Button>
              <Button type="submit">Crear</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={customTableOpen} onOpenChange={setCustomTableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tabla virtual</DialogTitle>
          </DialogHeader>
          <form onSubmit={createCustomTable} className="space-y-4">
            <div className="space-y-2">
              <Label>Clave</Label>
              <Input name="table_key" placeholder="becas_internas" required />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input name="name" placeholder="Becas internas" required />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Textarea name="description" placeholder="Datos adicionales propios de la escuela" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCustomTableOpen(false)}>Cancelar</Button>
              <Button type="submit">Crear</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
