// ============================================================
// ARCHIVO: settings/page.tsx
// MÓDULO: Super Admin - Configuración
// QUÉ HACE: Muestra la configuración global de la plataforma:
//           nombre, dominio, planes, y ajustes de seguridad.
// ============================================================
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configuración</h2>
        <p className="text-muted-foreground text-sm mt-1">Ajustes generales de la plataforma EduCore</p>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Información de la Plataforma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Nombre de la Plataforma</Label>
              <Input defaultValue="EduCore" className="bg-input border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Dominio Principal</Label>
              <Input defaultValue="educore.mx" className="bg-input border-border text-foreground" disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Email de Soporte</Label>
            <Input defaultValue="soporte@educore.mx" className="bg-input border-border text-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Planes y Módulos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["Starter", "Pro", "Enterprise"].map((plan) => (
              <div key={plan} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div>
                  <p className="font-medium text-foreground text-sm">{plan}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan === "Starter" && "Hasta 200 alumnos · Módulos básicos"}
                    {plan === "Pro" && "Hasta 1,000 alumnos · Todos los módulos"}
                    {plan === "Enterprise" && "Ilimitado · Soporte prioritario"}
                  </p>
                </div>
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded font-medium">Activo</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Seguridad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">Expiración de Access Token</p>
              <p className="text-xs text-muted-foreground">Tiempo de vida del JWT</p>
            </div>
            <span className="text-sm font-mono text-primary bg-primary/10 px-3 py-1 rounded">15 min</span>
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">Expiración de Refresh Token</p>
              <p className="text-xs text-muted-foreground">Cookie httpOnly</p>
            </div>
            <span className="text-sm font-mono text-primary bg-primary/10 px-3 py-1 rounded">7 días</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
