"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Settings, Shield, User } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import type { User as AuthUser } from "@/lib/auth";

interface ProfileDropdownProps {
  userInitials: string;
  userRole: string;
}

const accountBasePathByRole: Record<AuthUser["role"], string> = {
  SUPER_ADMIN: "/super-admin",
  SCHOOL_ADMIN: "/school-admin",
  TEACHER: "/teacher",
  PARENT: "/parent",
};

export function ProfileDropdown({ userInitials, userRole }: ProfileDropdownProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 256 });

  const closeMenu = () => setIsOpen(false);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 16;
    const menuWidth = Math.min(256, Math.max(220, window.innerWidth - viewportPadding * 2));
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
    );

    setPosition({
      top: Math.min(rect.bottom + 8, Math.max(viewportPadding, window.innerHeight - viewportPadding)),
      left,
      width: menuWidth,
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const navigateToAccountPage = (page: "profile" | "settings" | "notifications" | "security") => {
    if (!user) return;
    closeMenu();
    router.push(`${accountBasePathByRole[user.role] || "/"}/${page}`);
  };

  const handleLogout = () => {
    closeMenu();
    void logout();
  };

  const menuItems = [
    { icon: User, label: "Mi Perfil", onClick: () => navigateToAccountPage("profile") },
    { icon: Settings, label: "Configuracion", onClick: () => navigateToAccountPage("settings") },
    { icon: Bell, label: "Notificaciones", onClick: () => navigateToAccountPage("notifications") },
    { icon: Shield, label: "Seguridad", onClick: () => navigateToAccountPage("security") },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Abrir menu de perfil"
        aria-expanded={isOpen}
        aria-controls={menuId}
        data-testid="profile-menu-trigger"
        onClick={() => setIsOpen((current) => !current)}
        className="flex max-w-[11rem] shrink-0 items-center gap-2 rounded-lg p-1 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[14rem]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow sm:h-9 sm:w-9">
          {userInitials}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-[7.5rem] truncate text-sm font-medium text-foreground lg:max-w-[9rem]">
            {user?.email?.split("@")[0] || "Usuario"}
          </p>
          <p className="max-w-[7.5rem] truncate text-xs text-muted-foreground lg:max-w-[9rem]">{userRole}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {mounted && isOpen
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Menu de perfil"
              data-testid="profile-menu"
              className="fixed max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
              style={{ top: position.top, left: position.left, width: position.width, zIndex: 9999 }}
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-popover-foreground">{user?.email || "Usuario"}</p>
                <p className="truncate text-xs text-muted-foreground">{userRole}</p>
              </div>

              <div className="-mx-1 my-1 h-px bg-border" />

              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={item.onClick}
                  className="flex w-full min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}

              <div className="-mx-1 my-1 h-px bg-border" />

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="truncate">Cerrar Sesion</span>
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
