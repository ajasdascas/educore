"use client";

import { useEffect, useState } from "react";
import { BookMarked, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface Assignment {
  id: string;
  title: string;
  subject_name: string;
  description?: string;
  due_date?: string;
  status?: string;
}

function statusBadge(status?: string) {
  switch (status) {
    case "completed": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Entregada</Badge>;
    case "overdue":   return <Badge className="bg-red-100 text-red-700 border-red-200">Vencida</Badge>;
    default:          return <Badge variant="outline">Pendiente</Badge>;
  }
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/assignments")
      .then((res) => {
        if (res?.success) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.assignments ?? [];
          setAssignments(raw);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tareas y Actividades</h2>
        <p className="text-sm text-muted-foreground mt-1">Tareas asignadas por tus profesores</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookMarked className="h-4 w-4" /> Mis tareas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 opacity-40" />
              <p className="text-sm">Sin tareas pendientes registradas.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.subject_name}</p>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {statusBadge(a.status)}
                    {a.due_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(a.due_date).toLocaleDateString("es-MX")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
