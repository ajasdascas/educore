"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiRequest } from "@/lib/api";
import { DEMO_MODE_ENABLED, getDashboardPath } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { User, Users, GraduationCap, Building2, Eye, EyeOff, ArrowLeft, BookOpen } from "lucide-react";

const ROLE_OPTIONS = [
  { id: "SUPER_ADMIN", name: "Super Admin",   icon: Building2,    color: "blue",   hint: "Acceso completo a la plataforma" },
  { id: "SCHOOL_ADMIN", name: "School Admin", icon: Users,        color: "green",  hint: "Gestión de tu institución" },
  { id: "TEACHER",      name: "Profesor",     icon: GraduationCap,color: "purple", hint: "Portal del docente" },
  { id: "PARENT",       name: "Padre / Tutor",icon: User,         color: "orange", hint: "Seguimiento de tus hijos" },
] as const;

const COLOR_MAP = {
  blue:   { ring: "ring-blue-500/60",   bg: "bg-blue-500/15",   icon: "text-blue-400",   hover: "hover:bg-blue-500/25 hover:border-blue-500/60" },
  green:  { ring: "ring-green-500/60",  bg: "bg-green-500/15",  icon: "text-green-400",  hover: "hover:bg-green-500/25 hover:border-green-500/60" },
  purple: { ring: "ring-purple-500/60", bg: "bg-purple-500/15", icon: "text-purple-400", hover: "hover:bg-purple-500/25 hover:border-purple-500/60" },
  orange: { ring: "ring-orange-500/60", bg: "bg-orange-500/15", icon: "text-orange-400", hover: "hover:bg-orange-500/25 hover:border-orange-500/60" },
};

const demoTokenForRole = (role: string) =>
  ["mock", "token", role.toLowerCase().replace("_", "-")].join("-");

const DEMO_USERS: Record<string, { role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" }> = {
  "school@educore.mx":  { role: "SCHOOL_ADMIN" },
  "profe@educore.mx":   { role: "TEACHER" },
  "padre@educore.mx":   { role: "PARENT" },
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<typeof ROLE_OPTIONS[number] | null>(null);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleRoleSelect = (role: typeof ROLE_OPTIONS[number]) => {
    setSelectedRole(role);
    setEmail("");
    setPassword("");
    setError("");
    setShowPw(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "";

    // ── Demo admin bypass ──────────────────────────────────────────────────
    if (DEMO_MODE_ENABLED && demoPassword !== "" && selectedRole) {
      if (email === "admin@educore.mx" && password === demoPassword) {
        const mockUser = {
          id: `mock-${selectedRole.id.toLowerCase()}`,
          email,
          role: selectedRole.id as "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT",
          is_active: true,
          tenant_id: selectedRole.id === "SUPER_ADMIN" ? "" : "school-don-bosco",
        };
        login(demoTokenForRole(selectedRole.id), mockUser);
        router.push(getDashboardPath(mockUser.role));
        setLoading(false);
        return;
      }
      if (DEMO_USERS[email] && password === demoPassword) {
        const mockUser = {
          id: "mock-id",
          email,
          role: DEMO_USERS[email].role,
          is_active: true,
          tenant_id: DEMO_USERS[email].role === "SUPER_ADMIN" ? "" : "school-don-bosco",
        };
        login(demoTokenForRole(DEMO_USERS[email].role), mockUser);
        router.push(getDashboardPath(mockUser.role));
        setLoading(false);
        return;
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
      const data = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: selectedRole?.id }),
      });
      if (data.success) {
        login(data.data.access_token, data.data.user);
        router.push(getDashboardPath(data.data.user.role));
      } else {
        setError(data.message || "Credenciales incorrectas.");
      }
    } catch {
      setError("Error conectando con el servidor. Intenta de nuevo.");
    }
    setLoading(false);
  };

  const colors = selectedRole ? COLOR_MAP[selectedRole.color] : null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4">
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 -right-56 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-56 -left-56 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo & brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">EduCore</span>
          </Link>
          <p className="text-slate-500 text-sm mt-2">Plataforma de Administración Escolar</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
          {/* ── Vista 1: selección de rol ── */}
          <div
            className={`transition-all duration-400 ${
              selectedRole ? "h-0 overflow-hidden opacity-0" : "p-6 opacity-100"
            }`}
          >
            <h1 className="text-center text-base font-semibold text-slate-200 mb-1">Iniciar sesión</h1>
            <p className="text-center text-xs text-slate-500 mb-5">Selecciona tu perfil para continuar</p>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLE_OPTIONS.map((role) => {
                const c = COLOR_MAP[role.color];
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border border-slate-700/60 bg-slate-800/40 transition-all duration-200 ${c.hover} focus:outline-none focus-visible:ring-2 ${c.ring}`}
                    aria-label={`Ingresar como ${role.name}`}
                  >
                    <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${c.icon}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white leading-tight">{role.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{role.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Vista 2: formulario ── */}
          <div
            className={`transition-all duration-400 ${
              selectedRole ? "p-6 opacity-100" : "h-0 overflow-hidden opacity-0 pointer-events-none"
            }`}
          >
            {/* Back + role indicator */}
            <div className="flex items-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                aria-label="Volver a selección de perfil"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {selectedRole && (
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${COLOR_MAP[selectedRole.color].bg} flex items-center justify-center`}>
                    <selectedRole.icon className={`w-3.5 h-3.5 ${COLOR_MAP[selectedRole.color].icon}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-200">{selectedRole.name}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleLogin} noValidate className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-400">
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@institucion.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-slate-800/70 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-400">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-10 pl-3 pr-10 rounded-lg bg-slate-800/70 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
                  />
                  {/* Eye toggle — visible con contraste correcto sobre fondo oscuro */}
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 rounded-r-lg transition-colors"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/25 p-3">
                  <span className="text-red-400 text-xs leading-relaxed">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-blue-900/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Verificando…
                  </span>
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Back to home */}
        <p className="text-center text-xs text-slate-600 mt-6">
          <Link href="/" className="hover:text-slate-400 transition-colors">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
