import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Configuración</h2>
        <p className="text-slate-500 text-sm mt-1">Ajustes generales de la plataforma EduCore</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-base text-slate-800">Información de la Plataforma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Nombre de la Plataforma</Label>
              <Input defaultValue="EduCore" className="bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Dominio Principal</Label>
              <Input defaultValue="educore.mx" className="bg-white" disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600 text-sm">Email de Soporte</Label>
            <Input defaultValue="soporte@educore.mx" className="bg-white" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-base text-slate-800">Planes y Módulos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["Starter", "Pro", "Enterprise"].map((plan) => (
              <div key={plan} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{plan}</p>
                  <p className="text-xs text-slate-400">
                    {plan === "Starter" && "Hasta 200 alumnos · Módulos básicos"}
                    {plan === "Pro" && "Hasta 1,000 alumnos · Todos los módulos"}
                    {plan === "Enterprise" && "Ilimitado · Soporte prioritario"}
                  </p>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Activo</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-base text-slate-800">Seguridad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">Expiración de Access Token</p>
              <p className="text-xs text-slate-400">Tiempo de vida del JWT</p>
            </div>
            <span className="text-sm font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded">15 min</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">Expiración de Refresh Token</p>
              <p className="text-xs text-slate-400">Cookie httpOnly</p>
            </div>
            <span className="text-sm font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded">7 días</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
