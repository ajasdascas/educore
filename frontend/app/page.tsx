"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiRequest } from "@/lib/api";
import { getDashboardPath } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { User, Users, GraduationCap, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"role_selection" | "login">("role_selection");
  const [selectedRole, setSelectedRole] = useState("");

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setStep("login");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.success) {
        login(data.data.access_token, data.data.user);
        
        // Enrutamiento forzado basado en la selección del usuario para testing/demo
        const roleMapping: Record<string, string> = {
          padre: "/parent/dashboard",
          estudiante: "/student/dashboard",
          profesor: "/teacher/dashboard",
          director: "/school/dashboard",
          administrador: "/super-admin/dashboard"
        };
        
        const destination = roleMapping[selectedRole] || getDashboardPath(data.data.user.role);
        router.push(destination);
      } else {
        setError(data.message || "Credenciales incorrectas.");
      }
    } catch {
      setError("Error conectando con el servidor.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md mx-4 shadow-2xl border-slate-700/50 bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EduCore</h1>
          <p className="text-slate-400 text-sm mt-1">Plataforma de Administración Escolar</p>
        </CardHeader>
        <CardContent className="p-6 pt-4 animate-in fade-in zoom-in-95 duration-500">
          {step === "role_selection" ? (
            <div className="space-y-4">
              <h2 className="text-center text-white font-medium mb-6">Selecciona tu perfil para ingresar</h2>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-blue-600 hover:text-white border-slate-700 bg-slate-800 text-slate-300" onClick={() => handleRoleSelect("padre")}>
                  <Users className="w-8 h-8" />
                  <span>Padre de Familia</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-indigo-600 hover:text-white border-slate-700 bg-slate-800 text-slate-300" onClick={() => handleRoleSelect("estudiante")}>
                  <User className="w-8 h-8" />
                  <span>Estudiante</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-purple-600 hover:text-white border-slate-700 bg-slate-800 text-slate-300" onClick={() => handleRoleSelect("profesor")}>
                  <GraduationCap className="w-8 h-8" />
                  <span>Profesor</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-emerald-600 hover:text-white border-slate-700 bg-slate-800 text-slate-300" onClick={() => handleRoleSelect("administrador")}>
                  <Building2 className="w-8 h-8" />
                  <span>Administrador</span>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5 animate-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-slate-400 capitalize bg-slate-700/50 px-3 py-1 rounded-full">Perfil: {selectedRole}</span>
                <button type="button" onClick={() => setStep("role_selection")} className="text-sm text-blue-400 hover:text-blue-300">Cambiar</button>
              </div>
              <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@educore.mx"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg transition-all duration-200"
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </Button>

            <p className="text-center text-xs text-slate-500 pt-2">
              Demo: admin@educore.mx / admin123
            </p>
          </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
