"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  User,
  getUser,
  getAccessToken,
  setAuth,
  clearAuth,
  logout as authLogout,
  getDashboardPath,
} from "@/lib/auth";
import { getTenantFromHost, parseTenantSlug } from "@/lib/tenant";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Public routes that don't need auth
const PUBLIC_ROUTES = ["/", "/login", "/reset-password", "/accept-invitation"];

function activeSlug(user?: User | null): string {
  if (user?.tenant_slug) return user.tenant_slug;
  if (typeof window === "undefined") return "";
  return getTenantFromHost(window.location.hostname)
    || parseTenantSlug(new URLSearchParams(window.location.search).get("slug"))
    || "";
}

function authPath(pathname: "/login" | "/change-password", user?: User | null): string {
  const slug = activeSlug(user);
  return slug ? `${pathname}?slug=${encodeURIComponent(slug)}` : pathname;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = getUser();
    const storedToken = getAccessToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  // Route guard
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.some((r) => pathname === r);

    if (!user && !isPublic) {
	  router.replace(authPath("/login"));
      return;
    }

	if (user?.password_must_change) {
	  if (pathname !== "/change-password") {
		router.replace(authPath("/change-password", user));
	  }
	  return;
	}

	if (user && pathname === "/change-password") {
	  router.replace(getDashboardPath(user.role));
	  return;
	}

    // Keep the marketing landing public; only skip the login form for active sessions.
    if (user && pathname === "/login") {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, loading, pathname, router]);

  const login = (newToken: string, newUser: User) => {
    setAuth(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
	const loginPath = authPath("/login", user);
    clearAuth();
    setUser(null);
    setToken(null);
	  router.replace(loginPath);
    void authLogout();
  };

	const isPublicPath = PUBLIC_ROUTES.some((route) => pathname === route);
	const mustRedirect = !loading && !!user?.password_must_change && pathname !== "/change-password";
	const unauthenticatedRedirect = !loading && !user && !isPublicPath;
	const blockChildren = loading || mustRedirect || unauthenticatedRedirect;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
	  {blockChildren ? (
		<div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
		  {mustRedirect ? "Redirigiendo al cambio obligatorio de contraseña..." : "Verificando sesión..."}
		</div>
	  ) : children}
    </AuthContext.Provider>
  );
}
