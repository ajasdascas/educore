"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ParentDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    authFetch("/api/v1/parent/documents").then((res) => setDocuments(res.success ? res.data || [] : []));
  }, []);

  const filtered = useMemo(() => documents.filter((item) => `${item.title} ${item.student_name} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [documents, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">Boletas, circulares, tareas y documentos compartidos por la escuela.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Documentos disponibles</CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar documento" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{doc.title}</p>
                  <p className="text-sm text-muted-foreground">{doc.student_name}</p>
                </div>
                <Badge variant="secondary">{doc.category}</Badge>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{doc.description || "Sin descripcion."}</p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <a href={doc.file_url || "#"} download><Download className="mr-2 h-4 w-4" /> Descargar</a>
              </Button>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hay documentos disponibles.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
