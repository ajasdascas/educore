"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  CreditCard,
  Settings,
  Menu,
  X,
  Building2,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { RoleGuard } from "@/components/providers/RoleGuard";
import { ModuleKey } from "@/lib/modules/registry";
import { useEnabledModules } from "@/lib/modules/use-enabled-modules";
import { SupportModeBanner } from "@/components/SupportModeBanner";
import { authFetch, getSupportContext, isSupportMode, setSupportContext } from "@/lib/auth";

const navItems: Array<{ href: string; label: string; icon: LucideIcon; moduleKey?: ModuleKey }> = [
  // Core — siempre visible
  { href: "/school-admin/dashboard",    label: "Dashboard",       icon: LayoutDashboard },
  { href: "/school-admin/academic",     label: "Estructura",      icon: BookOpen,       moduleKey: "academic_core" },
  { href: "/school-admin/students",     label: "Estudiantes",     icon: GraduationCap,  moduleKey: "users" },
  { href: "/school-admin/teachers",     label: "Profesores",      icon: Users,          moduleKey: "users" },
  { href: "/school-admin/groups",       label: "Grupos",          icon: Users,          moduleKey: "academic_core" },
  { href: "/school-admin/schedule",     label: "Horarios",        icon: Calendar,       moduleKey: "schedules" },
  { href: "/school-admin/attendance",   label: "Asistencias",     icon: ClipboardCheck, moduleKey: "attendance" },

  // Módulos primaria / secundaria
  { href: "/school-admin/grades",       label: "Calificaciones",  icon: NotebookPen,    moduleKey: "grading" },
  { href: "/school-admin/report-cards", label: "Boletas",         icon: FileCheck2,     moduleKey: "report_cards" },

  // Admin general
  { href: "/school-admin/documents",    label: "Documentos",      icon: FolderOpen,     moduleKey: "documents" },
  { href: "/school-admin/payments",     label: "Pagos",           icon: CreditCard,     moduleKey: "payments" },
  { href: "/school-admin/reports",      label: "Reportes",        icon: FileText,       moduleKey: "reports" },
  { href: "/school-admin/communications", label: "Comunicaciones",icon: MessageCircle,  moduleKey: "communications" },
  { href: "/school-admin/settings",     label: "Configuracion",   icon: Settings },
];

export default function SchoolAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolBrand, setSchoolBrand] = useState<{ name: string; logo_url?: string } | null>(null);
  const [supportReady, setSupportReady] = useState(false);
  const { user, loading } = useAuth();
  const { error: moduleError, isModuleEnabled } = useEnabledModules();

  useEffect(() => {
    // Hydrate support context from URL query params (resistant to direct links and reloads)
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const qTenantId = searchParams.get("supportTenantId");
    const qSlug = searchParams.get("supportSlug");
    const qName = searchParams.get("supportName");

    if (qTenantId && user?.role === "SUPER_ADMIN") {
      setSupportContext(qTenantId, qSlug || "", qName || "");
      // Remove query params from URL without reloading
      router.replace(pathname);
    }

    setSupportReady(true);
  }, [user, pathname, router]);

  useEffect(() => {
    let cancelled = false;
    const supportContext = getSupportContext();
    if (supportContext?.schoolName) {
      setSchoolBrand({ name: supportContext.schoolName });
    }
    authFetch("/api/v1/school-admin/settings")
      .then((response) => {
        const school = response?.data?.school;
        if (!cancelled && response?.success && school?.name) {
          setSchoolBrand({ name: school.name, logo_url: school.logo_url || "" });
        }
      })
      .catch(() => {
        if (!cancelled && !supportContext?.schoolName) setSchoolBrand(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.tenant_id]);

  if (loading || !supportReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  // Block SUPER_ADMIN without a support context — don't let them reach school-admin modules
  if (user?.role === "SUPER_ADMIN" && !isSupportMode()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Selecciona una escuela</h2>
            <p className="text-muted-foreground mt-2">
              Para acceder a los módulos de administración escolar, primero debes entrar en modo soporte
              seleccionando una escuela desde el panel de Super Admin.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.push(`/super-admin/lab?next=${encodeURIComponent(pathname)}`)}
            >
              Ir al Super Admin Lab
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/super-admin/schools")}
            >
              Ver escuelas
            </Button>
          </div>
        </div>
        <Toaster />
      </div>
    );
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "SA";
  const userRole = user?.role === "SCHOOL_ADMIN" ? "Administrador Escuela" : user?.role || "";

  return (
    <RoleGuard allowedRoles={["SCHOOL_ADMIN", "SUPER_ADMIN"]}>
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
                <Image src={schoolBrand.logo_url} alt="Logo de la escuela" width={32} height={32} unoptimized className="h-full w-full object-contain bg-white" />
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
        <SupportModeBanner />
        {moduleError && (
          <div role="alert" className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200 sm:mx-4 lg:mx-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">No se pudo verificar la configuración de módulos.</p>
              <p className="text-xs opacity-90">{moduleError} Solo se muestran accesos básicos hasta recuperar la configuración.</p>
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-5">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
    </RoleGuard>
  );
}
