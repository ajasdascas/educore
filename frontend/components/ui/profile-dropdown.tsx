"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateToAccountPage = (page: "profile" | "settings" | "notifications" | "security") => {
    if (!user) return;
    router.push(`${accountBasePathByRole[user.role]}/${page}`);
    setIsOpen(false);
  };

  const menuItems = [
    { icon: User, label: "Mi Perfil", onClick: () => navigateToAccountPage("profile") },
    { icon: Settings, label: "Configuracion", onClick: () => navigateToAccountPage("settings") },
    { icon: Bell, label: "Notificaciones", onClick: () => navigateToAccountPage("notifications") },
    { icon: Shield, label: "Seguridad", onClick: () => navigateToAccountPage("security") },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow">
          {userInitials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
            {user?.email?.split("@")[0] || "Usuario"}
          </p>
          <p className="text-xs text-muted-foreground">{userRole}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-popover-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>

          <div className="py-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted/50 transition-colors"
              >
                <item.icon className="w-4 h-4 mr-3 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="border-t border-border my-1" />

          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Cerrar Sesion
          </button>
        </div>
      )}
    </div>
  );
}
