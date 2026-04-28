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
const PUBLIC_ROUTES = ["/", "/reset-password", "/accept-invitation"];

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
      router.replace("/");
      return;
    }

    // If authenticated and on login page, redirect to dashboard
    if (user && pathname === "/") {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, loading, pathname, router]);

  const login = (newToken: string, newUser: User) => {
    setAuth(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    setToken(null);
    router.replace("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
