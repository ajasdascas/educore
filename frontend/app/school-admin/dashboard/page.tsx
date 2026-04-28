"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle
} from "lucide-react";

export default function SchoolAdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 245,
    totalTeachers: 18,
    totalGroups: 12,
    attendance: 92,
  });

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, type: "student", message: "Nuevo estudiante matriculado: Juan Pérez", time: "hace 2h" },
    { id: 2, type: "grade", message: "Calificaciones de Matemáticas actualizadas", time: "hace 4h" },
    { id: 3, type: "attendance", message: "Reporte de asistencia del día generado", time: "hace 6h" },
    { id: 4, type: "message", message: "Nuevo mensaje de padres recibido", time: "hace 1d" },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Escuela</h1>
        <p className="text-muted-foreground mt-2">
          Resumen general de la actividad escolar
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12</span> nuevos este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profesores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">3</span> activos hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              Todos los niveles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendance}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2%</span> vs mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {activity.type === 'student' && <GraduationCap className="h-4 w-4 text-blue-600" />}
                    {activity.type === 'grade' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {activity.type === 'attendance' && <Calendar className="h-4 w-4 text-orange-600" />}
                    {activity.type === 'message' && <MessageCircle className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center">
                <GraduationCap className="h-4 w-4 mr-3 text-blue-600" />
                <span className="text-sm font-medium">Matricular Estudiante</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-3 text-green-600" />
                <span className="text-sm font-medium">Registrar Profesor</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-3 text-orange-600" />
                <span className="text-sm font-medium">Tomar Asistencia</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-3 text-purple-600" />
                <span className="text-sm font-medium">Enviar Comunicado</span>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts/Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-yellow-600" />
            Notificaciones Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Periodo de Evaluaciones
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Las evaluaciones del segundo período inician en 5 días
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Reunión de Profesores
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Programada para el viernes a las 3:00 PM
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}