"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GraduationCap,
  Calendar,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle,
  BookOpen,
  TrendingUp
} from "lucide-react";

export default function ParentDashboard() {
  const [children] = useState([
    { id: 1, name: "María García", grade: "5° Primaria", attendance: 95, avgGrade: 8.5 },
    { id: 2, name: "Carlos García", grade: "2° Primaria", attendance: 98, avgGrade: 9.2 },
  ]);

  const [recentUpdates] = useState([
    { id: 1, child: "María", type: "grade", message: "Nueva calificación en Matemáticas: 9.0", time: "hace 2h" },
    { id: 2, child: "Carlos", type: "attendance", message: "Asistencia registrada", time: "hace 4h" },
    { id: 3, child: "María", type: "message", message: "Mensaje del profesor de Ciencias", time: "hace 1d" },
    { id: 4, child: "Carlos", type: "achievement", message: "¡Felicitado por buen comportamiento!", time: "hace 2d" },
  ]);

  const [upcomingEvents] = useState([
    { id: 1, title: "Reunión de Padres", date: "2024-05-15", type: "meeting" },
    { id: 2, title: "Examen de Matemáticas - María", date: "2024-05-18", type: "exam" },
    { id: 3, title: "Festival de Talentos", date: "2024-05-22", type: "event" },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Portal de Padres</h1>
        <p className="text-muted-foreground mt-2">
          Seguimiento académico de sus hijos
        </p>
      </div>

      {/* Children Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child) => (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <GraduationCap className="mr-2 h-5 w-5 text-blue-600" />
                  {child.name}
                </div>
                <span className="text-sm text-muted-foreground">{child.grade}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{child.avgGrade}</p>
                  <p className="text-xs text-muted-foreground">Promedio General</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{child.attendance}%</p>
                  <p className="text-xs text-muted-foreground">Asistencia</p>
                </div>
              </div>
              <button className="w-full mt-3 p-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Ver Detalles
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Updates */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Actualizaciones Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUpdates.map((update) => (
                <div key={update.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {update.type === 'grade' && <BookOpen className="h-4 w-4 text-green-600" />}
                    {update.type === 'attendance' && <Calendar className="h-4 w-4 text-blue-600" />}
                    {update.type === 'message' && <MessageCircle className="h-4 w-4 text-purple-600" />}
                    {update.type === 'achievement' && <Trophy className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium bg-muted px-2 py-1 rounded">
                        {update.child}
                      </span>
                      <span className="text-xs text-muted-foreground">{update.time}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{update.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {event.type === 'meeting' && <MessageCircle className="h-4 w-4 text-blue-600" />}
                    {event.type === 'exam' && <BookOpen className="h-4 w-4 text-red-600" />}
                    {event.type === 'event' && <Trophy className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button className="p-4 text-center rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <span className="text-sm font-medium">Ver Calificaciones</span>
            </button>
            <button className="p-4 text-center rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <span className="text-sm font-medium">Ver Asistencia</span>
            </button>
            <button className="p-4 text-center rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <MessageCircle className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <span className="text-sm font-medium">Mensajes</span>
            </button>
            <button className="p-4 text-center rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <span className="text-sm font-medium">Logros</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Important Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-yellow-600" />
            Notificaciones Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Excelente Desempeño
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Carlos ha mantenido un promedio superior a 9.0 este mes
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Reunión Pendiente
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Recuerde la reunión de padres del 15 de mayo a las 6:00 PM
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
