// ============================================================
// EduCore — Cliente API del frontend
// ------------------------------------------------------------
// La URL del backend es CONFIGURABLE por entorno. Nunca se
// hardcodea aquí. En producción DEBE venir de NEXT_PUBLIC_API_URL
// (Next.js la hornea en build time para el export estático).
//
//   - Desarrollo: usa NEXT_PUBLIC_API_URL si está; si no, localhost:8082.
//   - Producción: NEXT_PUBLIC_API_URL es OBLIGATORIA. Si falta, la app
//     no inventa una URL: falla de forma controlada y avisa en consola.
//
// NEXT_PUBLIC_API_URL es una URL pública, NO un secreto. No pongas
// secretos en variables NEXT_PUBLIC_*.
// ============================================================

const IS_PROD = process.env.NODE_ENV === "production";

// Normaliza: recorta espacios y quita el/los slash final(es) para evitar
// URLs dobles (`https://api//api/v1/...`).
const CONFIGURED_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

function resolveApiUrl(): string {
  if (CONFIGURED_API_URL) return CONFIGURED_API_URL;
  if (!IS_PROD) return "http://localhost:8082"; // fallback SOLO en desarrollo
  return ""; // producción sin configurar → error controlado en apiRequest()
}

const API_URL = resolveApiUrl();

// Producción sin NEXT_PUBLIC_API_URL = build mal configurado.
export const API_MISCONFIGURED = IS_PROD && CONFIGURED_API_URL === "";

if (API_MISCONFIGURED && typeof window !== "undefined") {
  // Aviso ruidoso para detectar builds sin la variable horneada.
  console.error(
    "[EduCore] NEXT_PUBLIC_API_URL no está configurada. El build de " +
      "producción debe generarse con NEXT_PUBLIC_API_URL apuntando al backend " +
      "(p. ej. https://api.onlineu.mx). Las llamadas al API fallarán hasta corregirlo."
  );
}

// En producción validamos que sea HTTPS (evita Mixed Content bajo https://onlineu.mx).
if (
  IS_PROD &&
  CONFIGURED_API_URL !== "" &&
  !CONFIGURED_API_URL.startsWith("https://") &&
  typeof window !== "undefined"
) {
  console.error(
    "[EduCore] NEXT_PUBLIC_API_URL debe usar https:// en producción. Valor actual no es HTTPS."
  );
}

const isNgrok = () => API_URL.includes("ngrok") || API_URL.includes("railway");

// ── Errores tipados de infraestructura ──────────────────────
// Diferencian un fallo de red/servidor de un error de negocio (que el
// backend devuelve como JSON {success:false,...} y NO lanza excepción).
export type ApiErrorKind =
  | "misconfigured" // NEXT_PUBLIC_API_URL ausente en prod
  | "network" // no se pudo alcanzar el servidor (DNS, CORS, connection refused)
  | "timeout" // el servidor tardó demasiado (AbortController)
  | "unavailable" // 5xx / edge del proveedor
  | "invalid_response"; // respuesta no-JSON (HTML de error, proxy, etc.)

const FRIENDLY_MESSAGE: Record<ApiErrorKind, string> = {
  misconfigured:
    "La aplicación no está configurada correctamente (API no definida). Contacta al administrador.",
  network:
    "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Inténtalo de nuevo.",
  unavailable:
    "El servicio no está disponible en este momento. Inténtalo en unos minutos.",
  invalid_response:
    "El servidor respondió de forma inesperada. Inténtalo de nuevo.",
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly requestId?: string;
  /** Detalle técnico — solo para logs/desarrollo, no para mostrar al usuario. */
  readonly technical?: string;

  constructor(
    kind: ApiErrorKind,
    opts: { status?: number; requestId?: string; technical?: string } = {}
  ) {
    super(FRIENDLY_MESSAGE[kind]);
    this.name = "ApiError";
    this.kind = kind;
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.technical = opts.technical;
  }
}

// 30s tolera el cold start del backend en hosting gratuito (Render free duerme
// tras inactividad y el primer request puede tardar ~50s). El warmup del login
// suele evitar la espera, pero dejamos margen para el primer golpe en frío.
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * warmup — "despierta" el backend (fire-and-forget). Útil al montar la pantalla
 * de login para que la instancia gratuita ya esté activa cuando el usuario envíe.
 */
export const warmup = () => {
  if (API_MISCONFIGURED) return;
  fetch(`${API_URL}/api/v1/health`, { method: "GET", cache: "no-store" }).catch(() => {});
};

/**
 * apiRequest — llamada al backend con manejo de errores diferenciado.
 *
 * Contrato (compatibilidad con el código existente):
 *   - Si el backend responde JSON (2xx **o** 4xx/5xx con cuerpo JSON
 *     estructurado, p. ej. {success:false,error} o {code:"ROLE_MISMATCH"}),
 *     devuelve el objeto parseado. La capa que llama inspecciona `success`.
 *   - Si hay fallo de red/timeout/respuesta no-JSON, LANZA un ApiError con
 *     `.message` amigable en español y `.kind` para distinguir el caso.
 */
export type ApiResponse = {
  success: boolean;
  code?: string;
  message?: string;
  error?: string;
  data: {
    access_token: string;
    user: {
      id: string;
      email: string;
      tenant_id: string;
      role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT";
      first_name?: string;
      last_name?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export const apiRequest = async <TResponse = ApiResponse>(
  endpoint: string,
  options: RequestInit = {}
): Promise<TResponse> => {
  if (API_MISCONFIGURED) {
    throw new ApiError("misconfigured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };
    if (isNgrok()) headers["ngrok-skip-browser-warning"] = "true";

    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
      // Necesario para la cookie httpOnly del refresh_token (CORS con credenciales).
      credentials: "include",
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError") {
      throw new ApiError("timeout", { technical: e.message });
    }
    // fetch lanza TypeError en: DNS, connection refused, CORS bloqueado, red caída.
    throw new ApiError("network", { technical: e.message });
  } finally {
    clearTimeout(timer);
  }

  const requestId =
    response.headers.get("X-Request-Id") ||
    response.headers.get("x-request-id") ||
    undefined;
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  const trimmed = raw.trim();
  const looksJson =
    contentType.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  if (!looksJson) {
    // No es JSON → suele ser HTML de un edge/proxy o el backend caído.
    if (response.status >= 500) {
      throw new ApiError("unavailable", { status: response.status, requestId });
    }
    throw new ApiError("invalid_response", { status: response.status, requestId });
  }

  try {
    return JSON.parse(raw) as TResponse;
  } catch {
    throw new ApiError("invalid_response", { status: response.status, requestId });
  }
};

export { API_URL, isNgrok };
