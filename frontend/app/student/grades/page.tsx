"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth";

interface Grade {
  subject_name: string;
  grade: number;
  period: string;
  eval_type: string;
  recorded_date: string;
}

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/grades")
      .then((res) => { if (res?.success) setGrades(res.data || []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mis Calificaciones</h2>
        <p className="text-sm text-muted-foreground mt-1">Historial de evaluaciones</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Evaluaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : grades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay calificaciones registradas.</p>
          ) : (
            <div className="divide-y divide-border">
              {grades.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{g.subject_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.eval_type} · {g.period} · {g.recorded_date}
                    </p>
                  </div>
                  <span className={`text-xl font-bold ${g.grade >= 7 ? "text-emerald-500" : "text-rose-500"}`}>
                    {g.grade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
