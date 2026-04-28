import { API_URL, isNgrok } from "./api";

export interface User {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT";
  tenant_id: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthTokens {
  access_token: string;
  expires_in: number;
}

// --- Token management ---

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User) {
  localStorage.setItem("access_token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// --- API with auth ---

export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (isNgrok()) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401, try refresh
  if (res.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      const retryRes = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
      return retryRes.json();
    } else {
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      throw new Error("Session expired");
    }
  }

  return res.json();
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (isNgrok()) headers["ngrok-skip-browser-warning"] = "true";

    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers,
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success && data.data?.access_token) {
      localStorage.setItem("access_token", data.data.access_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function logout() {
  try {
    const headers: Record<string, string> = {};
    if (isNgrok()) headers["ngrok-skip-browser-warning"] = "true";

    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers,
    });
  } catch {
    // Ignore errors on logout
  }
  clearAuth();
}

// --- Role-based routing ---

export function getDashboardPath(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "SCHOOL_ADMIN":
      return "/school-admin/dashboard";
    case "TEACHER":
      return "/teacher/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    case "PARENT":
      return "/parent/dashboard";
    default:
      return "/";
  }
}
