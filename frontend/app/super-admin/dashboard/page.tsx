"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, Activity, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface StatsData {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  total_students: number;
  mrr_mxn: number;
  recent_schools: any[];
  alerts: any[];
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await authFetch("/api/v1/super-admin/dashboard/overview");
        if (response.success) {
          setStats(response.data);
        } else {
          setError(response.message || "Error al cargar estadísticas");
        }
      } catch (err) {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen del estado del sistema EduCore</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escuelas (Tenants)</CardTitle>
            <Building className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.total_tenants}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.active_tenants} activas, {stats?.trial_tenants} en prueba</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Totales</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.total_students}</div>
            <p className="text-xs text-muted-foreground mt-1">En todas las escuelas</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Salud del Sistema</CardTitle>
            <Activity className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Óptimo</div>
            <p className="text-xs text-green-600 font-medium mt-1">API en línea</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Escuelas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recent_schools && stats.recent_schools.length > 0 ? (
                stats.recent_schools.map((school, i) => (
                  <div key={school.id || i} className="flex items-center gap-3 pb-2 border-b last:border-0 hover:bg-muted/50 p-2 rounded-md transition-colors">
                    <div className={`w-2 h-2 rounded-full ${school.status === 'active' ? 'bg-green-600' : 'bg-orange-500'}`}></div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{school.name}</p>
                      <p className="text-muted-foreground text-xs">Plan: {school.plan} - {new Date(school.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay escuelas recientes</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Alertas del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.alerts && stats.alerts.length > 0 ? (
                stats.alerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 pb-2 border-b last:border-0 hover:bg-muted/50 p-2 rounded-md transition-colors">
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{alert.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay alertas pendientes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
