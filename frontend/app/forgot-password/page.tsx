"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { API_URL } from "@/lib/api";

function ForgotPasswordInner() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // Always show success to avoid user enumeration — even on 404/422
      if (res.status < 500) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Error al procesar la solicitud. Intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-56 -top-56 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <ArrowLeft className="h-3 w-3" />
            Volver al inicio de sesión
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="group inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Educore</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Plataforma de administración escolar</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-xl">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Revisa tu correo</h1>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Si <span className="text-slate-300">{email}</span> está registrado en el
                  sistema, recibirás instrucciones para restablecer tu contraseña en unos minutos.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Revisa también tu carpeta de spam. Si no llega, contacta a tu institución.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push(`/reset-password?email=${encodeURIComponent(email)}`)
                }
                className="mt-2 text-xs text-blue-400 transition-colors hover:text-blue-300 underline underline-offset-4"
              >
                Ya tengo mi código — ingresar contraseña nueva
              </button>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-bold text-white">Recuperar contraseña</h1>
              <p className="mb-7 text-sm text-slate-400">
                Ingresa tu correo y te enviaremos instrucciones para restablecer tu acceso.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="fp-email"
                    className="block text-xs font-medium text-slate-400"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-4 w-4 text-slate-500" />
                    </span>
                    <input
                      id="fp-email"
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
                  disabled={loading || !email.trim()}
                  className="mt-1 h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Enviando..." : "Enviar instrucciones"}
                </button>

                <p className="text-center text-xs text-slate-600">
                  ¿Ya tienes un código?{" "}
                  <Link
                    href="/reset-password"
                    className="text-slate-500 transition-colors hover:text-blue-400"
                  >
                    Ingresar contraseña nueva
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordInner />
    </Suspense>
  );
}
