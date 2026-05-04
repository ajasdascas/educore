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

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const basePath = window.location.pathname.startsWith("/educore") ? "/educore" : "";
  window.location.href = `${basePath}/login`;
}

function buildAuthHeaders(options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (isNgrok()) headers["ngrok-skip-browser-warning"] = "true";

  return { headers, token };
}

export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const { headers, token } = buildAuthHeaders(options);

  if (token?.startsWith("mock-")) {
    clearAuth();
    redirectToLogin();
    return { success: false, error: "Demo tokens are disabled" };
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${getAccessToken()}`,
      };
      const retryResponse = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: retryHeaders,
      });
      return retryResponse.json();
    }

    clearAuth();
    redirectToLogin();
    throw new Error("Session expired");
  }

  return response.json();
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (isNgrok()) headers["ngrok-skip-browser-warning"] = "true";

    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers,
    });
    if (!response.ok) return false;

    const data = await response.json();
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
    // Ignore network errors on client logout.
  }
  clearAuth();
}

export function getDashboardPath(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "SCHOOL_ADMIN":
      return "/school-admin/dashboard";
    case "TEACHER":
      return "/teacher/dashboard";
    case "PARENT":
      return "/parent/dashboard";
    default:
      return "/";
  }
}
