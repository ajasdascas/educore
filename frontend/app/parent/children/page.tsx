"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Calendar, GraduationCap, Mail, Phone, UserRound } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch("/api/v1/parent/children");
        const list = res.success ? res.data || [] : [];
        setChildren(list);
        if (list[0]) {
          const detail = await authFetch(`/api/v1/parent/children/${list[0].id}`);
          setSelected(detail.success ? detail.data : list[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectChild = async (child: any) => {
    setSelected(child);
    const detail = await authFetch(`/api/v1/parent/children/${child.id}`);
    if (detail.success) setSelected(detail.data);
  };

  if (loading) return <div className="animate-pulse text-muted-foreground">Cargando hijos...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Hijos</h1>
        <p className="text-muted-foreground">Consulta el expediente academico resumido de tus hijos vinculados.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => selectChild(child)}
              className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${selected?.id === child.id ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{child.first_name} {child.last_name}</p>
                  <p className="text-sm text-muted-foreground">{child.grade_name} {child.group_name}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selected ? `${selected.first_name} ${selected.last_name}` : "Selecciona un hijo"}</CardTitle>
          </CardHeader>
          <CardContent>
            {selected && (
              <Tabs defaultValue="summary">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Resumen</TabsTrigger>
                  <TabsTrigger value="academic">Academico</TabsTrigger>
                  <TabsTrigger value="contact">Contacto</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4 pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Info label="Promedio" value={selected.current_gpa || 0} icon={<BookOpen className="h-4 w-4" />} />
                    <Info label="Asistencia" value={`${selected.attendance_rate || 0}%`} icon={<Calendar className="h-4 w-4" />} />
                    <Info label="Estado" value={selected.status || "active"} icon={<UserRound className="h-4 w-4" />} />
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Ultima calificacion</p>
                    <p className="text-sm text-muted-foreground">{selected.recent_grade || "Sin registros recientes"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Siguiente clase</p>
                    <p className="text-sm text-muted-foreground">{selected.next_class || "No disponible"}</p>
                  </div>
                </TabsContent>
                <TabsContent value="academic" className="space-y-4 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Matricula: {selected.enrollment_id || "N/D"}</Badge>
                    <Badge variant="secondary">{selected.grade_name || "Grado N/D"}</Badge>
                    <Badge variant="secondary">Grupo {selected.group_name || "N/D"}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <a href="/parent/grades" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>Ver calificaciones</a>
                    <a href="/parent/attendance" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>Ver asistencia</a>
                  </div>
                </TabsContent>
                <TabsContent value="contact" className="space-y-3 pt-4">
                  <p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4" /> Docente: {selected.teacher_email || "No disponible"}</p>
                  <p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4" /> Emergencia: {selected.emergency_info?.primary_phone || "No disponible"}</p>
                  <p className="text-sm text-muted-foreground">{selected.address || "Sin notas de expediente."}</p>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
