"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { API_URL } from "@/lib/api";
import { evaluatePassword } from "@/lib/password-policy";
import { getTenantFromHost, parseTenantSlug } from "@/lib/tenant";

function resolveTenantSlug(paramSlug: string | null): string {
  if (typeof window !== "undefined") {
    const hostSlug = getTenantFromHost(window.location.hostname);
    if (hostSlug) return hostSlug;
  }
  return parseTenantSlug(paramSlug) || "";
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token] = useState(() => searchParams.get("token")?.trim() || "");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const policy = useMemo(() => evaluatePassword(newPassword), [newPassword]);
  const loginHref = slug ? `/login?slug=${encodeURIComponent(slug)}` : "/login";

  useEffect(() => {
    setSlug(resolveTenantSlug(searchParams.get("slug")));

    // Keep the one-time credential out of the visible URL and browser history.
    if (searchParams.has("token")) {
      const sanitized = new URL(window.location.href);
      sanitized.searchParams.delete("token");
      window.history.replaceState(window.history.state, "", `${sanitized.pathname}${sanitized.search}${sanitized.hash}`);
    }
  }, [searchParams]);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          tenant_slug: slug,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success === false) {
        setError(body.error || body.message || "La recuperación por correo no está disponible en este momento.");
        return;
      }
      setInfo(body.message || "Solicitud procesada. Si los datos coinciden, recibirás un enlace por correo.");
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!policy.valid) {
      setError("La contraseña no cumple todos los requisitos de seguridad.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword, tenant_slug: slug }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success === false) {
        setError(body.error || body.message || "El enlace es inválido, expiró o ya fue utilizado.");
        return;
      }
      setDone(true);
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Contraseña actualizada</h1>
          <p className="mb-6 text-sm text-slate-400">El enlace quedó consumido. Inicia sesión con tu nueva contraseña.</p>
          <button onClick={() => router.replace(loginHref)} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500">
            Ir al login
          </button>
        </section>
      </main>
    );
  }

  const requirements: Array<[boolean, string]> = [
    [policy.longEnough, "12 caracteres o más"],
    [policy.withinByteLimit, "Máximo 72 bytes"],
    [policy.hasUppercase, "Una mayúscula"],
    [policy.hasLowercase, "Una minúscula"],
    [policy.hasNumber, "Un número"],
    [policy.hasSymbol, "Un símbolo"],
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <Link href={loginHref} className="mb-6 inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al login
        </Link>

        {token ? (
          <>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15">
              <Lock className="h-6 w-6 text-amber-400" />
            </div>
            <h1 className="mb-1 text-2xl font-bold text-white">Nueva contraseña</h1>
            <p className="mb-6 text-sm text-slate-400">Define una contraseña segura para completar la recuperación.</p>
            <form onSubmit={resetPassword} className="space-y-4">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Nueva contraseña"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Confirmar contraseña"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <ul className="grid grid-cols-2 gap-1 text-xs" aria-label="Requisitos de contraseña">
                {requirements.map(([met, label]) => (
                  <li key={label} className={met ? "text-emerald-400" : "text-slate-500"}>{met ? "✓" : "○"} {label}</li>
                ))}
              </ul>
              {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={loading || !policy.valid || newPassword !== confirmation} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
                {loading ? "Actualizando..." : "Cambiar contraseña"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15">
              <Mail className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="mb-1 text-2xl font-bold text-white">Recuperar acceso</h1>
            <p className="mb-6 text-sm text-slate-400">Ingresa tu correo. Si corresponde a este acceso, enviaremos un enlace de un solo uso.</p>
            <form onSubmit={requestReset} className="space-y-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@escuela.mx" autoComplete="email" required className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" />
              </div>
              {info && <p role="status" className="rounded-lg border border-blue-800 bg-blue-950/40 px-3 py-2 text-xs leading-relaxed text-blue-300">{info}</p>}
              {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
                {loading ? "Procesando..." : "Enviar enlace de recuperación"}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 border-t border-slate-800 pt-4 text-center">
          <p className="text-xs text-slate-600">¿Necesitas ayuda? <a href="mailto:contacto@onlineu.mx?subject=Recuperar%20acceso%20EduCore" className="text-blue-500 hover:underline">Contacta a soporte</a></p>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">Cargando...</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
