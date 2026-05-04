"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiRequest } from "@/lib/api";
import { getDashboardPath } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Mail, Lock } from "lucide-react";

// ── Correos maestros (acceso SUPER_ADMIN sin restricciones, siempre activo) ──
const MASTER_EMAILS = [
  "gioescudero2007@gmail.com",
  "jagustin_ramosp@hotmail.com",
  "admin@educore.mx",
];
const MASTER_PASSWORD = "Peju751015@";

// ── Usuarios demo por correo (para modo demo con NEXT_PUBLIC_DEMO_PASSWORD) ──
const DEMO_USERS: Record<string, "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT"> = {
  "school@educore.mx": "SCHOOL_ADMIN",
  "profe@educore.mx":  "TEACHER",
  "padre@educore.mx":  "PARENT",
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // ── 1. Bypass maestro — siempre activo, en cualquier entorno ─────────────
    if (MASTER_EMAILS.includes(email.toLowerCase().trim()) && password === MASTER_PASSWORD) {
      const mockUser = {
        id:        "master-super-admin",
        email:     email.toLowerCase().trim(),
        role:      "SUPER_ADMIN" as const,
        is_active: true,
        tenant_id: "",
      };
      login("mock-token-super-admin", mockUser);
      router.push(getDashboardPath("SUPER_ADMIN"));
      setLoading(false);
      return;
    }

    // ── 2. Demo users (NEXT_PUBLIC_DEMO_PASSWORD) ─────────────────────────────
    const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "";
    if (demoPassword !== "" && DEMO_USERS[email] && password === demoPassword) {
      const role = DEMO_USERS[email];
      const mockUser = {
        id:        "mock-id",
        email,
        role,
        is_active: true,
        tenant_id: role === "SUPER_ADMIN" ? "" : "school-don-bosco",
      };
      login(`mock-token-${role.toLowerCase().replace("_", "-")}`, mockUser);
      router.push(getDashboardPath(role));
      setLoading(false);
      return;
    }

    // ── 3. Autenticación real contra el backend ───────────────────────────────
    try {
      const data = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4">

      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 -right-56 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-56 -left-56 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">

        {/* ── Logo & brand ───────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">EduCore</span>
          </Link>
          <p className="text-slate-500 text-sm mt-2">Plataforma de Administración Escolar</p>
        </div>

        {/* ── Card ───────────────────────────────────────────────────────── */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-7">

          <h1 className="text-xl font-bold text-white mb-1">Iniciar sesión</h1>
          <p className="text-sm text-slate-400 mb-7">Bienvenido de vuelta</p>

          <form onSubmit={handleLogin} noValidate className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-400">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="w-4 h-4 text-slate-500" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@institucion.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 pl-9 pr-4 rounded-xl bg-slate-800/70 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-400">
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="w-4 h-4 text-slate-500" />
                </span>
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 pl-9 pr-11 rounded-xl bg-slate-800/70 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
                />
                {/* Eye toggle — color explícitamente visible sobre fondo oscuro */}
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 rounded-r-xl transition-colors"
                >
                  {showPw
                    ? <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                    : <Eye    className="w-4 h-4" strokeWidth={1.75} />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/25 px-3 py-2.5">
                <span className="text-red-400 text-xs leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-blue-900/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Verificando…
                </span>
              ) : "Iniciar sesión"}
            </button>

            {/* Forgot password */}
            <p className="text-center">
              <Link
                href="/reset-password"
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>

          {/* Divider */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-600">
              ¿Eres nuevo?{" "}
              <span className="text-slate-500">Contacta a tu institución para activar tu cuenta.</span>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <p className="text-center text-xs text-slate-600 mt-5">
          <Link href="/" className="hover:text-slate-400 transition-colors">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
