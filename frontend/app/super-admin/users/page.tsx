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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usuarios Globales</h2>
          <p className="text-slate-500 text-sm mt-1">Todos los usuarios registrados en la plataforma</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Usuarios</CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">3</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Super Admins</CardTitle>
            <Shield className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">1</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Activos Hoy</CardTitle>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">2</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Último Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mr-3 text-sm font-semibold">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{roleBadge(user.role)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
