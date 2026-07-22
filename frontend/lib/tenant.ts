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
const EXCLUDED_SUBDOMAINS = new Set([
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
]);

const ROOT_DOMAINS = ["onlineu.mx", "localhost"];

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
  const host = hostname.split(":")[0].toLowerCase();

  // Explicit root domains — no tenant
  if (ROOT_DOMAINS.includes(host)) return null;

  const parts = host.split(".");

  // Need at least 3 parts: sub.domain.tld
  if (parts.length < 3) return null;

  const sub = parts[0];
  const domain = parts.slice(1).join(".");

  // Only process known root domain
  if (domain !== "onlineu.mx") return null;

  // Exclude system subdomains
  if (EXCLUDED_SUBDOMAINS.has(sub)) return null;

  // Must match school slug pattern: a-z, 0-9, hyphens, no leading/trailing hyphen
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(sub) && !/^[a-z0-9]$/.test(sub)) return null;

  return sub;
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

  return searchParams?.get("slug") || null;
}
