"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Eye, EyeOff, Lock, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiRequest, API_URL } from "@/lib/api";
import { getDashboardPath } from "@/lib/auth";

function formatSlug(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const ROLE_LABELS: Record<string, string> = {
  school_admin: "Director / Coordinador",
  teacher: "Profesor",
  parent: "Padre de familia",
};

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const slug = params.get("slug") || "";
  const role = params.get("role") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolName, setSchoolName] = useState("");

  // Try to fetch the school's display name
  useEffect(() => {
    if (!slug) return;
    fetch(`${API_URL}/api/v1/public/school-info?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.name) setSchoolName(d.data.name); })
      .catch(() => {});
  }, [slug]);

  const displaySchool = schoolName || (slug ? formatSlug(slug) : "");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (response.success) {
        login(response.data.access_token, response.data.user);
        router.push(getDashboardPath(response.data.user.role));
      } else {
        setError(response.message || "Credenciales incorrectas.");
      }
    } catch {
      setError("Error conectando con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-56 -top-56 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* School context banner */}
        {slug && (
          <div className="mb-4 flex items-center gap-2">
            <Link
              href={`/escuela/?slug=${slug}`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              {displaySchool || slug}
            </Link>
          </div>
        )}

        <div className="mb-8 text-center">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40 transition-transform group-hover:scale-105">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              {displaySchool || "Educore"}
            </span>
          </Link>
          {slug ? (
            <p className="mt-2 text-sm text-slate-500">
              {role && ROLE_LABELS[role] ? `Acceso — ${ROLE_LABELS[role]}` : "Plataforma de administracion escolar"}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Plataforma de administracion escolar</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-xl">
          <h1 className="mb-1 text-xl font-bold text-white">Iniciar sesion</h1>
          <p className="mb-7 text-sm text-slate-400">
            {displaySchool ? `Bienvenido a ${displaySchool}` : "Bienvenido de vuelta"}
          </p>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-400">
                Correo electronico
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@institucion.mx"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/70 pl-9 pr-4 text-sm text-white transition-colors placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-400">
                Contrasena
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-500" />
                </span>
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="********"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/70 pl-9 pr-11 text-sm text-white transition-colors placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((current) => !current)}
                  aria-label={showPw ? "Ocultar contrasena" : "Mostrar contrasena"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
                  {showPw ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5">
                <span className="text-xs leading-relaxed text-red-400">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verificando..." : "Iniciar sesion"}
            </button>

            <p className="text-center">
              <Link href="/reset-password" className="text-xs text-slate-500 transition-colors hover:text-blue-400">
                Olvidaste tu contrasena?
              </Link>
            </p>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-5 text-center">
            <p className="text-xs text-slate-600">
              Eres nuevo? <span className="text-slate-500">Contacta a tu institucion para activar tu cuenta.</span>
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-600">
          {slug ? (
            <Link href={`/escuela/?slug=${slug}`} className="transition-colors hover:text-slate-400">
              ← Volver a {displaySchool || slug}
            </Link>
          ) : (
            <Link href="/" className="transition-colors hover:text-slate-400">
              Volver al inicio
            </Link>
          )}
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
