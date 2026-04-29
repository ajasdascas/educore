"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type DatabaseTable = {
  name: string;
  estimated_rows: number;
  is_hidden: boolean;
  is_protected: boolean;
  deleted_at?: string;
};

type DatabaseColumn = {
  name: string;
  type: string;
  nullable: boolean;
  is_primary: boolean;
  is_protected: boolean;
  default?: string;
};

type Relationship = {
  column: string;
  foreign_table: string;
  foreign_column: string;
};

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

export default function DatabaseAdminPage() {
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columns, setColumns] = useState<DatabaseColumn[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [importPreview, setImportPreview] = useState<Record<string, unknown>[]>([]);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const { toast } = useToast();

  const visibleTables = useMemo(() => {
    const value = query.trim().toLowerCase();
    return tables.filter((table) => !value || table.name.toLowerCase().includes(value));
  }, [tables, query]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/super-admin/database/tables");
      if (!res.success) throw new Error(res.message || res.error || "No se pudo cargar la base de datos");
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
      const [schemaRes, rowsRes] = await Promise.all([
        authFetch(`/api/v1/super-admin/database/tables/${tableName}/schema`),
        authFetch(`/api/v1/super-admin/database/tables/${tableName}/rows?per_page=50`),
      ]);
      if (!schemaRes.success) throw new Error(schemaRes.message || schemaRes.error || "No se pudo cargar schema");
      if (!rowsRes.success) throw new Error(rowsRes.message || rowsRes.error || "No se pudieron cargar filas");
      setColumns(schemaRes.data?.columns || []);
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

  const exportSelected = async () => {
    try {
      const res = await authFetch(`/api/v1/super-admin/database/export/tables/${selectedTable}`);
      if (!res.success) throw new Error(res.message || res.error || "No se pudo exportar");
      downloadWorkbook(`educore-${selectedTable}.xlsx`, res.data?.tables || { [selectedTable]: rows });
      toast({ title: "Export listo", description: `${selectedTable} descargado como Excel.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo exportar", variant: "destructive" });
    }
  };

  const exportFull = async () => {
    try {
      const res = await authFetch("/api/v1/super-admin/database/export/full");
      if (!res.success) throw new Error(res.message || res.error || "No se pudo exportar");
      downloadWorkbook("educore-full-database.xlsx", res.data?.tables || {});
      toast({ title: "Export completo", description: "Base de datos descargada con una hoja por tabla." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo exportar", variant: "destructive" });
    }
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const firstSheet = workbook.SheetNames[0];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "" });
    setImportPreview(json.slice(0, 10));
    setImportColumns(json[0] ? Object.keys(json[0]) : []);
    const validation = await authFetch("/api/v1/super-admin/database/import/validate", {
      method: "POST",
      body: JSON.stringify({ table: selectedTable, sheet: firstSheet, rows: json.slice(0, 25) }),
    });
    toast({
      title: validation.success ? "Archivo validado" : "Validacion pendiente",
      description: `${json.length} filas detectadas en ${firstSheet}. Revisa el mapeo antes del commit real.`,
      variant: validation.success ? "default" : "destructive",
    });
  };

  const selected = tables.find((table) => table.name === selectedTable);
  const rowKeys = rows[0] ? Object.keys(rows[0]).slice(0, 8) : columns.slice(0, 8).map((column) => column.name);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Admin</h1>
          <p className="text-muted-foreground">
            Control seguro de schema, datos, importaciones Excel y export completo para SuperAdmin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadTables}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportSelected} disabled={!selectedTable}>
            <Download className="mr-2 h-4 w-4" />
            Export tabla
          </Button>
          <Button onClick={exportFull}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export full DB
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Tablas</p>
              <p className="text-2xl font-bold">{tables.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Table2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Filas visibles</p>
              <p className="text-2xl font-bold">{rows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Modo DDL</p>
              <p className="text-2xl font-bold">Protegido</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tablas</CardTitle>
            <CardDescription>Selecciona una tabla para ver estructura y datos.</CardDescription>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tabla" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : (
              visibleTables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                    selectedTable === table.name ? "border-primary bg-primary/10" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{table.name}</span>
                    {table.is_protected ? <Badge variant="outline">Protegida</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{table.estimated_rows || 0} filas estimadas</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="gap-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>{selectedTable || "Sin tabla seleccionada"}</CardTitle>
                  <CardDescription>Schema, constraints, relaciones y protección de estructura.</CardDescription>
                </div>
                {selected?.is_protected ? (
                  <Badge variant="outline" className="w-fit">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Tabla protegida
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-fit">Editable con auditoria</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {tableLoading ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando tabla
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border">
                    <Table>
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
                            <TableCell className="font-medium">{column.name}</TableCell>
                            <TableCell>{column.type}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {column.is_primary ? <Badge variant="outline">PK</Badge> : null}
                                {!column.nullable ? <Badge variant="outline">Required</Badge> : null}
                                {column.is_protected ? <Badge variant="outline">Lock</Badge> : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="rounded-md border p-4">
                    <h2 className="mb-2 text-sm font-semibold">Relaciones</h2>
                    {relationships.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin foreign keys directas.</p>
                    ) : (
                      <div className="space-y-2">
                        {relationships.map((rel) => (
                          <div key={`${rel.column}-${rel.foreign_table}`} className="rounded-md bg-muted px-3 py-2 text-sm">
                            {rel.column} -> {rel.foreign_table}.{rel.foreign_column}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>Crear o alterar tablas requiere activar el flag backend y queda auditado como acción crítica.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
              <CardDescription>Vista paginada de las primeras 50 filas para inspección rápida.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {rowKeys.map((key) => <TableHead key={key}>{key}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Math.max(rowKeys.length, 1)} className="h-24 text-center text-muted-foreground">
                          Sin filas visibles
                        </TableCell>
                      </TableRow>
                    ) : rows.slice(0, 12).map((row, index) => (
                      <TableRow key={String(row.id || index)}>
                        {rowKeys.map((key) => <TableCell key={key}>{normalizeCell(row[key])}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Excel</CardTitle>
              <CardDescription>Preview y validación antes de insertar datos masivos.</CardDescription>
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
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    {importPreview.length} filas en preview. Para alumnos, el commit productivo debe usar el importador dedicado del Core Academico.
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
