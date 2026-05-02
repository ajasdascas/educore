"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiRequest } from "@/lib/api";
import { DEMO_MODE_ENABLED, getDashboardPath } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { User, Users, GraduationCap, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<{ id: string; name: string } | null>(null);
  const demoTokenForRole = (role: string) => ["mock", "token", role.toLowerCase().replace("_", "-")].join("-");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // --- MOCK PARA USUARIOS DEMO (Bypass temporal para diseño/pruebas) ---
    const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "";
    const demoUsers: Record<string, { role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" }> = {
      "school@educore.mx": { role: "SCHOOL_ADMIN" },
      "profe@educore.mx": { role: "TEACHER" },
      "padre@educore.mx": { role: "PARENT" },
    };

    const selectedDemoRole = selectedRole?.id as "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | undefined;
    const fixedAdminDemo = demoPassword !== "" && email === "admin@educore.mx" && password === demoPassword && selectedDemoRole;
    if (DEMO_MODE_ENABLED && fixedAdminDemo) {
      const mockUser = {
        id: `mock-${selectedDemoRole.toLowerCase()}`,
        email,
        role: selectedDemoRole,
        is_active: true,
        tenant_id: selectedDemoRole === "SUPER_ADMIN" ? "" : "school-don-bosco",
      };

      login(demoTokenForRole(selectedDemoRole), mockUser);
      router.push(getDashboardPath(mockUser.role));
      setLoading(false);
      return;
    }

    if (DEMO_MODE_ENABLED && demoPassword !== "" && demoUsers[email] && password === demoPassword) {
      const mockUser = {
        id: "mock-id",
        email: email,
        role: demoUsers[email].role,
        is_active: true,
        tenant_id: demoUsers[email].role === "SUPER_ADMIN" ? "" : "school-don-bosco"
      };
      
      login(demoTokenForRole(demoUsers[email].role), mockUser);
      const destination = getDashboardPath(mockUser.role);
      router.push(destination);
      setLoading(false);
      return;
    }
    // ----------------------------------------------------------------------

    try {
      const data = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: selectedRole?.id }),
      });

      if (data.success) {
        login(data.data.access_token, data.data.user);

        // Redirigir basado en el rol real del usuario
        const destination = getDashboardPath(data.data.user.role);
        router.push(destination);
      } else {
        setError(data.message || "Credenciales incorrectas.");
      }
    } catch {
      setError("Error conectando con el servidor.");
    }
    setLoading(false);
  };

  const handleRoleSelect = (roleId: string, roleName: string) => {
    setSelectedRole({ id: roleId, name: roleName });
    // Limpiar campos al cambiar de rol
    setEmail("");
    setPassword("");
    setError("");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md mx-4 shadow-2xl border-slate-700/50 bg-slate-800/80 backdrop-blur-sm relative z-10 overflow-hidden">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EduCore</h1>
          <p className="text-slate-400 text-sm mt-1">Plataforma de Administración Escolar</p>
        </CardHeader>
        <CardContent className="p-6 pt-4 min-h-[350px] flex flex-col relative">
          
          {/* VISTA 1: SELECCIÓN DE ROL */}
          <div className={`transition-all duration-500 absolute inset-0 p-6 flex flex-col justify-center ${selectedRole ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
            <h2 className="text-center text-sm text-slate-300 font-medium mb-4">Selecciona tu perfil para ingresar</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRoleSelect("SUPER_ADMIN", "Super Admin")}
                className="group flex flex-col items-center justify-center p-4 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:bg-blue-600/20 hover:border-blue-500/50 transition-all duration-300"
              >
                <div className="w-10 h-10 mb-2 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/40 transition-colors">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xs font-semibold text-white">Super Admin</h3>
              </button>

              <button
                onClick={() => handleRoleSelect("SCHOOL_ADMIN", "School Admin")}
                className="group flex flex-col items-center justify-center p-4 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:bg-green-600/20 hover:border-green-500/50 transition-all duration-300"
              >
                <div className="w-10 h-10 mb-2 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/40 transition-colors">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xs font-semibold text-white">School Admin</h3>
              </button>

              <button
                onClick={() => handleRoleSelect("TEACHER", "Profesor")}
                className="group flex flex-col items-center justify-center p-4 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:bg-purple-600/20 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="w-10 h-10 mb-2 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/40 transition-colors">
                  <GraduationCap className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xs font-semibold text-white">Profesor</h3>
              </button>

              <button
                onClick={() => handleRoleSelect("PARENT", "Padre")}
                className="group flex flex-col items-center justify-center p-4 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:bg-orange-600/20 hover:border-orange-500/50 transition-all duration-300"
              >
                <div className="w-10 h-10 mb-2 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/40 transition-colors">
                  <User className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-xs font-semibold text-white">Padre de Familia</h3>
              </button>
            </div>
          </div>

          {/* VISTA 2: FORMULARIO DE LOGIN */}
          <div className={`transition-all duration-500 absolute inset-0 p-6 flex flex-col justify-center bg-slate-800/95 backdrop-blur-md z-20 ${selectedRole ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="flex items-center mb-6">
              <button 
                onClick={() => setSelectedRole(null)}
                className="text-slate-400 hover:text-white transition-colors p-1 -ml-1 mr-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <h2 className="text-lg font-semibold text-white">
                Ingreso: <span className="text-blue-400">{selectedRole?.name}</span>
              </h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm font-medium">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@educore.mx"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 h-11"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-xs text-center">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
              >
                {loading ? "Verificando credenciales..." : "Ingresar a mi cuenta"}
              </Button>
            </form>
          </div>

        </CardContent>
      </Card>
    </main>
  );
}
