"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

import { evaluateTemporaryPassword } from "./password-policy";
import type { GlobalUser } from "./types";

interface ResetPasswordModalProps {
  user: GlobalUser;
  onClose: () => void;
}

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const policy = useMemo(() => evaluateTemporaryPassword(password), [password]);
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const { toast } = useToast();

  const submit = async () => {
    if (!policy.valid || !passwordsMatch || saving) return;
    setSaving(true);
    try {
      const result = await authFetch(`/api/v1/super-admin/global-users/${user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      if (!result.success) throw new Error(result.error || "No se pudo restablecer la contraseña");
      setPassword("");
      setConfirmation("");
      toast({
        title: "Contraseña temporal actualizada",
        description: "Las sesiones anteriores fueron revocadas. El usuario deberá cambiarla al iniciar sesión.",
      });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo restablecer la contraseña",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setSaving(false);
    }
  };

  const requirements = [
    [policy.longEnough, "12 caracteres como mínimo"],
    [policy.hasUppercase, "Una mayúscula"],
    [policy.hasLowercase, "Una minúscula"],
    [policy.hasNumber, "Un número"],
    [policy.hasSymbol, "Un símbolo"],
    [policy.withinByteLimit, "Máximo 72 bytes"],
  ] as const;

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-blue-600" />Restablecer contraseña temporal</DialogTitle>
          <DialogDescription>
            Define una contraseña temporal para {user.first_name} {user.last_name} ({user.email}). Esta acción revoca inmediatamente sus sesiones anteriores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="temporary-password">Contraseña temporal</Label>
            <div className="relative">
              <Input id="temporary-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="pr-10" disabled={saving} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="temporary-password-confirmation">Confirmar contraseña temporal</Label>
            <Input id="temporary-password-confirmation" type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" disabled={saving} />
            {confirmation && !passwordsMatch && <p className="text-sm text-destructive">Las contraseñas no coinciden.</p>}
          </div>
          <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos de contraseña">
            {requirements.map(([met, label]) => <li key={label} className={met ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{met ? "✓" : "○"} {label}</li>)}
          </ul>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void submit()} disabled={!policy.valid || !passwordsMatch || saving} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Restablecer y revocar sesiones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

