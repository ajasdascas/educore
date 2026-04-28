// URL del backend API - Configuración dinámica
const getApiUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8082";

  const hostname = window.location.hostname;

  // Desarrollo local
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
    return "http://localhost:8082";
  }

  // Producción: Railway (se actualizará con la URL real después del deploy)
  return "https://educore-production-beef.up.railway.app";
};

const API_URL = getApiUrl();
const isNgrok = () => API_URL.includes("ngrok") || API_URL.includes("railway");

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (isNgrok()) headers['ngrok-skip-browser-warning'] = 'true';

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const text = await response.text();
      try { return JSON.parse(text); } catch { throw new Error(`HTTP ${response.status}: ${response.statusText}`); }
    }
    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

export { API_URL, isNgrok };
