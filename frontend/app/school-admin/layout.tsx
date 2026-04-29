"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  BookOpen,
  ClipboardCheck,
  NotebookPen,
  FileText,
  MessageCircle,
  Settings,
  Menu,
  X
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/components/providers/AuthProvider";
import { RoleGuard } from "@/components/providers/RoleGuard";
import { ModuleKey } from "@/lib/modules/registry";
import { useEnabledModules } from "@/lib/modules/use-enabled-modules";

const navItems: Array<{ href: string; label: string; icon: any; moduleKey?: ModuleKey }> = [
  { href: "/school-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/school-admin/academic", label: "Estructura", icon: BookOpen, moduleKey: "academic_core" },
  { href: "/school-admin/students", label: "Estudiantes", icon: GraduationCap, moduleKey: "students" },
  { href: "/school-admin/teachers", label: "Profesores", icon: Users, moduleKey: "users" },
  { href: "/school-admin/groups", label: "Grupos", icon: Users, moduleKey: "groups" },
  { href: "/school-admin/schedule", label: "Horarios", icon: Calendar, moduleKey: "schedules" },
  { href: "/school-admin/attendance", label: "Asistencias", icon: ClipboardCheck, moduleKey: "attendance" },
  { href: "/school-admin/grades", label: "Calificaciones", icon: NotebookPen, moduleKey: "grades" },
  { href: "/school-admin/reports", label: "Reportes", icon: FileText, moduleKey: "reports" },
  { href: "/school-admin/communications", label: "Comunicaciones", icon: MessageCircle, moduleKey: "communications" },
  { href: "/school-admin/settings", label: "Configuracion", icon: Settings },
];

export default function SchoolAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const { isModuleEnabled } = useEnabledModules();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "SA";
  const userRole = user?.role === "SCHOOL_ADMIN" ? "Administrador Escuela" : user?.role || "";

  return (
    <RoleGuard allowedRoles={["SCHOOL_ADMIN"]}>
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl border-r border-border
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-none lg:shrink-0
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-sidebar">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mr-3">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="text-lg font-bold tracking-tight">EduCore</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey)).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-6 py-3 transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-primary"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground border-l-4 border-transparent"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex flex-col flex-1 min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-5 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-muted lg:hidden mr-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Panel Escuela</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            <ProfileDropdown userInitials={userInitials} userRole={userRole} />
          </div>
        </header>
        <div className="p-3 sm:p-4 lg:p-5 flex-1 overflow-auto">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
    </RoleGuard>
  );
}
