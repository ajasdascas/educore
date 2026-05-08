import { APIRequestContext, Page, TestInfo, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export type AuditStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIPPED';
export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

export type AuditRecord = {
  area: string;
  flow: string;
  status: AuditStatus;
  url?: string;
  role?: string;
  school?: string;
  expected?: string;
  actual?: string;
  evidence?: string;
  severity?: Severity;
  recommendation?: string;
};

export type AuditIssue = Required<Pick<AuditRecord, 'area' | 'flow' | 'expected' | 'actual'>> & {
  id: string;
  severity: Severity;
  role?: string;
  school?: string;
  url?: string;
  evidence?: string;
  recommendation?: string;
};

type AuthSession = {
  accessToken: string;
  user: Record<string, unknown>;
};

type PersistedReport = {
  generated_at: string;
  base_url: string;
  api_url: string;
  run_id: string;
  production_mutations: boolean;
  credentials_present: {
    super_admin: boolean;
    qa_password: boolean;
  };
  results: AuditRecord[];
  bugs: AuditIssue[];
};

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const reportsDir = path.join(repoRoot, 'qa', 'reports');
const screenshotsDir = path.join(repoRoot, 'qa', 'screenshots');
const reportJsonPath = path.join(reportsDir, 'e2e-results.json');
const reportMarkdownPath = path.join(reportsDir, 'e2e-summary.md');

export const e2eBaseURL = trimTrailingSlash(process.env.E2E_BASE_URL ?? 'https://onlineu.mx/educore');
export const e2eApiURL = trimTrailingSlash(process.env.E2E_API_URL ?? 'https://educore-production-beef.up.railway.app');
export const allowProductionMutations = process.env.E2E_ALLOW_PRODUCTION_MUTATIONS === 'true';
export const hasSuperAdminCredentials = Boolean(process.env.E2E_SUPERADMIN_EMAIL && process.env.E2E_SUPERADMIN_PASSWORD);
export const hasQAPassword = Boolean(process.env.E2E_QA_PASSWORD);
export const qaRunId = process.env.E2E_RUN_ID ?? new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

export function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function qaName(base: string): string {
  return `QA-CODEX-${base}-${qaRunId}`;
}

export function qaEmail(role: string): string {
  return `qa.codex.${role}.${qaRunId}@example.test`;
}

export function resetAuditReport(): void {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const initial: PersistedReport = {
    generated_at: new Date().toISOString(),
    base_url: e2eBaseURL,
    api_url: e2eApiURL,
    run_id: qaRunId,
    production_mutations: allowProductionMutations,
    credentials_present: {
      super_admin: hasSuperAdminCredentials,
      qa_password: hasQAPassword,
    },
    results: [],
    bugs: [],
  };
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8');
  writeSummary(initial);
}

export function recordResult(record: AuditRecord): void {
  const report = loadReport();
  report.results.push(sanitizeRecord(record));
  if (record.status === 'FAIL' || (record.status === 'WARN' && record.severity)) {
    report.bugs.push(toIssue(record, report.bugs.length + 1));
  }
  saveReport(report);
}

export function recordSkip(area: string, flow: string, actual: string, url?: string): void {
  recordResult({
    area,
    flow,
    status: 'SKIPPED',
    url,
    expected: 'Flujo auditado con credenciales/permisos seguros disponibles.',
    actual,
    recommendation: 'Ejecutar de nuevo con variables E2E locales y sin guardar storageState en repo.',
  });
}

export function loadReport(): PersistedReport {
  fs.mkdirSync(reportsDir, { recursive: true });
  if (!fs.existsSync(reportJsonPath)) {
    resetAuditReport();
  }
  return JSON.parse(fs.readFileSync(reportJsonPath, 'utf8')) as PersistedReport;
}

export function saveReport(report: PersistedReport): void {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeSummary(report);
}

export async function attachDiagnostics(page: Page): Promise<{ consoleErrors: string[]; networkErrors: string[] }> {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(sanitizeText(msg.text()));
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(sanitizeText(error.message));
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      const url = sanitizeUrl(response.url());
      if (!isAllowedStaticMiss(url)) {
        networkErrors.push(`${status} ${url}`);
      }
    }
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    networkErrors.push(`${sanitizeUrl(request.url())}: ${failure?.errorText ?? 'request failed'}`);
  });

  return { consoleErrors, networkErrors };
}

