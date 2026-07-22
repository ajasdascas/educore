"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Building2, Calendar, ClipboardCheck,
  Bell, Settings, Menu, X, User, BookMarked, MessageCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/components/providers/AuthProvider";
import { RoleGuard } from "@/components/providers/RoleGuard";
import { SupportModeBanner } from "@/components/SupportModeBanner";
import { isSupportMode, setSupportContext, type SupportRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/student/dashboard",     label: "Dashboard",        icon: LayoutDashboard },
  { href: "/student/profile",       label: "Mi Perfil",        icon: User },
  { href: "/student/grades",        label: "Calificaciones",   icon: BookOpen },
  { href: "/student/attendance",    label: "Asistencia",       icon: ClipboardCheck },
  { href: "/student/assignments",   label: "Tareas",           icon: BookMarked },
  { href: "/student/schedule",      label: "Horario",          icon: Calendar },
  { href: "/student/messages",      label: "Mensajes",         icon: MessageCircle },
  { href: "/student/notifications", label: "Notificaciones",   icon: Bell },
  { href: "/student/settings",      label: "Configuración",    icon: Settings },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportReady, setSupportReady] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const qTenantId = sp.get("supportTenantId");
    const qSlug     = sp.get("supportSlug");
    const qName     = sp.get("supportName");
    const qRole     = (sp.get("supportRole") as SupportRole | null) ?? "student";

    if (qTenantId && user?.role === "SUPER_ADMIN") {
      setSupportContext(qTenantId, qSlug || "", qName || "", qRole);
      router.replace(pathname);
    }
    setSupportReady(true);
  }, [user, pathname, router]);

  if (loading || !supportReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (user?.role === "SUPER_ADMIN" && !isSupportMode()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Selecciona una escuela</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Para ver el portal de alumnos en modo soporte, ve a
              Super Admin → Escuelas → Detalles → Portales → &quot;Ver como Estudiante&quot;.
            </p>
          </div>
          <Button onClick={() => router.push("/super-admin/schools")}>Ver escuelas</Button>
        </div>
        <Toaster />
      </div>
    );
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "ES";

  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background flex flex-col lg:flex-row">
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl border-r border-border
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:shadow-none lg:shrink-0
        `}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-sidebar">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mr-3">
                <span className="text-primary-foreground font-bold text-sm">E</span>
              </div>
              <span className="text-lg font-bold tracking-tight">EduCore</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
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
        <main className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
          <header className="h-16 overflow-visible bg-card border-b border-border flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-5 shadow-sm sticky top-0 z-40 transition-colors">
            <div className="flex min-w-0 flex-1 items-center overflow-hidden">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-md hover:bg-muted lg:hidden mr-2">
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="min-w-0 truncate text-lg font-semibold text-foreground">Portal de Estudiantes</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <ProfileDropdown userInitials={userInitials} userRole="Estudiante" />
            </div>
          </header>
          <SupportModeBanner />
          <div className="min-w-0 max-w-full p-3 sm:p-4 lg:p-5 flex-1 overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </main>
        <Toaster />
      </div>
    </RoleGuard>
  );
}
