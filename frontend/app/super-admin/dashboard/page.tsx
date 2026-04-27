import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, Users, Activity } from "lucide-react"

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Escuelas Activas</CardTitle>
            <Building className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">12</div>
            <p className="text-xs text-slate-500 mt-1">+2 este mes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Alumnos Totales</CardTitle>
            <Users className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">3,450</div>
            <p className="text-xs text-slate-500 mt-1">+180 este mes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Salud del Sistema</CardTitle>
            <Activity className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">99.9%</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Óptimo</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">
            No hay actividad reciente para mostrar.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
