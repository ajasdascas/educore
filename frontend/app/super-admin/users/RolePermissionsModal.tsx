"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

import type { GlobalUser, RoleOption, UserOptions } from "./types";

interface RolePermissionsModalProps {
  user: GlobalUser;
  onClose: () => void;
  onSaved: () => void;
}

export function RolePermissionsModal({ user, onClose, onSaved }: RolePermissionsModalProps) {
  const [role, setRole] = useState<RoleOption | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    authFetch(`/api/v1/super-admin/global-users/options?tenant_id=${encodeURIComponent(user.tenant_id)}`)
      .then((result: { success?: boolean; data?: UserOptions; error?: string }) => {
        if (!result.success) throw new Error(result.error || "No se pudo cargar el rol");
        const roleOption = result.data?.roles.find((item) => item.key === user.role) || null;
        if (!roleOption) throw new Error("El rol del usuario no admite permisos escolares");
        if (active) {
          setRole(roleOption);
          setSelected(roleOption.permissions || []);
        }
      })
      .catch((error: Error) => {
        if (active) toast({ variant: "destructive", title: "No se pudieron cargar los permisos", description: error.message });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [toast, user.role, user.tenant_id]);

  const toggle = (permission: string) => {
    setSelected((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  };

  const save = async () => {
    if (!role) return;
    setSaving(true);
    try {
      const result = await authFetch(`/api/v1/super-admin/global-users/roles/${role.key}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ tenant_id: user.tenant_id, permissions: selected }),
      });
      if (!result.success) throw new Error(result.error || "No se pudieron guardar los permisos");
      toast({ title: "Permisos actualizados", description: "El cambio quedó auditado y aplica a todos los usuarios con este rol en la escuela." });
      onSaved();
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudieron guardar los permisos", description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" />Permisos del rol</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">{user.role_name} · {user.tenant_name}</p>
          <p className="mt-1 text-muted-foreground">Estos permisos pertenecen al rol de esta escuela y se aplican a todos sus usuarios con rol {user.role_name}. Nunca otorgan acceso a otra escuela ni privilegios de Super Admin.</p>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : role ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {role.allowed_permissions.map((permission) => {
              const checked = selected.includes(permission.key);
              return (
                <label key={permission.key} className="flex cursor-pointer gap-3 rounded-lg border p-4 hover:bg-muted/40">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border" checked={checked} onChange={() => toggle(permission.key)} disabled={saving} />
                  <span>
                    <span className="block font-medium">{permission.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{permission.description}</span>
                    <span className="mt-2 block font-mono text-[11px] text-blue-700 dark:text-blue-300">{permission.key}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay permisos editables para este rol.</p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={loading || saving || !role} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar permisos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
