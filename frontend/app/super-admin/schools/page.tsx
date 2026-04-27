import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Activity, TrendingUp } from "lucide-react";

export default function SchoolsPage() {
  const schools = [
    { name: "Colegio La Paz", slug: "colegio-la-paz", plan: "Pro", status: "active", students: 420, admins: 3 },
    { name: "Instituto Vasconcelos", slug: "instituto-vasconcelos", plan: "Starter", status: "trial", students: 180, admins: 1 },
    { name: "Escuela Montessori del Valle", slug: "montessori-valle", plan: "Enterprise", status: "active", students: 650, admins: 5 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Escuelas</h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona todas las escuelas registradas en la plataforma</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          + Nueva Escuela
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Escuela</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alumnos</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admins</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.slug} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{school.name}</p>
                      <p className="text-xs text-slate-400">{school.slug}.educore.mx</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={school.plan === "Enterprise" ? "default" : "secondary"} className="text-xs">
                    {school.plan}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    school.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      school.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                    }`} />
                    {school.status === "active" ? "Activa" : "Prueba"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{school.students}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{school.admins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
