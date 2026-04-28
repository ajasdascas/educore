// URL del backend API
// Configuración dinámica para diferentes entornos
const getApiUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8083";

  const hostname = window.location.hostname;

  // Si es localhost o IP local, usar puerto 8083 directo
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
    return "http://localhost:8083";
  }

  // En producción, usar el backend deployado
  // Opción 1: Subdominio dedicado (recomendado)
  if (hostname === "onlineu.mx") {
    return "https://api.onlineu.mx";
  }

  // Opción 2: Path en mismo dominio (alternativa)
  return "https://onlineu.mx/api";
};

const API_URL = getApiUrl();

// Helper: detecta si estamos usando ngrok
const isNgrok = () => API_URL.includes("ngrok");

// Función helper para hacer requests con mejor manejo de errores
// Incluye header ngrok-skip-browser-warning para evitar el interstitial de ngrok
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Bypass ngrok browser warning interstitial
    if (isNgrok()) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      // No usar credentials: "include" con ngrok ya que causa CORS issues
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

export { API_URL, isNgrok };
