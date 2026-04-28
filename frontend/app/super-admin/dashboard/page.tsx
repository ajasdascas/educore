import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, Users, Activity, CheckCircle } from "lucide-react"
import { DemoInteractions } from "@/components/modules/demo-interactions"

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen del estado del sistema EduCore</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="card-hover shadow-sm border-border bg-card cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escuelas Activas</CardTitle>
            <Building className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12</div>
            <p className="text-xs text-muted-foreground mt-1">+2 este mes</p>
          </CardContent>
        </Card>
        <Card className="card-hover shadow-sm border-border bg-card cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Totales</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3,450</div>
            <p className="text-xs text-muted-foreground mt-1">+180 este mes</p>
          </CardContent>
        </Card>
        <Card className="card-hover shadow-sm border-border bg-card sm:col-span-2 lg:col-span-1 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Salud del Sistema</CardTitle>
            <Activity className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">99.9%</div>
            <p className="text-xs text-green-600 font-medium mt-1">Óptimo</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover shadow-sm border-border bg-card cursor-pointer">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">156</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Profesores</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover shadow-sm border-border bg-card cursor-pointer">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">98%</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Disponibilidad</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover shadow-sm border-border bg-card cursor-pointer">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">24h</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Tiempo Respuesta</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover shadow-sm border-border bg-card cursor-pointer">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">5</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Nuevas Solicitudes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="card-hover shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b hover:bg-muted/50 p-2 rounded-md transition-colors cursor-pointer">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">Nueva escuela registrada</p>
                  <p className="text-muted-foreground text-xs">Colegio San José - hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-2 border-b hover:bg-muted/50 p-2 rounded-md transition-colors cursor-pointer">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">Actualizaciones de sistema</p>
                  <p className="text-muted-foreground text-xs">Módulo de asistencias - hace 1 día</p>
                </div>
              </div>
              <div className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded-md transition-colors cursor-pointer">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">Mantenimiento programado</p>
                  <p className="text-muted-foreground text-xs">Base de datos - mañana 2:00 AM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Resumen de Planes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center hover:bg-muted/50 p-2 rounded-md transition-colors cursor-pointer">
                <span className="text-sm font-medium">Basic</span>
                <span className="text-sm text-muted-foreground">3 escuelas</span>
              </div>
              <div className="flex justify-between items-center hover:bg-muted/50 p-2 rounded-md transition-colors cursor-pointer">
                <span className="text-sm font-medium">Premium</span>
                <span className="text-sm text-muted-foreground">7 escuelas</span>
              </div>
              <div className="flex justify-between items-center hover:bg-muted/50 p-2 rounded-md transition-colors cursor-pointer">
                <span className="text-sm font-medium">Enterprise</span>
                <span className="text-sm text-muted-foreground">2 escuelas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demo de Interacciones UX */}
      <DemoInteractions />
    </div>
  )
}
