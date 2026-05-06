"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Clock,
  Shield,
  KeyRound,
  LogOut,
  UserCheck,
  Eye,
} from "lucide-react";
import { authFetch, getUser } from "@/lib/auth";
import { UserFormModal } from "./UserFormModal";
import { Skeleton } from "@/components/ui/skeleton";

interface GlobalUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UsersResponse {
  success: boolean;
  data: GlobalUser[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    pages: number;
  };
}

type ConfirmAction =
  | { type: "deactivate"; user: GlobalUser }
  | { type: "activate"; user: GlobalUser }
  | { type: "delete"; user: GlobalUser };

export default function UsersPage() {
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1, per_page: 20 });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<GlobalUser | null>(null);
  const [detailUser, setDetailUser] = useState<GlobalUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const { toast } = useToast();
  const currentUser = getUser();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "20",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await authFetch(`/api/v1/super-admin/users?${params}`);

      if (response.success) {
        setUsers(Array.isArray(response.data) ? response.data : []);
        setMeta(response.meta || { total: 0, pages: 1, per_page: 20 });
      } else {
        throw new Error(response.message || response.error || "Error loading users");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "No se pudieron cargar los usuarios",
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const isSelf = (userId: string) => currentUser?.id === userId;

  const handleToggleStatus = async (user: GlobalUser) => {
    if (isSelf(user.id)) {
      toast({ variant: "destructive", title: "Error", description: "No puedes modificar tu propia cuenta con esta acción" });
      return;
    }
    setConfirmAction(user.is_active ? { type: "deactivate", user } : { type: "activate", user });
  };

  const handleDeleteUser = (user: GlobalUser) => {
    if (isSelf(user.id)) {
      toast({ variant: "destructive", title: "Error", description: "No puedes eliminar tu propia cuenta" });
      return;
    }
    setConfirmAction({ type: "delete", user });
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { user } = confirmAction;
    setActionLoading(user.id);
    setConfirmAction(null);

    try {
      let response: any;

      if (confirmAction.type === "deactivate" || confirmAction.type === "activate") {
        response = await authFetch(`/api/v1/super-admin/users/${user.id}/toggle`, { method: "PATCH" });
        if (response.success) {
          const newActive = confirmAction.type === "activate";
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newActive } : u));
          toast({ title: "Éxito", description: `Usuario ${newActive ? "activado" : "desactivado"} correctamente` });
        } else {
          throw new Error(response.message || response.error || "Error al cambiar estado");
        }
      } else {
        response = await authFetch(`/api/v1/super-admin/users/${user.id}`, { method: "DELETE" });
        if (response.success) {
          setUsers(prev => prev.filter(u => u.id !== user.id));
          setMeta(prev => {
            const total = Math.max(0, prev.total - 1);
            return { ...prev, total, pages: Math.max(1, Math.ceil(total / prev.per_page)) };
          });
          toast({ title: "Éxito", description: "Usuario eliminado correctamente" });
        } else {
          throw new Error(response.message || response.error || "No se pudo eliminar");
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.message || "No se pudo completar la acción" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnterpriseAction = async (userId: string, action: "reset" | "logout" | "impersonate") => {
    setActionLoading(userId);
    try {
      const endpoint =
        action === "reset" ? `/api/v1/super-admin/global-users/${userId}/reset-password`
        : action === "logout" ? `/api/v1/super-admin/global-users/${userId}/force-logout`
        : "/api/v1/super-admin/impersonation/start";
      const body = action === "impersonate" ? { target_user_id: userId, reason: "Soporte SuperAdmin desde panel" } : {};
      const response = await authFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
      if (!response.success) throw new Error(response.message || response.error || "Acción no disponible");
      toast({
        title: "Acción registrada",
        description:
          action === "reset" ? `Password temporal: ${response.data?.temporary_password || "generado"}`
          : action === "logout" ? "Sesiones cerradas correctamente"
          : "Impersonation iniciado con auditoría",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo completar la acción" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserSaved = (savedUser: GlobalUser) => {
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
    } else {
      setUsers(prev => [savedUser, ...prev]);
      setMeta(prev => ({ ...prev, total: prev.total + 1 }));
    }
    setEditingUser(null);
    setShowModal(false);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const confirmMessages: Record<string, { title: string; description: string; danger: boolean }> = {
    deactivate: {
      title: "Desactivar usuario",
      description: "Este usuario no podrá iniciar sesión mientras esté inactivo.",
      danger: false,
    },
    activate: {
      title: "Reactivar usuario",
      description: "El usuario podrá volver a iniciar sesión.",
      danger: false,
    },
    delete: {
      title: "Eliminar usuario",
      description: "Esta acción ocultará el usuario del sistema, pero conservará la auditoría. No se puede deshacer.",
      danger: true,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Usuarios Globales
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra los usuarios con rol Super Admin de la plataforma
          </p>
        </div>
        <Button
          onClick={() => { setEditingUser(null); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
                <p className="text-2xl font-bold">{meta.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <ToggleRight className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{users.filter(u => u.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <ToggleLeft className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold">{users.filter(u => !u.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                              {(user.first_name || "U").charAt(0)}{(user.last_name || "S").charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{user.first_name} {user.last_name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {user.role}
                                {isSelf(user.id) && (
                                  <span className="ml-1 text-xs text-blue-500">(tú)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{user.email}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className={user.is_active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}
                          >
                            {user.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDate(user.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                              disabled={actionLoading === user.id}
                              aria-label="Abrir menú de acciones"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailUser(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { setEditingUser(user); setShowModal(true); }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {!isSelf(user.id) && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                  {user.is_active ? (
                                    <ToggleLeft className="h-4 w-4 mr-2" />
                                  ) : (
                                    <ToggleRight className="h-4 w-4 mr-2" />
                                  )}
                                  {user.is_active ? "Desactivar" : "Reactivar"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEnterpriseAction(user.id, "reset")}>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Reset password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEnterpriseAction(user.id, "logout")}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Force logout
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEnterpriseAction(user.id, "impersonate")}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Impersonar
                              </DropdownMenuItem>
                              {!isSelf(user.id) && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(user)}
                                  variant="destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar usuario
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {meta.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {meta.pages} • {meta.total} usuarios total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page >= meta.pages}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User form modal */}
      {showModal && (
        <UserFormModal
          user={editingUser}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSaved={handleUserSaved}
        />
      )}

      {/* Detail dialog */}
      {detailUser && (
        <Dialog open onOpenChange={() => setDetailUser(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Detalles del usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs break-all">{detailUser.id}</span>
                <span className="text-muted-foreground">Nombre</span>
                <span>{detailUser.first_name} {detailUser.last_name}</span>
                <span className="text-muted-foreground">Email</span>
                <span className="font-mono">{detailUser.email}</span>
                <span className="text-muted-foreground">Rol</span>
                <span>{detailUser.role}</span>
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={detailUser.is_active ? "default" : "secondary"} className={detailUser.is_active ? "w-fit bg-green-100 text-green-800" : "w-fit"}>
                  {detailUser.is_active ? "Activo" : "Inactivo"}
                </Badge>
                <span className="text-muted-foreground">Creado</span>
                <span>{formatDate(detailUser.created_at)}</span>
                <span className="text-muted-foreground">Actualizado</span>
                <span>{formatDate(detailUser.updated_at)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailUser(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm action dialog */}
      {confirmAction && (
        <Dialog open onOpenChange={() => setConfirmAction(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{confirmMessages[confirmAction.type].title}</DialogTitle>
              <DialogDescription>
                {`${confirmAction.user.first_name} ${confirmAction.user.last_name}`.trim() || confirmAction.user.email}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {confirmMessages[confirmAction.type].description}
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancelar</Button>
              <Button
                variant={confirmMessages[confirmAction.type].danger ? "destructive" : "default"}
                onClick={executeConfirmedAction}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
