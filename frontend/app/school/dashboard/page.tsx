import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function SchoolDashboard() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full animate-in zoom-in-95 duration-500 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 p-3 rounded-full mb-4 w-fit">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Portal de Director</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Bienvenido al dashboard de administración de tu escuela.</p>
          <p className="mt-4 text-sm bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
            Este módulo se encuentra en construcción. Pronto podrás gestionar estudiantes, profesores y calificaciones aquí.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
