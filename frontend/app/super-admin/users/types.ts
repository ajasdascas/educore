export type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT";

export interface GlobalUser {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_name: string;
  is_active: boolean;
  effective_permissions: string[];
  linked_student_id: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface PermissionOption {
  key: string;
  label: string;
  description: string;
}

export interface RoleOption {
  key: UserRole;
  tenant_role_key: string;
  name: string;
  description: string;
  scope: "global" | "tenant";
  permissions: string[];
  allowed_permissions: PermissionOption[];
}

export interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  user_id: string;
}

export interface UserOptions {
  tenants: TenantOption[];
  roles: RoleOption[];
  students: StudentOption[];
  student_links_available: boolean;
}

export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "Director / Administrador",
  TEACHER: "Profesor",
  PARENT: "Padre / Tutor",
  STUDENT: "Estudiante",
};