export async function auditPageLoad(
  page: Page,
  area: string,
  flow: string,
  pathOrURL: string,
  expectedText?: RegExp,
): Promise<boolean> {
  const diagnostics = await attachDiagnostics(page);
  const url = toAbsoluteURL(pathOrURL);
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' }).catch((error) => {
    recordResult({
      area,
      flow,
      status: 'FAIL',
      url,
      expected: 'La pagina carga sin error de navegacion.',
      actual: sanitizeText(error.message),
      severity: 'P1',
    });
    return null;
  });

  if (!response) return false;
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined);

  const bodyText = sanitizeText(await page.locator('body').innerText().catch(() => ''));
  const status = response.status();
  const hasExpectedText = expectedText ? expectedText.test(bodyText) : bodyText.length > 80;

  if (status >= 400 || !hasExpectedText) {
    recordResult({
      area,
      flow,
      status: 'FAIL',
      url,
      expected: expectedText ? `Texto visible compatible con ${expectedText}` : 'Pantalla con contenido significativo.',
      actual: `HTTP ${status}; body length ${bodyText.length}`,
      severity: status >= 500 ? 'P0' : 'P1',
    });
    return false;
  }

  const hasServerError = diagnostics.networkErrors.some((entry) => /\b5\d\d\b/.test(entry));
  if (diagnostics.consoleErrors.length || diagnostics.networkErrors.length) {
    recordResult({
      area,
      flow,
      status: hasServerError ? 'FAIL' : 'WARN',
      url,
      expected: 'Sin errores graves de consola o red durante la carga.',
      actual: [
        ...diagnostics.consoleErrors.slice(0, 5),
        ...diagnostics.networkErrors.slice(0, 5),
      ].join(' | '),
      severity: hasServerError ? 'P1' : 'P3',
    });
  } else {
    recordResult({
      area,
      flow,
      status: 'PASS',
      url,
      expected: 'La pagina carga y muestra contenido.',
      actual: `HTTP ${status}; ${bodyText.length} caracteres visibles.`,
    });
  }

  return true;
}

export async function saveAuditScreenshot(page: Page, name: string, testInfo?: TestInfo): Promise<string> {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const target = path.join(screenshotsDir, `${safeName}.png`);
  await page.screenshot({ path: target, fullPage: true });
  if (testInfo) {
    await testInfo.attach(`${safeName}.png`, { path: target, contentType: 'image/png' });
  }
  return path.relative(repoRoot, target).replace(/\\/g, '/');
}

export async function loginSuperAdmin(page: Page): Promise<boolean> {
  if (!hasSuperAdminCredentials) {
    recordSkip('Auth', 'login super admin', 'Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD.', `${e2eBaseURL}/login/`);
    return false;
  }

  await auditPageLoad(page, 'Auth', 'abrir login super admin', '/login/', /Educore|Iniciar|correo|email/i);

  const email = process.env.E2E_SUPERADMIN_EMAIL ?? '';
  const password = process.env.E2E_SUPERADMIN_PASSWORD ?? '';
  await fillFirst(page, ['input[type="email"]', 'input[name="email"]', 'input[autocomplete="email"]'], email);
  await fillFirst(page, ['input[type="password"]', 'input[name="password"]', 'input[autocomplete="current-password"]'], password);
  await clickFirst(page, [
    'button[type="submit"]',
    'button:has-text("Iniciar")',
    'button:has-text("Entrar")',
    'button:has-text("Login")',
  ]);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

  const currentURL = page.url();
  const bodyText = sanitizeText(await page.locator('body').innerText().catch(() => ''));
  const loggedIn = !/\/login\/?$/.test(currentURL) && /Dashboard|Super|Admin|Usuarios|Escuelas/i.test(bodyText);

  recordResult({
    area: 'Auth',
    flow: 'login super admin',
    status: loggedIn ? 'PASS' : 'FAIL',
    url: sanitizeUrl(currentURL),
    role: 'SUPER_ADMIN',
    expected: 'Super Admin entra a un dashboard protegido.',
    actual: loggedIn ? 'Sesion autenticada sin guardar storageState.' : `No se detecto dashboard. URL=${sanitizeUrl(currentURL)}`,
    severity: loggedIn ? undefined : 'P1',
  });

  return loggedIn;
}

export async function apiLoginSuperAdmin(request: APIRequestContext): Promise<AuthSession | null> {
  if (!hasSuperAdminCredentials) {
    recordSkip('Auth', 'login super admin via API', 'Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD.', `${e2eApiURL}/api/v1/auth/login`);
    return null;
  }

  const response = await request.post(`${e2eApiURL}/api/v1/auth/login`, {
    data: {
      email: process.env.E2E_SUPERADMIN_EMAIL,
      password: process.env.E2E_SUPERADMIN_PASSWORD,
    },
  });
  const body = await response.json().catch(() => null) as any;
  const success = response.ok() && body?.success && body?.data?.access_token && body?.data?.user?.role === 'SUPER_ADMIN';

  recordResult({
    area: 'Auth',
    flow: 'login super admin via API',
    status: success ? 'PASS' : 'FAIL',
    url: `${e2eApiURL}/api/v1/auth/login`,
    role: 'SUPER_ADMIN',
    expected: 'API autentica Super Admin con credenciales E2E sin exponer token.',
    actual: success ? 'API login exitoso; credencial temporal no persistida en repo.' : `HTTP ${response.status()}; success=${Boolean(body?.success)}; role=${body?.data?.user?.role ?? 'unknown'}`,
    severity: success ? undefined : 'P1',
  });

  if (!success) return null;
  return {
    accessToken: body.data.access_token,
    user: body.data.user,
  };
}

