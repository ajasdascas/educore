import Link from "next/link";
import { Mail } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Recuperar acceso</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Por seguridad, la recuperacion de contrasena se solicita con tu escuela o con el equipo de Educore.
          Escribe a contacto@onlineu.mx desde tu correo institucional.
        </p>
        <div className="mt-6 grid gap-3">
          <a
            href="mailto:contacto@onlineu.mx?subject=Recuperar%20acceso%20Educore"
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Escribir a soporte
          </a>
          <Link href="/login" className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800">
            Volver al login
          </Link>
        </div>
      </section>
    </main>
  );
}
