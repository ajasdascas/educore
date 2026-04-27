import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserCheck } from "lucide-react";

export default function UsersPage() {
  const users = [
    { name: "Giovanni Esparza", email: "admin@educore.mx", role: "SUPER_ADMIN", status: "Activo", lastLogin: "Hace 2 min" },
    { name: "María López", email: "maria@colegio-la-paz.edu.mx", role: "SCHOOL_ADMIN", status: "Activo", lastLogin: "Hace 1 hora" },
    { name: "Carlos Rodríguez", email: "carlos@instituto-vasconcelos.edu.mx", role: "SCHOOL_ADMIN", status: "Pendiente", lastLogin: "Nunca" },
  ];

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-50 text-purple-700",
      SCHOOL_ADMIN: "bg-blue-50 text-blue-700",
      TEACHER: "bg-emerald-50 text-emerald-700",
      PARENT: "bg-amber-50 text-amber-700",
    };
    const labels: Record<string, string> = {
      SUPER_ADMIN: "Super Admin",
      SCHOOL_ADMIN: "Director",
      TEACHER: "Profesor",
      PARENT: "Padre",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role] || "bg-slate-100 text-slate-700"}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usuarios Globales</h2>
          <p className="text-muted-foreground text-sm mt-1">Todos los usuarios registrados en la plataforma</p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuarios</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Super Admins</CardTitle>
            <Shield className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activos Hoy</CardTitle>
            <UserCheck className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">2</div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Último Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 text-sm font-semibold">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{roleBadge(user.role)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === "Activo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {users.map((user) => (
          <Card key={user.email} className="shadow-sm border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {user.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground break-all">{user.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roleBadge(user.role)}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === "Activo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Último login: {user.lastLogin}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