export async function installAuthSession(page: Page, session: AuthSession): Promise<void> {
  await page.addInitScript((auth) => {
    window.localStorage.setItem('access_token', auth.accessToken);
    window.localStorage.setItem('user', JSON.stringify(auth.user));
  }, session);
}

export async function loginSuperAdminWithFallback(page: Page, request: APIRequestContext): Promise<boolean> {
  const uiLoggedIn = await loginSuperAdmin(page);
  if (uiLoggedIn) return true;

  const apiSession = await apiLoginSuperAdmin(request);
  if (!apiSession) return false;
  await installAuthSession(page, apiSession);
  await page.goto(`${e2eBaseURL}/super-admin/dashboard/`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  const bodyText = sanitizeText(await page.locator('body').innerText().catch(() => ''));
  const authenticated = /Dashboard|Super|Admin|Usuarios|Escuelas|Analytics|Módulos|Modulos/i.test(bodyText) && !/Iniciar sesion|Iniciar sesión/i.test(bodyText);

  recordResult({
    area: 'Auth',
    flow: 'sesion Super Admin inyectada desde API para QA',
    status: authenticated ? 'PASS' : 'FAIL',
    url: sanitizeUrl(page.url()),
    role: 'SUPER_ADMIN',
    expected: 'Tras API login, localStorage temporal permite auditar pantallas protegidas.',
    actual: authenticated ? 'Dashboard protegido cargado con sesion temporal de Playwright.' : bodyText.slice(0, 240),
    severity: authenticated ? undefined : 'P1',
  });

  return authenticated;
}

export async function probeAPI(
  request: APIRequestContext,
  method: 'GET' | 'POST',
  endpoint: string,
  options: { token?: string; supportTenantID?: string; data?: unknown } = {},
): Promise<{ status: number; body: string }> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.supportTenantID) headers['X-Support-Tenant-ID'] = options.supportTenantID;

  const url = `${e2eApiURL}${endpoint}`;
  const response = method === 'GET'
    ? await request.get(url, { headers })
    : await request.post(url, { headers, data: options.data });
  const body = sanitizeText(await response.text().catch(() => ''));
  return { status: response.status(), body };
}

export async function expectProtectedAPIRejects(
  request: APIRequestContext,
  endpoint: string,
  role: string,
): Promise<void> {
  const noToken = await probeAPI(request, 'GET', endpoint);
  const badToken = await probeAPI(request, 'GET', endpoint, { token: 'QA-CODEX-invalid-token' });
  const leakedHash = /password_hash|bcrypt|\$2[aby]\$/i.test(`${noToken.body}\n${badToken.body}`);
  const accepted = noToken.status < 400 || badToken.status < 400;
  recordResult({
    area: 'Security/RBAC',
    flow: `API protegida ${endpoint}`,
    status: !accepted && !leakedHash ? 'PASS' : 'FAIL',
    url: `${e2eApiURL}${endpoint}`,
    role,
    expected: '401/403 claro sin password_hash para requests sin token o con token invalido.',
    actual: `sin token=${noToken.status}; token invalido=${badToken.status}; password_hash=${leakedHash}`,
    severity: accepted || leakedHash ? 'P0' : undefined,
    recommendation: accepted ? 'Revisar middleware auth/RBAC del endpoint.' : undefined,
  });
}

export async function assertNoHorizontalOverflow(page: Page, area: string, flow: string): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
  recordResult({
    area,
    flow,
    status: overflow ? 'FAIL' : 'PASS',
    url: sanitizeUrl(page.url()),
    expected: 'La vista no genera scroll horizontal accidental.',
    actual: overflow ? 'documentElement.scrollWidth excede viewport.' : 'Sin overflow horizontal relevante.',
    severity: overflow ? 'P2' : undefined,
  });
}

export async function checkVisibleText(page: Page, area: string, flow: string, pattern: RegExp): Promise<void> {
  const text = sanitizeText(await page.locator('body').innerText().catch(() => ''));
  recordResult({
    area,
    flow,
    status: pattern.test(text) ? 'PASS' : 'FAIL',
    url: sanitizeUrl(page.url()),
    expected: `Texto visible: ${pattern}`,
    actual: text.slice(0, 240),
    severity: pattern.test(text) ? undefined : 'P2',
  });
}

