"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Users, Settings, LogOut, LayoutDashboard } from "lucide-react";

const navItems = [
  { href: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/schools", label: "Escuelas", icon: Building },
  { href: "/super-admin/users", label: "Usuarios Globales", icon: Users },
  { href: "/super-admin/settings", label: "Configuración", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10 fixed inset-y-0 left-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">EduCore</span>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-6 py-3 transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white border-l-4 border-blue-500"
                    : "hover:bg-slate-800 hover:text-white border-l-4 border-transparent"
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-blue-400" : ""}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col ml-64">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-slate-800">Manager Maestro</h1>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-slate-500">Super Admin</span>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm shadow">
              SA
            </div>
          </div>
        </header>
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
