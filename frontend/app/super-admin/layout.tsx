"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building,
  CreditCard,
  Database,
  Flag,
  HeartPulse,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/components/providers/AuthProvider";
import { RoleGuard } from "@/components/providers/RoleGuard";

const navItems = [
  { href: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/modules", label: "Modulos", icon: Package },
  { href: "/super-admin/billing", label: "Billing", icon: CreditCard },
  { href: "/super-admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/super-admin/health", label: "Health Monitor", icon: HeartPulse },
  { href: "/super-admin/database", label: "Database Admin", icon: Database },
  { href: "/super-admin/audit", label: "Auditoria", icon: History },
  { href: "/super-admin/support", label: "Soporte", icon: LifeBuoy },
  { href: "/super-admin/storage", label: "Storage", icon: Database },
  { href: "/super-admin/feature-flags", label: "Feature Flags", icon: Flag },
  { href: "/super-admin/backups", label: "Backups", icon: RotateCcw },
  { href: "/super-admin/version", label: "Versioning", icon: ShieldCheck },
  { href: "/super-admin/plans", label: "Planes", icon: Package },
  { href: "/super-admin/schools", label: "Escuelas", icon: Building },
  { href: "/super-admin/users", label: "Usuarios Globales", icon: Users },
  { href: "/super-admin/settings", label: "Configuración", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "SA";
  const userRole = user?.role === "SUPER_ADMIN" ? "Super Admin" : user?.role || "";

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
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

        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {navItems.map((item) => {
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

        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </button>
        </div>
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
            <h1 className="text-lg font-semibold text-foreground">Manager Maestro</h1>
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
