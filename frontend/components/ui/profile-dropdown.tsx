"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Settings, Bell, Shield, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

interface ProfileDropdownProps {
  userInitials: string;
  userRole: string;
}

export function ProfileDropdown({ userInitials, userRole }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    {
      icon: User,
      label: "Mi Perfil",
      onClick: () => {
        router.push("/super-admin/profile");
        setIsOpen(false);
      }
    },
    {
      icon: Settings,
      label: "Configuración",
      onClick: () => {
        router.push("/super-admin/settings");
        setIsOpen(false);
      }
    },
    {
      icon: Bell,
      label: "Notificaciones",
      onClick: () => {
        router.push("/super-admin/notifications");
        setIsOpen(false);
      }
    },
    {
      icon: Shield,
      label: "Seguridad",
      onClick: () => {
        router.push("/super-admin/security");
        setIsOpen(false);
      }
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow">
          {userInitials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
            {user?.email?.split('@')[0] || 'Usuario'}
          </p>
          <p className="text-xs text-muted-foreground">{userRole}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-popover-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-muted/50 transition-colors"
              >
                <item.icon className="w-4 h-4 mr-3 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-border my-1" />

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}