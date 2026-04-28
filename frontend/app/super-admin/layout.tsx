"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Users, Settings, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";
import { Toaster } from "@/components/ui/toaster";

const navItems = [
  { href: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/schools", label: "Escuelas", icon: Building },
  { href: "/super-admin/users", label: "Usuarios Globales", icon: Users },
  { href: "/super-admin/settings", label: "Configuración", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl border-r border-border
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-sidebar">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mr-3">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="text-lg font-bold tracking-tight">EduCore</span>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1">
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
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-primary" : ""}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Link
            href="/"
            className="flex items-center w-full px-4 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-col lg:ml-64">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm sticky top-0 z-10 transition-colors">
          {/* Left side - Mobile menu button and title */}
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-muted lg:hidden mr-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Manager Maestro</h1>
          </div>

          {/* Right side - User info */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground hidden sm:block">Super Admin</span>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow">
              SA
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-5 lg:p-6 flex-1 overflow-auto">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
