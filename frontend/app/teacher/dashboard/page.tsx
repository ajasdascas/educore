import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default function TeacherDashboard() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full animate-in zoom-in-95 duration-500 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-purple-100 p-3 rounded-full mb-4 w-fit">
            <GraduationCap className="w-8 h-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Portal de Profesores</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Bienvenido al panel docente.</p>
          <p className="mt-4 text-sm bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
            Este módulo se encuentra en construcción. Pronto podrás gestionar tus grupos, calificaciones y asistencias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
