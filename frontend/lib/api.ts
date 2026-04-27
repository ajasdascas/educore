// URL del backend API
// Configuración dinámica para diferentes entornos
const getApiUrl = () => {
  // Variable de entorno tiene prioridad
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  // Si estamos en el servidor (SSR), usar localhost
  if (typeof window === "undefined") {
    return "http://localhost:8082";
  }

  const hostname = window.location.hostname;

  // Desarrollo local
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8082";
  }

  // Producción: Fallback a ngrok
  // NOTA: Actualiza NEXT_PUBLIC_API_URL en .env.local
  return "https://pester-dramatize-ocean.ngrok-free.dev";
};

const API_URL = getApiUrl();

// Función helper para hacer requests con mejor manejo de errores
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

export { API_URL };
