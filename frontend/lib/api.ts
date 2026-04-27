// URL del backend API
// En desarrollo usa localhost, en producción usa ngrok tunnel
const API_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8082"
    : "https://pester-dramatize-ocean.ngrok-free.dev";

export { API_URL };
