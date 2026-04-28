"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, Settings, AlertCircle, Info, CheckCircle } from "lucide-react";

const notifications = [
  {
    id: 1,
    title: "Nueva escuela registrada",
    description: "Instituto Tecnológico Don Bosco se ha registrado exitosamente",
    time: "Hace 2 horas",
    type: "success",
    read: false,
    icon: CheckCircle
  },
  {
    id: 2,
    title: "Problema de facturación",
    description: "Error en el pago de la suscripción de Colegio San Miguel",
    time: "Hace 4 horas",
    type: "error",
    read: false,
    icon: AlertCircle
  },
  {
    id: 3,
    title: "Mantenimiento programado",
    description: "Mantenimiento de servidores programado para el próximo domingo",
    time: "Hace 1 día",
    type: "info",
    read: true,
    icon: Info
  },
  {
    id: 4,
    title: "Límite de usuarios alcanzado",
    description: "Escuela Primaria La Paz ha alcanzado su límite de usuarios",
    time: "Hace 2 días",
    type: "warning",
    read: true,
    icon: AlertCircle
  }
];

const typeColors = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
};

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notificaciones
          </h1>
          <p className="text-muted-foreground">
            Centro de notificaciones del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Marcar todas como leídas
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">No leídas</p>
                <p className="text-2xl font-bold text-red-600">2</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Leídas</p>
                <p className="text-2xl font-bold text-green-600">2</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Notificaciones</CardTitle>
          <CardDescription>
            Últimas notificaciones del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-4 p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                  !notification.read ? 'bg-muted/20 border-primary/20' : 'bg-background'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/20' :
                  notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/20' :
                  notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                  'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  <notification.icon className={`h-5 w-5 ${
                    notification.type === 'success' ? 'text-green-600' :
                    notification.type === 'error' ? 'text-red-600' :
                    notification.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                    <Badge
                      variant="outline"
                      className={typeColors[notification.type as keyof typeof typeColors]}
                    >
                      {notification.type === 'success' ? 'Éxito' :
                       notification.type === 'error' ? 'Error' :
                       notification.type === 'warning' ? 'Advertencia' : 'Información'}
                    </Badge>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!notification.read && (
                    <Button variant="ghost" size="sm">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}