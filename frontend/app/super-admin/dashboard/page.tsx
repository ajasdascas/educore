import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, Users, Activity } from "lucide-react"

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escuelas Activas</CardTitle>
            <Building className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12</div>
            <p className="text-xs text-muted-foreground mt-1">+2 este mes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Totales</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3,450</div>
            <p className="text-xs text-muted-foreground mt-1">+180 este mes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Salud del Sistema</CardTitle>
            <Activity className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">99.9%</div>
            <p className="text-xs text-success font-medium mt-1">Óptimo</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No hay actividad reciente para mostrar.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
