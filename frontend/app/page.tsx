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
          {/* Role Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setEmail("admin@educore.mx");
                setPassword("admin123");
                // The useEffect below will trigger the login automatically
                setTimeout(() => document.getElementById("hidden-submit")?.click(), 100);
              }}
              className="group flex flex-col items-center justify-center p-6 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:bg-blue-600/20 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/40 transition-colors">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Super Admin</h3>
              <p className="text-xs text-slate-400 mt-1 text-center">Gestión global del sistema</p>
            </button>

            <button
              onClick={() => {
                setEmail("school@educore.mx");
                setPassword("school123");
                setTimeout(() => document.getElementById("hidden-submit")?.click(), 100);
              }}
              className="group flex flex-col items-center justify-center p-6 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:bg-green-600/20 hover:border-green-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/40 transition-colors">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">School Admin</h3>
              <p className="text-xs text-slate-400 mt-1 text-center">Administración de escuela</p>
            </button>

            <button
              onClick={() => {
                setEmail("profe@educore.mx");
                setPassword("profe123");
                setTimeout(() => document.getElementById("hidden-submit")?.click(), 100);
              }}
              className="group flex flex-col items-center justify-center p-6 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:bg-purple-600/20 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/40 transition-colors">
                <GraduationCap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Profesor</h3>
              <p className="text-xs text-slate-400 mt-1 text-center">Gestión académica</p>
            </button>

            <button
              onClick={() => {
                setEmail("padre@educore.mx");
                setPassword("padre123");
                setTimeout(() => document.getElementById("hidden-submit")?.click(), 100);
              }}
              className="group flex flex-col items-center justify-center p-6 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:bg-orange-600/20 hover:border-orange-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/40 transition-colors">
                <User className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Padre de Familia</h3>
              <p className="text-xs text-slate-400 mt-1 text-center">Seguimiento de hijos</p>
            </button>
          </div>

          <form onSubmit={handleLogin} className="mt-6">
            <input type="hidden" value={email} />
            <input type="hidden" value={password} />
            <button type="submit" id="hidden-submit" className="hidden">Submit</button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center text-sm text-blue-400 animate-pulse">
                Iniciando sesión como {email}...
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
             <p className="text-xs text-slate-500">Selecciona un rol para ver la demostración interactiva.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
