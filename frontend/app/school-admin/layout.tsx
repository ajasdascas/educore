"use client";

import { ReactNode, useEffect, useState } from "react";
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
  FileCheck2,
  FolderOpen,
  MessageCircle,
  Database,
  CreditCard,
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
  { href: "/school-admin/students", label: "Estudiantes", icon: GraduationCap, moduleKey: "users" },
  { href: "/school-admin/teachers", label: "Profesores", icon: Users, moduleKey: "users" },
  { href: "/school-admin/groups", label: "Grupos", icon: Users, moduleKey: "academic_core" },
  { href: "/school-admin/schedule", label: "Horarios", icon: Calendar, moduleKey: "schedules" },
  { href: "/school-admin/attendance", label: "Asistencias", icon: ClipboardCheck, moduleKey: "attendance" },
  { href: "/school-admin/grades", label: "Calificaciones", icon: NotebookPen, moduleKey: "grading" },
  { href: "/school-admin/report-cards", label: "Boletas", icon: FileCheck2, moduleKey: "report_cards" },
  { href: "/school-admin/documents", label: "Documentos", icon: FolderOpen, moduleKey: "documents" },
  { href: "/school-admin/payments", label: "Pagos", icon: CreditCard, moduleKey: "payments" },
  { href: "/school-admin/reports", label: "Reportes", icon: FileText, moduleKey: "reports" },
  { href: "/school-admin/communications", label: "Comunicaciones", icon: MessageCircle, moduleKey: "communications" },
  { href: "/school-admin/database", label: "Base de datos", icon: Database },
  { href: "/school-admin/settings", label: "Configuracion", icon: Settings },
];

export default function SchoolAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolBrand, setSchoolBrand] = useState<{ name: string; logo_url?: string } | null>(null);
  const { user, logout, loading } = useAuth();
  const { isModuleEnabled } = useEnabledModules();

  useEffect(() => {
    try {
      const schools = JSON.parse(localStorage.getItem("mock_schools") || "[]");
      const currentSchoolID = localStorage.getItem("mock_current_school_id");
      const selected = schools.find((school: any) => school.id === currentSchoolID) || schools[0];
      if (selected) {
        setSchoolBrand({ name: selected.name, logo_url: selected.logo_url });
      }
    } catch {
      setSchoolBrand(null);
    }
  }, []);

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
    <div className="min-h-screen overflow-x-hidden bg-background flex flex-col lg:flex-row">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 max-w-[16rem] overflow-x-hidden bg-sidebar text-sidebar-foreground flex flex-col shadow-xl border-r border-border
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-none lg:shrink-0
      `}>
        <div className="h-16 max-w-full overflow-hidden flex items-center justify-between gap-2 px-3 border-b border-border bg-sidebar">
          <div className="flex min-w-0 max-w-full flex-1 items-center overflow-hidden" title={schoolBrand?.name || "EduCore"}>
            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center mr-3 overflow-hidden border border-border">
              {schoolBrand?.logo_url ? (
                <img src={schoolBrand.logo_url} alt="Logo de la escuela" className="h-full w-full object-contain bg-white" />
              ) : (
                <span className="text-primary font-bold text-sm">E</span>
              )}
            </div>
            <span className="block min-w-0 max-w-[10.75rem] truncate whitespace-nowrap text-sm font-bold tracking-tight sm:max-w-[11.25rem] sm:text-base">
              {schoolBrand?.name || "EduCore"}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="min-w-0 flex-1 overflow-x-hidden py-4 space-y-1">
          {navItems.filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey)).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex min-w-0 items-center px-5 py-3 transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-primary"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground border-l-4 border-transparent"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3 shrink-0" />
                <span className="min-w-0 truncate font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="min-h-16 overflow-visible bg-card border-b border-border flex items-center justify-between gap-2 px-3 py-2 sm:px-4 lg:px-5 shadow-sm sticky top-0 z-40 transition-colors">
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 shrink-0 rounded-md hover:bg-muted lg:hidden mr-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 max-w-full overflow-hidden" title={schoolBrand?.name || "Panel Escuela"}>
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">Panel Escuela</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <ProfileDropdown userInitials={userInitials} userRole={userRole} />
          </div>
        </header>
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-5">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
    </RoleGuard>
  );
}
