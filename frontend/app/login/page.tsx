"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Eye, EyeOff, Lock, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiRequest, API_URL } from "@/lib/api";
import { getDashboardPath } from "@/lib/auth";
import { getTenantFromHost } from "@/lib/tenant";

function formatSlug(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ROLE_LABELS: Record<string, string> = {
  school_admin: "Director / Coordinador",
  teacher: "Profesor",
  parent: "Padre de familia",
  student: "Estudiante",
};

/**
 * Resolve the active school slug in priority order:
 *  1. ?slug= searchParam  (direct link from super-admin or escuela page)
 *  2. hostname subdomain  (kinder1.onlineu.mx/login?role=school_admin)
 *  3. null               (onlineu.mx/login — no school context)
 */
function resolveSlug(paramSlug: string | null): {
  slug: string;
  fromSubdomain: boolean;
} {
  if (paramSlug) return { slug: paramSlug, fromSubdomain: false };

  if (typeof window !== "undefined") {
    const sub = getTenantFromHost(window.location.hostname);
    if (sub) return { slug: sub, fromSubdomain: true };
  }

  return { slug: "", fromSubdomain: false };
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const role = params.get("role") || "";

  // Slug resolution — may update after hydration (hostname check runs client-side)
  const [slug, setSlug] = useState("");
  const [fromSubdomain, setFromSubdomain] = useState(false);

  useEffect(() => {
    const { slug: resolved, fromSubdomain: sub } = resolveSlug(params.get("slug"));
    setSlug(resolved);
    setFromSubdomain(sub);
  }, [params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolName, setSchoolName] = useState("");

  // Fetch the school's real display name from the backend
  useEffect(() => {
    if (!slug) return;
    fetch(`${API_URL}/api/v1/public/schools/resolve?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.data?.name) setSchoolName(d.data.name); })
      .catch(() => {});
  }, [slug]);

  const displaySchool = schoolName || (slug ? formatSlug(slug) : "");

  // "Back to portal" link — preserves the correct URL scheme
  const portalHref = fromSubdomain
    ? `https://${slug}.onlineu.mx`          // they came from subdomain
    : slug
    ? `/escuela/?slug=${slug}`              // they came from /escuela page
    : "/";

  // Maps portal role param → expected dashboard route
  const ROLE_DASHBOARDS: Record<string, string> = {
    school_admin: "/school-admin/dashboard",
    teacher: "/teacher/dashboard",
    parent: "/parent/dashboard",
    student: "/student/dashboard",
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: Record<string, string> = {
        email: email.trim().toLowerCase(),
        password,
      };
      // Send school context and selected role to backend for validation
      if (slug) body.tenant_slug = slug;
      if (role) body.requested_role = role;

      const response = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // ROLE_MISMATCH: credentials are valid but role doesn't match selected portal
      if (!response.success && response.code === "ROLE_MISMATCH") {
        setError(response.message || "Este correo no pertenece al portal seleccionado.");
        return;
      }

      if (response.success) {
        login(response.data.access_token, response.data.user);
        const userRole = response.data.user.role as string;

        // If a specific portal role was selected, redirect to that dashboard
        // regardless of what getDashboardPath() would normally return.
        if (role && ROLE_DASHBOARDS[role]) {
          router.push(ROLE_DASHBOARDS[role]);
        } else if (slug) {
          // School context but no specific role — redirect by actual role
          if (userRole === "SUPER_ADMIN" || userRole === "SCHOOL_ADMIN") {
            router.push("/school-admin/dashboard");
          } else if (userRole === "TEACHER") {
            router.push("/teacher/dashboard");
          } else if (userRole === "PARENT") {
            router.push("/parent/dashboard");
          } else if (userRole === "STUDENT") {
            router.push("/student/dashboard");
          } else {
            router.push(getDashboardPath(userRole));
          }
        } else {
          // No school context — standard platform login
          router.push(getDashboardPath(userRole));
        }
      } else {
        setError(response.message || response.error || "Credenciales incorrectas.");
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
        {/* Back link — only when there's school context */}
        {slug && (
          <div className="mb-4 flex items-center gap-2">
            {fromSubdomain ? (
              <a
                href={portalHref}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
              >
                <ArrowLeft className="h-3 w-3" />
                {displaySchool || slug}
              </a>
            ) : (
              <Link
                href={portalHref}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
              >
                <ArrowLeft className="h-3 w-3" />
                {displaySchool || slug}
              </Link>
            )}
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="group inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              {displaySchool || "Educore"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {slug && role && ROLE_LABELS[role]
              ? `Acceso — ${ROLE_LABELS[role]}`
              : "Plataforma de administracion escolar"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-xl">
          <h1 className="mb-1 text-xl font-bold text-white">Iniciar sesion</h1>
          <p className="mb-7 text-sm text-slate-400">
            {displaySchool ? `Bienvenido a ${displaySchool}` : "Bienvenido de vuelta"}
          </p>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            {/* Email */}
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/70 pl-9 pr-4 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {/* Password */}
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/70 pl-9 pr-11 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Ocultar contrasena" : "Mostrar contrasena"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5"
              >
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
              <Link
                href="/forgot-password"
                className="text-xs text-slate-500 transition-colors hover:text-blue-400"
              >
                Olvidaste tu contrasena?
              </Link>
            </p>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-5 text-center">
            <p className="text-xs text-slate-600">
              Eres nuevo?{" "}
              <span className="text-slate-500">
                Contacta a tu institucion para activar tu cuenta.
              </span>
            </p>
          </div>
        </div>

        {/* Bottom back link */}
        <p className="mt-5 text-center text-xs text-slate-600">
          {slug ? (
            fromSubdomain ? (
              <a href={portalHref} className="transition-colors hover:text-slate-400">
                ← Volver a {displaySchool || slug}
              </a>
            ) : (
              <Link href={portalHref} className="transition-colors hover:text-slate-400">
                ← Volver a {displaySchool || slug}
              </Link>
            )
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
