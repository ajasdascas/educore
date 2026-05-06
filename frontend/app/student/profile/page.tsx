"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  last_name_mother?: string;
  email: string;
  enrollment_number?: string;
  group_id?: string | null;
  group_name?: string | null;
  grade_name?: string | null;
  status: string;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch("/api/v1/student/profile")
      .then((res) => {
        if (res?.success && res.data) setProfile(res.data);
        else setError("No se pudo cargar el perfil.");
      })
      .catch(() => setError("Error de conexión."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mi Perfil</h2>
        <p className="text-sm text-muted-foreground mt-1">Información personal de tu cuenta escolar</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando perfil...
        </div>
      ) : error || !profile ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-3 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{error || "Sin datos de perfil."}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                {profile.first_name[0]}{profile.last_name[0]}
              </div>
              <div>
                <p>{profile.first_name} {profile.last_name}{profile.last_name_mother ? ` ${profile.last_name_mother}` : ""}</p>
                <Badge variant="outline" className="mt-1 text-xs font-normal">
                  {profile.status === "active" ? "Activo" : profile.status}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo" value={profile.email} />
            <Field label="Matrícula" value={profile.enrollment_number} />
            <Field label="Grado" value={profile.grade_name} />
            <Field label="Grupo" value={profile.group_name} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
