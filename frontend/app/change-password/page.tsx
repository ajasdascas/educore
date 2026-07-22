"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authFetch } from "@/lib/auth";
import { evaluatePassword } from "@/lib/password-policy";

export default function ChangePasswordPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const policy = useMemo(() => evaluatePassword(newPassword), [newPassword]);

  const requirements: Array<[boolean, string]> = [
    [policy.longEnough, "12 caracteres o más"],
    [policy.withinByteLimit, "Máximo 72 bytes"],
    [policy.hasUppercase, "Una mayúscula"],
    [policy.hasLowercase, "Una minúscula"],
    [policy.hasNumber, "Un número"],
    [policy.hasSymbol, "Un símbolo"],
  ];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!policy.valid) {
      setError("La nueva contraseña no cumple todos los requisitos.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("La nueva contraseña debe ser diferente de la contraseña temporal.");
      return;
    }

    setSaving(true);
    try {
      const result = await authFetch("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!result?.success) {
        setError(result?.error || result?.message || "No se pudo cambiar la contraseña.");
        return;
      }
      // The backend increments auth_version, so every previous access/refresh
      // token is invalid. Finish by clearing the cookie and signing in again.
      await logout();
    } catch {
      setError("La sesión expiró o el servidor no está disponible. Inicia sesión nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">Verificando sesión...</main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
        </div>
        <h1 className="mb-1 text-2xl font-bold text-white">Cambia tu contraseña temporal</h1>
        <p className="mb-6 text-sm text-slate-400">Por seguridad, debes completar este cambio antes de usar cualquier módulo.</p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5 text-xs font-medium text-slate-400">
            Contraseña temporal
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-10 text-sm text-white focus:border-blue-500 focus:outline-none" />
              <button type="button" onClick={() => setShowPasswords((value) => !value)} aria-label={showPasswords ? "Ocultar contraseñas" : "Mostrar contraseñas"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block space-y-1.5 text-xs font-medium text-slate-400">
            Nueva contraseña
            <input type={showPasswords ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none" />
          </label>

          <label className="block space-y-1.5 text-xs font-medium text-slate-400">
            Confirmar nueva contraseña
            <input type={showPasswords ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none" />
          </label>

          <ul className="grid grid-cols-2 gap-1 text-xs" aria-label="Requisitos de contraseña">
            {requirements.map(([met, label]) => (
              <li key={label} className={met ? "text-emerald-400" : "text-slate-500"}>{met ? "✓" : "○"} {label}</li>
            ))}
          </ul>

          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

          <button type="submit" disabled={saving || !currentPassword || !policy.valid || newPassword !== confirmation} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar y volver a iniciar sesión"}
          </button>
        </form>

        <button type="button" onClick={() => void logout()} className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-slate-500 transition hover:text-slate-300">
          <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
        </button>
      </section>
    </main>
  );
}
