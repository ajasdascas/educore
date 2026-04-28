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
  const [showDemo, setShowDemo] = useState(false);

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
          <form onSubmit={handleLogin} className="space-y-5">
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

            {/* Demo Info */}
            <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showDemo ? '▼' : '▶'} Demo: Tipos de usuario disponibles
              </button>
              {showDemo && (
                <div className="mt-2 text-xs text-slate-400 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@educore.mx");
                      setPassword("admin123");
                    }}
                    className="w-full flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded transition-colors text-left"
                  >
                    <Building2 className="w-3 h-3 text-blue-400" />
                    <span>Super Admin: Gestión global del sistema</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("school@educore.mx");
                      setPassword("school123");
                    }}
                    className="w-full flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded transition-colors text-left"
                  >
                    <Users className="w-3 h-3 text-green-400" />
                    <span>School Admin: Administración de escuela</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("profe@educore.mx");
                      setPassword("profe123");
                    }}
                    className="w-full flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded transition-colors text-left"
                  >
                    <GraduationCap className="w-3 h-3 text-purple-400" />
                    <span>Profesor: Gestión académica</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("padre@educore.mx");
                      setPassword("padre123");
                    }}
                    className="w-full flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded transition-colors text-left"
                  >
                    <User className="w-3 h-3 text-orange-400" />
                    <span>Padre: Seguimiento de hijos</span>
                  </button>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-slate-500 pt-2">
              Demo: admin@educore.mx / admin123
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
