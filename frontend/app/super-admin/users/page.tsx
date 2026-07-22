"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock,
  Edit,
  FilterX,
  KeyRound,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

import { RolePermissionsModal } from "./RolePermissionsModal";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { UserFormModal } from "./UserFormModal";
import type { GlobalUser, TenantOption, UserOptions, UserRole } from "./types";
import { roleLabels } from "./types";

interface UsersResponse {
  success: boolean;
  error?: string;
  data?: {
    users: GlobalUser[];
    summary: { total: number; active: number; inactive: number };
  };
  meta?: { total: number; page: number; per_page: number };
}

const ROLE_ORDER: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"];

export default function UsersPage() {
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1, perPage: 20 });
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 });
  const [editingUser, setEditingUser] = useState<GlobalUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<GlobalUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<GlobalUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    authFetch("/api/v1/super-admin/global-users/options")
      .then((result: { success?: boolean; data?: UserOptions; error?: string }) => {
        if (!result.success) throw new Error(result.error || "No se pudieron cargar las escuelas");
        if (active) setTenants(result.data?.tenants || []);
      })
      .catch((error: Error) => {
        if (active) toast({ variant: "destructive", title: "No se pudieron cargar los filtros", description: error.message });
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (tenantFilter !== "all") params.set("tenant_id", tenantFilter);
      const result = await authFetch(`/api/v1/super-admin/global-users?${params.toString()}`) as UsersResponse;
      if (!result.success || !result.data) throw new Error(result.error || "No se pudieron cargar los usuarios");
      const total = result.meta?.total ?? result.data.summary.total;
      const perPage = result.meta?.per_page || 20;
      setUsers(result.data.users || []);
      setSummary(result.data.summary || { total, active: 0, inactive: 0 });
      setMeta({ total, perPage, pages: Math.max(1, Math.ceil(total / perPage)) });
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudieron cargar los usuarios", description: error instanceof Error ? error.message : "Error desconocido" });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, searchTerm, statusFilter, tenantFilter, toast]);

  useEffect(() => {
    const timer = window.setTimeout(fetchUsers, searchTerm ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchUsers, searchTerm]);

  const setFilter = (setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
    setTenantFilter("all");
    setPage(1);
  };

  const filtersActive = Boolean(searchTerm || statusFilter !== "all" || roleFilter !== "all" || tenantFilter !== "all");

  const schoolName = useCallback((user: GlobalUser) => user.tenant_id ? user.tenant_name : "Plataforma EduCore", []);

  const formatDate = (value?: string | null) => {
    if (!value) return "Nunca";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return date.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const toggleStatus = async (user: GlobalUser) => {
    setActionLoading(user.id);
    try {
      const result = await authFetch(`/api/v1/super-admin/global-users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!result.success || !result.data) throw new Error(result.error || "No se pudo cambiar el estado");
      setUsers((current) => current.map((item) => item.id === user.id ? result.data as GlobalUser : item));
      setSummary((current) => ({
        ...current,
        active: current.active + (user.is_active ? -1 : 1),
        inactive: current.inactive + (user.is_active ? 1 : -1),
      }));
      toast({ title: user.is_active ? "Usuario desactivado" : "Usuario activado", description: "El cambio aplica inmediatamente a las rutas protegidas." });
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudo cambiar el estado", description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setActionLoading(null);
    }
  };

  const saveUser = (saved: GlobalUser) => {
    const exists = users.some((user) => user.id === saved.id);
    setUsers((current) => exists ? current.map((user) => user.id === saved.id ? saved : user) : [saved, ...current].slice(0, meta.perPage));
    void fetchUsers();
  };

  const visibleRange = useMemo(() => {
    if (!meta.total) return "0";
    const start = (page - 1) * meta.perPage + 1;
    return `${start}-${Math.min(meta.total, start + users.length - 1)}`;
  }, [meta.perPage, meta.total, page, users.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground"><Users className="h-8 w-8 text-blue-600" />Usuarios Globales</h1>
          <p className="mt-2 text-muted-foreground">Administra Super Admins y usuarios de todas las escuelas sin mezclar sus alcances.</p>
        </div>
        <Button onClick={() => { setEditingUser(null); setShowUserModal(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />Nuevo usuario
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total usuarios" value={summary.total} icon={<Shield className="h-6 w-6 text-emerald-600" />} tone="bg-emerald-100 dark:bg-emerald-900/20" />
        <StatCard label="Activos" value={summary.active} icon={<ToggleRight className="h-6 w-6 text-blue-600" />} tone="bg-blue-100 dark:bg-blue-900/20" />
        <StatCard label="Inactivos" value={summary.inactive} icon={<ToggleLeft className="h-6 w-6 text-red-600" />} tone="bg-red-100 dark:bg-red-900/20" />
      </div>

      <Card>
        <CardHeader><CardTitle>Usuarios del sistema</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_190px_170px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, correo o escuela..." value={searchTerm} onChange={(event) => { setPage(1); setSearchTerm(event.target.value); }} className="pl-10" />
            </div>
            <Select value={tenantFilter} onValueChange={(value) => setFilter(setTenantFilter, value)}>
              <SelectTrigger><SelectValue placeholder="Escuela" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las escuelas</SelectItem>
                <SelectItem value="global">Plataforma EduCore</SelectItem>
                {tenants.map((tenant) => <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(value) => setFilter(setRoleFilter, value)}>
              <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {ROLE_ORDER.map((role) => <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setFilter(setStatusFilter, value)}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="inactive">Inactivos</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters} disabled={!filtersActive}><FilterX className="mr-2 h-4 w-4" />Limpiar</Button>
          </div>

          {loading ? <LoadingSkeleton /> : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Escuela</TableHead><TableHead>Rol y permisos</TableHead><TableHead>Estado</TableHead><TableHead>Último acceso</TableHead><TableHead className="w-[70px]">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-28 text-center"><Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No se encontraron usuarios con estos filtros.</p></TableCell></TableRow>
                  ) : users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white">{(user.first_name || "U").charAt(0)}{(user.last_name || "").charAt(0)}</div>
                          <div className="min-w-0"><p className="font-medium">{user.first_name} {user.last_name}</p><p className="max-w-[260px] truncate text-sm text-muted-foreground">{user.email}</p></div>
                        </div>
                      </TableCell>
                      <TableCell><div className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><p className="text-sm font-medium">{schoolName(user)}</p>{user.tenant_slug && <p className="text-xs text-muted-foreground">{user.tenant_slug}</p>}</div></div></TableCell>
                      <TableCell><Badge variant="outline">{user.role_name || roleLabels[user.role]}</Badge><p className="mt-1 text-xs text-muted-foreground">{user.role === "SUPER_ADMIN" ? "Permiso global fijo" : `${user.effective_permissions.length} permisos del rol`}</p></TableCell>
                      <TableCell><Badge variant={user.is_active ? "default" : "secondary"} className={user.is_active ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100" : ""}>{user.is_active ? "Activo" : "Inactivo"}</Badge></TableCell>
                      <TableCell><div className="flex items-center whitespace-nowrap text-sm text-muted-foreground"><Clock className="mr-1 h-4 w-4" />{formatDate(user.last_login_at)}</div></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0" disabled={actionLoading === user.id} aria-label={`Acciones para ${user.email}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => { setEditingUser(user); setShowUserModal(true); }}><Edit className="mr-2 h-4 w-4" />Editar usuario</DropdownMenuItem>
                            {user.role !== "SUPER_ADMIN" && <DropdownMenuItem onSelect={() => setPermissionsUser(user)}><ShieldCheck className="mr-2 h-4 w-4" />Permisos del rol</DropdownMenuItem>}
                            <DropdownMenuItem onSelect={() => setResetPasswordUser(user)}><KeyRound className="mr-2 h-4 w-4" />Restablecer contraseña temporal</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void toggleStatus(user)}>{user.is_active ? <ToggleLeft className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}{user.is_active ? "Desactivar" : "Activar"}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">Mostrando {visibleRange} de {meta.total} usuarios</p>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(meta.pages, value + 1))} disabled={page >= meta.pages || loading}>Siguiente</Button></div>
          </div>
        </CardContent>
      </Card>

      {showUserModal && <UserFormModal user={editingUser} tenants={tenants} onClose={() => { setShowUserModal(false); setEditingUser(null); }} onSaved={saveUser} />}
      {permissionsUser && <RolePermissionsModal user={permissionsUser} onClose={() => setPermissionsUser(null)} onSaved={() => void fetchUsers()} />}
      {resetPasswordUser && <ResetPasswordModal user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} />}
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return <Card><CardContent className="flex items-center p-6"><div className={`rounded-lg p-2 ${tone}`}>{icon}</div><div className="ml-4"><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>;
}

function LoadingSkeleton() {
  return <div className="space-y-4">{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-[220px]" /><Skeleton className="h-4 w-[150px]" /></div><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-8" /></div>)}</div>;
}
