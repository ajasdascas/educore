"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { API_URL } from "@/lib/api";

type Step = "email" | "code" | "done";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [step, setStep] = useState<Step>(initialToken ? "code" : "email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo(
          "Si el correo existe en el sistema, el administrador podrá proporcionarte el token de recuperación. " +
          "Si tienes acceso al servidor, el token se guarda en la base de datos en el campo invitation_token del usuario."
        );
        setStep("code");
      } else {
        setError(data.message || "Error al procesar la solicitud");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim() || !newPassword) return;
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("done");
      } else {
        setError(data.message || "Token inválido o expirado. Solicita uno nuevo.");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 mb-5">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Contraseña actualizada!</h1>
          <p className="text-slate-400 text-sm mb-6">Tu contraseña se cambió exitosamente. Ya puedes iniciar sesión.</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition"
          >
            Ir al login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-6 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al login
        </Link>

        {step === "email" ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 mb-5">
              <Mail className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Recuperar acceso</h1>
            <p className="text-slate-400 text-sm mb-6">
              Ingresa tu correo institucional y procesaremos la solicitud de recuperación.
            </p>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@escuela.mx"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {loading ? "Procesando..." : "Solicitar recuperación"}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-500">
              ¿Ya tienes un token?{" "}
              <button
                onClick={() => setStep("code")}
                className="text-blue-400 hover:underline"
              >
                Ingresar código directamente
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 mb-5">
              <KeyRound className="h-6 w-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Nueva contraseña</h1>
            <p className="text-slate-400 text-sm mb-2">
              Ingresa el token de recuperación y tu nueva contraseña.
            </p>
            {info && (
              <p className="text-blue-300 text-xs mb-4 bg-blue-950/40 border border-blue-800 rounded-lg px-3 py-2 leading-relaxed">
                {info}
              </p>
            )}
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Token de recuperación"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none font-mono transition"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña (mín. 8 caracteres)"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {loading ? "Actualizando..." : "Cambiar contraseña"}
              </button>
            </form>
            {!initialToken && (
              <button
                onClick={() => { setStep("email"); setError(""); setInfo(""); }}
                className="mt-3 text-xs text-slate-500 hover:text-slate-300 w-full text-center transition"
              >
                ← Volver a ingresar correo
              </button>
            )}
          </>
        )}

        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-600 text-center">
            ¿Sin acceso al token?{" "}
            <a
              href="mailto:contacto@onlineu.mx?subject=Recuperar%20acceso%20Educore"
              className="text-blue-500 hover:underline"
            >
              Contacta a soporte
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-500 text-sm">
          Cargando...
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
