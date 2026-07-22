/**
 * tenant.ts — Centralised tenant detection utilities
 *
 * Two strategies:
 *  1. Subdomain routing: kinder1.onlineu.mx  → slug = "kinder1"
 *  2. Query-param fallback: onlineu.mx/educore/escuela/?slug=kinder1 → slug = "kinder1"
 *
 * Used by: /escuela page, login page, school-admin layout, middleware
 */

// Alineado con backend/internal/pkg/slug (Reserved) y htaccess-subdomain-root.
export const TENANT_ROOT_DOMAIN = "onlineu.mx";

export const EXCLUDED_SUBDOMAINS = new Set([
  "www",
  "mail",
  "ftp",
  "api",
  "smtp",
  "webmail",
  "admin",
  "dev",
  "staging",
  "dashboard",
  "app",
  "educore",
  "onlineu",
  "support",
  "status",
  "static",
  "assets",
  "cdn",
  "cpanel",
  "webdisk",
  "portal",
  "login",
  "auth",
  "public",
  "ns1",
  "ns2",
  "mx",
]);

const ROOT_DOMAINS = [TENANT_ROOT_DOMAIN, "localhost"];
const VALID_TENANT_SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Converts a school name or user-entered value into the same DNS-safe slug
 * format enforced by the backend.
 */
export function normalizeTenantSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
}

export function getTenantSlugError(value: string): string | null {
  if (value.length < 2) return "El subdominio debe tener al menos 2 caracteres.";
  if (value.length > 63) return "El subdominio no puede exceder 63 caracteres.";
  if (value.includes("--")) return "El subdominio no puede tener guiones dobles.";
  if (!VALID_TENANT_SLUG.test(value)) {
    return "Usa solo minúsculas, números y guiones, sin guion inicial o final.";
  }
  if (EXCLUDED_SUBDOMAINS.has(value)) return "Ese subdominio está reservado.";
  return null;
}

export function parseTenantSlug(value?: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim().toLowerCase();
  return getTenantSlugError(candidate) ? null : candidate;
}

/**
 * Extract the school slug from a given hostname.
 *
 * Rules:
 * - `kinder1.onlineu.mx`  → "kinder1"
 * - `onlineu.mx`          → null  (main domain, no tenant)
 * - `www.onlineu.mx`      → null  (excluded)
 * - `localhost`           → null  (dev, no tenant)
 *
 * @param hostname  e.g. window.location.hostname
 */
export function getTenantFromHost(hostname: string): string | null {
  if (!hostname) return null;

  // Strip port if present (e.g. localhost:3000)
  const host = hostname.split(":")[0].toLowerCase().replace(/\.$/, "");

  // Explicit root domains — no tenant
  if (ROOT_DOMAINS.includes(host)) return null;

  const parts = host.split(".");

  // Need at least 3 parts: sub.domain.tld
  if (parts.length < 3) return null;

  const sub = parts[0];
  const domain = parts.slice(1).join(".");

  // Only process known root domain
  if (domain !== TENANT_ROOT_DOMAIN) return null;

  // Exclude system subdomains
  if (EXCLUDED_SUBDOMAINS.has(sub)) return null;

  return parseTenantSlug(sub);
}

/**
 * Get tenant slug from current browser location.
 * Falls back to ?slug= query param if not on a subdomain.
 *
 * @param searchParams  URLSearchParams from useSearchParams()
 */
export function getActiveTenantSlug(searchParams?: URLSearchParams | null): string | null {
  if (typeof window === "undefined") return null;

  const fromHost = getTenantFromHost(window.location.hostname);
  if (fromHost) return fromHost;

  return parseTenantSlug(searchParams?.get("slug"));
}