export async function clickFirst(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      await locator.click({ timeout: 8_000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

export async function fillFirst(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      await locator.fill(value, { timeout: 8_000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

export function requireMutationGate(area: string, flow: string): boolean {
  if (!hasSuperAdminCredentials) {
    recordSkip(area, flow, 'Faltan credenciales Super Admin E2E en variables de entorno.');
    return false;
  }
  if (!allowProductionMutations) {
    recordSkip(area, flow, 'E2E_ALLOW_PRODUCTION_MUTATIONS no es true; no se crean ni editan datos en produccion.');
    return false;
  }
  if (!hasQAPassword) {
    recordSkip(area, flow, 'Falta E2E_QA_PASSWORD para usuarios QA; no se generan credenciales.');
    return false;
  }
  return true;
}

export function toAbsoluteURL(pathOrURL: string): string {
  if (/^https?:\/\//i.test(pathOrURL)) return pathOrURL;
  const normalizedPath = pathOrURL.startsWith('/') ? pathOrURL : `/${pathOrURL}`;
  return `${e2eBaseURL}${normalizedPath}`;
}

function toIssue(record: AuditRecord, nextNumber: number): AuditIssue {
  return {
    id: `E2E-${String(nextNumber).padStart(3, '0')}`,
    severity: record.severity ?? 'P2',
    area: record.area,
    flow: record.flow,
    role: record.role,
    school: record.school,
    url: record.url,
    expected: record.expected ?? 'Comportamiento esperado no especificado.',
    actual: record.actual ?? 'Fallo sin detalle.',
    evidence: record.evidence,
    recommendation: record.recommendation,
  };
}

function sanitizeRecord(record: AuditRecord): AuditRecord {
  return {
    ...record,
    url: record.url ? sanitizeUrl(record.url) : undefined,
    actual: record.actual ? sanitizeText(record.actual) : undefined,
    expected: record.expected ? sanitizeText(record.expected) : undefined,
    evidence: record.evidence ? sanitizeText(record.evidence) : undefined,
    recommendation: record.recommendation ? sanitizeText(record.recommendation) : undefined,
  };
}

function sanitizeText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/(password|passwd|pwd|token|secret|jwt|dsn)(["'\s:=]+)[^"'\s,;}]+/gi, '$1$2[redacted]')
    .replace(/[A-Za-z0-9._%+-]+:[^@\s]+@/g, '[redacted-auth]@')
    .slice(0, 2_000);
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (/token|password|secret|jwt|key|dsn/i.test(key)) {
        url.searchParams.set(key, '[redacted]');
      }
    }
    return url.toString();
  } catch {
    return sanitizeText(value);
  }
}

function isAllowedStaticMiss(url: string): boolean {
  return /\.(png|jpe?g|webp|avif|svg|ico|woff2?)($|\?)/i.test(url) && /404/.test(url) === false;
}

function writeSummary(report: PersistedReport): void {
  const counts = report.results.reduce<Record<AuditStatus, number>>(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    { PASS: 0, FAIL: 0, WARN: 0, SKIPPED: 0 },
  );

  const lines = [
    '# EduCore E2E Audit Summary',
    '',
    `Generated: ${report.generated_at}`,
    `Base URL: ${report.base_url}`,
    `API URL: ${report.api_url}`,
    `Run ID: ${report.run_id}`,
    `Production mutations enabled: ${report.production_mutations}`,
    `Super Admin credentials present: ${report.credentials_present.super_admin}`,
    '',
    '| Status | Count |',
    '| --- | ---: |',
    `| PASS | ${counts.PASS} |`,
    `| WARN | ${counts.WARN} |`,
    `| FAIL | ${counts.FAIL} |`,
    `| SKIPPED | ${counts.SKIPPED} |`,
    '',
    '## Bugs',
    '',
    report.bugs.length
      ? '| ID | Severity | Area | Flow | URL | Actual |\n| --- | --- | --- | --- | --- | --- |\n'
        + report.bugs.map((bug) => `| ${bug.id} | ${bug.severity} | ${bug.area} | ${bug.flow} | ${bug.url ?? ''} | ${(bug.actual ?? '').replace(/\|/g, '/') } |`).join('\n')
      : 'No reportable bugs recorded by the automated scaffold.',
    '',
    '## Results',
    '',
    '| Area | Flow | Status | URL | Actual |',
    '| --- | --- | --- | --- | --- |',
    ...report.results.map((result) => `| ${result.area} | ${result.flow} | ${result.status} | ${result.url ?? ''} | ${(result.actual ?? '').replace(/\|/g, '/') } |`),
    '',
  ];
  fs.writeFileSync(reportMarkdownPath, `${lines.join('\n')}\n`, 'utf8');
}

export { expect };
