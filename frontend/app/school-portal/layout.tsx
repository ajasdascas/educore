"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen, Users, GraduationCap, UserCheck, LayoutDashboard,
  LogOut, Menu, X, ChevronRight, Building2,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authFetch, getDashboardPath } from "@/lib/auth";

interface SchoolInfo {
  name: string;
  slug: string;
  logo_url?: string;
}

const NAV_MODULES = [
  {
    key: "school-admin",
    label: "Administración",
    icon: LayoutDashboard,
    href: "/school-portal/school-admin",
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  },
  {
    key: "teachers",
    label: "Profesores",
    icon: GraduationCap,
    href: "/school-portal/teachers",
    roles: ["SUPER_ADMIN", "TEACHER"],
  },
  {
    key: "parents",
    label: "Padres",
    icon: Users,
    href: "/school-portal/parents",
    roles: ["SUPER_ADMIN", "PARENT"],
  },
  {
    key: "students",
    label: "Alumnos",
    icon: UserCheck,
    href: "/school-portal/students",
    roles: ["SUPER_ADMIN", "STUDENT"],
  },
];

function PortalLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const slug = searchParams.get("slug") || "";

  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    authFetch(`/api/v1/public/school-info?slug=${encodeURIComponent(slug)}`)
      .then((d) => {
        if (d?.success && d?.data?.name) setSchool(d.data as SchoolInfo);
      })
      .catch(() => {});
  }, [slug]);

  // Redirect unauthenticated
  useEffect(() => {
    if (user === null) {
      router.replace(slug ? `/login?slug=${encodeURIComponent(slug)}` : "/login");
    }
  }, [slug, user, router]);

  const activeKey = pathname.split("/")[2] ?? "";
  const visibleNav = NAV_MODULES.filter(
    (m) => !user || m.roles.includes(user.role)
  );

  const passSlug = (href: string) => (slug ? `${href}?slug=${slug}` : href);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/95 backdrop-blur border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {/* School brand */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {school?.logo_url ? (
              <Image
                src={school.logo_url}
                alt="Logo"
                width={40}
                height={40}
                unoptimized
                className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-700 p-0.5"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate leading-tight">
                {school?.name ?? "Portal Escolar"}
              </p>
              {slug && (
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  {slug}.onlineu.mx
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = activeKey === item.key;
            return (
              <Link
                key={item.key}
                href={passSlug(item.href)}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link
            href={user?.role === "SUPER_ADMIN" ? "/super-admin/schools" : getDashboardPath(user?.role || "")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            {user?.role === "SUPER_ADMIN" ? "Volver a Escuelas" : "Ir a mi panel"}
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/60 backdrop-blur-md lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Menú"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">EduCore</span>
              <span className="text-slate-700 mx-1">/</span>
              <span className="text-sm text-slate-400 truncate max-w-[140px]">
                {school?.name ?? "Portal Escolar"}
              </span>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs text-slate-500">{user.email}</span>
              <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-full font-semibold">
                {user.role.replace("_", " ")}
              </span>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function SchoolPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PortalLayoutInner>{children}</PortalLayoutInner>
    </Suspense>
  );
}
