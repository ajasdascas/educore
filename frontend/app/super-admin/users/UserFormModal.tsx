"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

import type { GlobalUser, StudentOption, TenantOption, UserOptions, UserRole } from "./types";

interface UserFormModalProps {
  user: GlobalUser | null;
  tenants: TenantOption[];
  onClose: () => void;
  onSaved: (user: GlobalUser) => void;
}

const SCHOOL_ROLES: UserRole[] = ["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"];

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "Director / Administrador",
  TEACHER: "Profesor",
  PARENT: "Padre / Tutor",
  STUDENT: "Estudiante",
};

export function UserFormModal({ user, tenants, onClose, onSaved }: UserFormModalProps) {
  const isEditing = Boolean(user);
  const [tenantID, setTenantID] = useState(user?.tenant_id || "");
  const [role, setRole] = useState<UserRole>(user?.role || "SUPER_ADMIN");
  const [email, setEmail] = useState(user?.email || "");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [studentID, setStudentID] = useState(user?.linked_student_id || "");
  const [relationship, setRelationship] = useState("guardian");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentLinksAvailable, setStudentLinksAvailable] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const availableRoles = tenantID ? SCHOOL_ROLES : (["SUPER_ADMIN"] as UserRole[]);
  const requiresStudent = role === "STUDENT" || role === "PARENT";
  const studentIsRequired = requiresStudent && (!isEditing || user?.role !== role || !user?.linked_student_id);

  useEffect(() => {
    if (!tenantID || !requiresStudent) {
      setStudents([]);
      setStudentLinksAvailable(true);
      if (!requiresStudent) setStudentID("");
      return;
    }
    let active = true;
    setLoadingOptions(true);
    authFetch(`/api/v1/super-admin/global-users/options?tenant_id=${encodeURIComponent(tenantID)}`)
      .then((result: { success?: boolean; data?: UserOptions; error?: string }) => {
        if (!active) return;
        if (!result.success) throw new Error(result.error || "No se pudieron cargar los estudiantes");
        setStudents(result.data?.students || []);
        setStudentLinksAvailable(result.data?.student_links_available !== false);
      })
      .catch((error: Error) => {
        if (!active) return;
        setStudents([]);
        setStudentLinksAvailable(false);
        toast({ variant: "destructive", title: "Vinculación no disponible", description: error.message });
      })
      .finally(() => active && setLoadingOptions(false));
    return () => {
      active = false;
    };
  }, [tenantID, requiresStudent, toast]);

  const selectableStudents = useMemo(() => {
    if (role !== "STUDENT") return students;
    return students.filter((student) => !student.user_id || student.user_id === user?.id);
  }, [role, students, user?.id]);

  const selectTenant = (value: string) => {
    const nextTenantID = value === "global" ? "" : value;
    setTenantID(nextTenantID);
    setRole(nextTenantID ? "SCHOOL_ADMIN" : "SUPER_ADMIN");
    setStudentID("");
  };

  const validate = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Escribe un correo válido.";
    if (firstName.trim().length < 2 || lastName.trim().length < 2) return "Nombre y apellido deben tener al menos 2 caracteres.";
    if (role === "SUPER_ADMIN" && tenantID) return "Un Super Admin no puede pertenecer a una escuela.";
    if (role !== "SUPER_ADMIN" && !tenantID) return "Selecciona la escuela del usuario.";
    if (!isEditing && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password)) {
      return "La contraseña debe tener al menos 12 caracteres, mayúscula, minúscula, número y símbolo.";
    }
    if (studentIsRequired && !studentID) return "Selecciona el estudiante que quedará vinculado a esta cuenta.";
    return "";
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) {
      toast({ variant: "destructive", title: "Revisa el formulario", description: validationError });
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        tenant_id: tenantID,
        email: email.trim().toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        is_active: isActive,
        student_id: studentID,
        relationship,
        ...(!isEditing ? { password } : {}),
      };
      const result = await authFetch(
        isEditing ? `/api/v1/super-admin/global-users/${user?.id}` : "/api/v1/super-admin/global-users",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      if (!result.success || !result.data) throw new Error(result.error || "No se pudo guardar el usuario");
      onSaved(result.data as GlobalUser);
      toast({ title: isEditing ? "Usuario actualizado" : "Usuario creado", description: "Los cambios quedaron registrados en auditoría." });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar usuario" : "Crear usuario"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Alcance</Label>
            <Select value={tenantID || "global"} onValueChange={selectTenant} disabled={isLoading || isEditing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Plataforma EduCore (solo Super Admin)</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.slug}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditing && <p className="text-xs text-muted-foreground">El alcance no se mueve entre escuelas para evitar mezclar relaciones y datos. Crea otra cuenta si necesitas cambiarlo.</p>}
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(value) => { setRole(value as UserRole); setStudentID(user?.role === value ? user?.linked_student_id || "" : ""); }} disabled={isLoading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableRoles.map((item) => <SelectItem key={item} value={item}>{ROLE_LABELS[item]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input id="first_name" value={firstName} onChange={(event) => setFirstName(event.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input id="last_name" value={lastName} onChange={(event) => setLastName(event.target.value)} disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña temporal</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="pr-11" disabled={isLoading} autoComplete="new-password" maxLength={72} />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo. El usuario deberá cambiarla.</p>
            </div>
          )}

          {requiresStudent && (
            <div className="space-y-2 rounded-lg border p-4">
              <Label>Estudiante vinculado {studentIsRequired ? "*" : ""}</Label>
              <Select value={studentID || "none"} onValueChange={(value) => setStudentID(value === "none" ? "" : value)} disabled={isLoading || loadingOptions || !studentLinksAvailable}>
                <SelectTrigger><SelectValue placeholder={loadingOptions ? "Cargando..." : "Selecciona un estudiante"} /></SelectTrigger>
                <SelectContent>
                  {!studentIsRequired && <SelectItem value="none">Conservar vinculaciones actuales</SelectItem>}
                  {selectableStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.last_name}, {student.first_name}{student.enrollment_number ? ` · ${student.enrollment_number}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">La vinculación se valida contra la misma escuela; una cuenta de estudiante no puede enlazarse a otra escuela.</p>
              {role === "PARENT" && (
                <Select value={relationship} onValueChange={setRelationship} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Parentesco" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">Madre</SelectItem>
                    <SelectItem value="father">Padre</SelectItem>
                    <SelectItem value="guardian">Tutor</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="active">Usuario activo</Label>
              <p className="text-sm text-muted-foreground">Al desactivarlo, sus solicitudes autenticadas serán rechazadas.</p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} disabled={isLoading} />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button type="button" onClick={save} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
