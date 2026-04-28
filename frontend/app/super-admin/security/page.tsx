"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Key,
  Smartphone,
  Eye,
  AlertTriangle,
  CheckCircle,
  Lock,
  Globe,
  Monitor,
  Clock
} from "lucide-react";

const recentSessions = [
  {
    id: 1,
    device: "Chrome - Windows",
    location: "Jiutepec, Morelos",
    lastActive: "Activa ahora",
    current: true,
    ip: "192.168.1.100"
  },
  {
    id: 2,
    device: "Safari - iPhone",
    location: "Jiutepec, Morelos",
    lastActive: "Hace 2 horas",
    current: false,
    ip: "192.168.1.101"
  },
  {
    id: 3,
    device: "Edge - Windows",
    location: "Ciudad de México",
    lastActive: "Hace 1 día",
    current: false,
    ip: "201.123.45.67"
  }
];

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Seguridad
        </h1>
        <p className="text-muted-foreground">
          Gestiona la seguridad de tu cuenta y configuraciones de acceso
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cambiar Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              Actualiza tu contraseña para mantener tu cuenta segura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <Button>Cambiar Contraseña</Button>
          </CardContent>
        </Card>

        {/* Autenticación de Dos Factores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Autenticación de Dos Factores
            </CardTitle>
            <CardDescription>
              Añade una capa extra de seguridad a tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estado</p>
                <p className="text-sm text-muted-foreground">Desactivada</p>
              </div>
              <Badge variant="outline" className="text-yellow-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Inactiva
              </Badge>
            </div>
            <Button className="w-full">
              Configurar 2FA
            </Button>
            <p className="text-xs text-muted-foreground">
              Recomendamos usar una app autenticadora como Google Authenticator
            </p>
          </CardContent>
        </Card>

        {/* Configuración de Privacidad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacidad
            </CardTitle>
            <CardDescription>
              Controla la visibilidad de tu información
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mostrar email</p>
                <p className="text-sm text-muted-foreground">Visible para otros admins</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Actividad reciente</p>
                <p className="text-sm text-muted-foreground">Mostrar última conexión</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Notificaciones de login</p>
                <p className="text-sm text-muted-foreground">Alertas por nuevos accesos</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Sesión */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Configuración de Sesión
            </CardTitle>
            <CardDescription>
              Controla el comportamiento de tus sesiones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Tiempo de inactividad (minutos)</Label>
              <Input
                id="session-timeout"
                type="number"
                defaultValue="120"
                min="15"
                max="480"
              />
              <p className="text-xs text-muted-foreground">
                Tu sesión se cerrará automáticamente después de este tiempo de inactividad
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cerrar otras sesiones al cambiar contraseña</p>
                <p className="text-sm text-muted-foreground">Seguridad adicional</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sesiones Activas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Sesiones Activas
          </CardTitle>
          <CardDescription>
            Dispositivos y ubicaciones desde donde has accedido recientemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{session.device}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      {session.location} • {session.ip}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.lastActive}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {session.current ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Actual
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="text-destructive">
                      Cerrar Sesión
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" className="text-destructive">
              Cerrar Todas las Otras Sesiones
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}