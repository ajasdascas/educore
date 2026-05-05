import { API_URL, isNgrok } from "./api";

export interface User {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT";
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

export function setSupportContext(tenantId: string, schoolSlug: string, schoolName: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("support_tenant_id", tenantId);
  sessionStorage.setItem("support_school_slug", schoolSlug);
  sessionStorage.setItem("support_school_name", schoolName);
}

export function getSupportContext(): { tenantId: string; schoolSlug: string; schoolName: string } | null {
  if (typeof window === "undefined") return null;
  const tenantId = sessionStorage.getItem("support_tenant_id");
  const schoolSlug = sessionStorage.getItem("support_school_slug");
  const schoolName = sessionStorage.getItem("support_school_name");
  if (!tenantId) return null;
  return { tenantId, schoolSlug: schoolSlug || "", schoolName: schoolName || "" };
}

export function clearSupportContext() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("support_tenant_id");
  sessionStorage.removeItem("support_school_slug");
  sessionStorage.removeItem("support_school_name");
}

export function isSupportMode(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem("support_tenant_id");
}

function buildAuthHeaders(options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (isNgrok()) headers["ngrok-skip-browser-warning"] = "true";

  const supportCtx = getSupportContext();
  const user = getUser();
  if (supportCtx && user?.role === "SUPER_ADMIN") {
    headers["X-Support-Tenant-ID"] = supportCtx.tenantId;
  }

  return { headers, token };
}

export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const { headers, token } = buildAuthHeaders(options);

  if (token?.startsWith("mock-")) {
    clearAuth();
    redirectToLogin();
    return { success: false, error: "Demo tokens are disabled" };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    return {
      success: false,
      error: `No se pudo conectar al servidor (${API_URL}). Verifica que el backend esté activo y que CORS permita este origen.`,
    };
  }

  if (response.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${getAccessToken()}`,
      };
      try {
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        });
        return retryResponse.json();
      } catch {
        return { success: false, error: "No se pudo reconectar después de refrescar sesión." };
      }
    }

    clearAuth();
    redirectToLogin();
    throw new Error("Session expired");
  }

  if (response.status === 403) {
    let body: any = null;
    try { body = await response.json(); } catch { /* ignore */ }
    return {
      success: false,
      error: body?.error || "Sin permisos. Si eres Super Admin, selecciona una escuela primero desde /super-admin/schools.",
    };
  }

  try {
    return await response.json();
  } catch {
    return { success: false, error: `Respuesta inválida del servidor (HTTP ${response.status}).` };
  }
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
    case "STUDENT":
      return "/student/dashboard";
    default:
      return "/";
  }
}
