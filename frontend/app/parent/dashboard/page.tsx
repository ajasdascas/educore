import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ParentDashboard() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full animate-in zoom-in-95 duration-500 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-emerald-100 p-3 rounded-full mb-4 w-fit">
            <Users className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">Portal de Padres de Familia</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Bienvenido al portal familiar.</p>
          <p className="mt-4 text-sm bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
            Este módulo se encuentra en construcción. Pronto podrás ver las calificaciones, avisos y pagos de tus hijos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
