import { APIRequestContext, Page, TestInfo, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export type AuditStatus =
  | 'PASS'
  | 'FAIL'
  | 'WARN'
  | 'SKIPPED'
  | 'PASS_REAL'
  | 'PASS_READ_ONLY'
  | 'PASS_EMPTY_STATE'
  | 'PARTIAL'
  | 'PARTIAL_EMPTY_STATE_ONLY'
  | 'PARTIAL_WRONG_ROLE'
  | 'FAIL_404'
  | 'FAIL_500'
  | 'FAIL_BUTTON_DEAD'
  | 'FAIL_SECURITY'
  | 'SKIPPED_NO_CREDENTIALS'
  | 'SKIPPED_PROVIDER_NOT_CONFIGURED'
  | 'SKIPPED_SECURITY_SCOPE'
  | 'REQUIRES_VPS';
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

export type QASchoolSpec = {
  key: 'kinder' | 'preescolar' | 'primaria';
  name: string;
  slug: string;
  level: string;
  expectedModules: string[];
};

export type QASchoolState = QASchoolSpec & {
  id: string;
  adminEmail: string;
};

export type QACoreState = {
  school: QASchoolState;
  group?: Record<string, any>;
  teacher?: Record<string, any>;
  student?: Record<string, any>;
  subject?: Record<string, any>;
  portalCredentials?: {
    teacher?: { email: string; password?: string };
    parent?: { email: string; password?: string };
    student?: { email: string; password?: string };
  };
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
const qaStatePath = path.join(reportsDir, 'qa-state.json');
const checkpointsDir = path.join(repoRoot, 'qa', 'checkpoints');
const progressPath = path.join(checkpointsDir, 'PROGRESS.json');

export const e2eBaseURL = trimTrailingSlash(process.env.E2E_BASE_URL ?? 'https://onlineu.mx/educore');
export const e2eApiURL = trimTrailingSlash(process.env.E2E_API_URL ?? 'https://educore-production-beef.up.railway.app');
export const allowProductionMutations = process.env.E2E_ALLOW_PRODUCTION_MUTATIONS === 'true';
export const hasSuperAdminCredentials = Boolean(process.env.E2E_SUPERADMIN_EMAIL && process.env.E2E_SUPERADMIN_PASSWORD);
export const hasQAPassword = Boolean(process.env.E2E_QA_PASSWORD);
export const qaRunId = process.env.E2E_RUN_ID ?? new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

export const qaSchoolSpecs: QASchoolSpec[] = [
  {
    key: 'kinder',
    name: 'QA-CODEX-NIGHTLY-KINDER',
    slug: 'qa-codex-nightly-kinder',
    level: 'kinder',
    expectedModules: ['academic_core', 'users', 'students', 'groups', 'schedules', 'attendance', 'documents', 'reports', 'communications'],
  },
  {
    key: 'preescolar',
    name: 'QA-CODEX-NIGHTLY-PREESCOLAR',
    slug: 'qa-codex-nightly-preescolar',
    level: 'preescolar',
    expectedModules: ['academic_core', 'users', 'students', 'groups', 'schedules', 'attendance', 'documents', 'reports', 'communications'],
  },
  {
    key: 'primaria',
    name: 'QA-CODEX-NIGHTLY-PRIMARIA',
    slug: 'qa-codex-nightly-primaria',
    level: 'primaria',
    expectedModules: ['academic_core', 'users', 'students', 'groups', 'schedules', 'attendance', 'grades', 'documents', 'reports', 'communications'],
  },
];

export function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function qaName(base: string): string {
  return `QA-CODEX-NIGHTLY-${base}-${qaRunId}`;
}

export function qaEmail(role: string): string {
  return `qa.codex.nightly.${role}.${qaRunId}@example.test`;
}

export function resetAuditReport(): void {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(checkpointsDir, { recursive: true });
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
  updateProgress('bootstrap', 'Audit report initialized.');
}

export function recordResult(record: AuditRecord): void {
  const report = loadReport();
  report.results.push(sanitizeRecord(record));
  if (isBugStatus(record.status) || (record.status === 'WARN' && record.severity)) {
    report.bugs.push(toIssue(record, report.bugs.length + 1));
  }
  saveReport(report);
}

export function recordSkip(area: string, flow: string, actual: string, url?: string): void {
  recordResult({
    area,
    flow,
    status: actual.toLowerCase().includes('credencial') || actual.toLowerCase().includes('credential')
      ? 'SKIPPED_NO_CREDENTIALS'
      : 'SKIPPED',
    url,
    expected: 'Flujo auditado con credenciales/permisos seguros disponibles.',
    actual,
    recommendation: 'Ejecutar de nuevo con variables E2E locales y sin guardar storageState en repo.',
  });
}

export function recordSecurityScopeSkip(area: string, flow: string, actual: string, url?: string): void {
  recordResult({
    area,
    flow,
    status: 'SKIPPED_SECURITY_SCOPE',
    url,
    expected: 'La auditoria se mantiene en QA funcional y control de acceso seguro.',
    actual,
    recommendation: 'No ejecutar payloads ofensivos, fuzzing, fuerza bruta, evasion ni explotacion.',
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
  updateProgress('reporting', `Results=${report.results.length}; Bugs=${report.bugs.length}`);
}

export function updateProgress(phase: string, nextStep: string, status: 'completed' | 'failed' | 'skipped' = 'completed'): void {
  fs.mkdirSync(checkpointsDir, { recursive: true });
  const current = fs.existsSync(progressPath)
    ? JSON.parse(fs.readFileSync(progressPath, 'utf8'))
    : {
        started_at: new Date().toISOString(),
        last_completed_phase: '',
        completed: [],
        failed: [],
        skipped: [],
        created_qa_objects: [],
        deleted_qa_objects: [],
        next_step: '',
      };
  const bucket = status === 'failed' ? 'failed' : status === 'skipped' ? 'skipped' : 'completed';
  current.last_completed_phase = phase;
  current[bucket] = Array.from(new Set([...(current[bucket] ?? []), phase]));
  current.next_step = nextStep;
  current.updated_at = new Date().toISOString();
  fs.writeFileSync(progressPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
}

export function appendCreatedQAObject(object: Record<string, unknown>): void {
  fs.mkdirSync(checkpointsDir, { recursive: true });
  const current = fs.existsSync(progressPath)
    ? JSON.parse(fs.readFileSync(progressPath, 'utf8'))
    : {
        started_at: new Date().toISOString(),
        last_completed_phase: '',
        completed: [],
        failed: [],
        skipped: [],
        created_qa_objects: [],
        deleted_qa_objects: [],
        next_step: '',
      };
  current.created_qa_objects = [...(current.created_qa_objects ?? []), { ...object, recorded_at: new Date().toISOString() }];
  current.updated_at = new Date().toISOString();
  fs.writeFileSync(progressPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
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
    status: loggedIn ? 'PASS_REAL' : 'FAIL',
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
    status: success ? 'PASS_REAL' : 'FAIL',
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

export async function installSupportSession(page: Page, session: AuthSession, school: QASchoolState, role: SupportRole): Promise<void> {
  await page.addInitScript((ctx) => {
    window.localStorage.setItem('access_token', ctx.session.accessToken);
    window.localStorage.setItem('user', JSON.stringify(ctx.session.user));
    window.sessionStorage.setItem('support_tenant_id', ctx.school.id);
    window.sessionStorage.setItem('support_school_slug', ctx.school.slug);
    window.sessionStorage.setItem('support_school_name', ctx.school.name);
    window.sessionStorage.setItem('support_role', ctx.role);
  }, { session, school, role });
}

export type SupportRole = 'school_admin' | 'teacher' | 'parent' | 'student';

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
    status: authenticated ? 'PASS_REAL' : 'FAIL',
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

export async function apiGetJSON(
  request: APIRequestContext,
  session: AuthSession,
  endpoint: string,
  supportTenantID?: string,
): Promise<{ ok: boolean; status: number; body: any; text: string }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${session.accessToken}` };
  if (supportTenantID) headers['X-Support-Tenant-ID'] = supportTenantID;
  const response = await request.get(`${e2eApiURL}${endpoint}`, { headers });
  return parseAPIResponse(response);
}

export async function apiPostJSON(
  request: APIRequestContext,
  session: AuthSession,
  endpoint: string,
  data: unknown,
  supportTenantID?: string,
): Promise<{ ok: boolean; status: number; body: any; text: string }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${session.accessToken}` };
  if (supportTenantID) headers['X-Support-Tenant-ID'] = supportTenantID;
  const response = await request.post(`${e2eApiURL}${endpoint}`, { headers, data });
  return parseAPIResponse(response);
}

export async function apiPutJSON(
  request: APIRequestContext,
  session: AuthSession,
  endpoint: string,
  data: unknown,
  supportTenantID?: string,
): Promise<{ ok: boolean; status: number; body: any; text: string }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${session.accessToken}` };
  if (supportTenantID) headers['X-Support-Tenant-ID'] = supportTenantID;
  const response = await request.put(`${e2eApiURL}${endpoint}`, { headers, data });
  return parseAPIResponse(response);
}

export async function ensureQASchool(request: APIRequestContext, session: AuthSession, spec: QASchoolSpec): Promise<QASchoolState | null> {
  if (!requireMutationGate('School Creation', `crear/reutilizar ${spec.name}`)) return null;

  const existing = await findQASchoolBySlug(request, session, spec.slug);
  if (existing) {
    const state = schoolStateFromRecord(spec, existing);
    saveQASchoolState(state);
    recordResult({
      area: 'School Creation',
      flow: `reutilizar ${spec.name}`,
      status: 'PASS',
      school: spec.name,
      url: `${e2eApiURL}/api/v1/super-admin/schools?search=${spec.slug}`,
      expected: 'Escuela QA existente con slug esperado.',
      actual: `Reutilizada tenant_id=${state.id}; slug=${state.slug}.`,
    });
    return state;
  }

  const adminEmail = `qa.codex.nightly.admin.${spec.key}@example.test`;
  const created = await apiPostJSON(request, session, '/api/v1/super-admin/schools', {
    name: spec.name,
    levels: [spec.level],
    phone: '+52 555 010 0000',
    contact_email: adminEmail,
    address: 'QA Codex E2E, Mexico',
    slug: spec.slug,
    timezone: 'America/Mexico_City',
    admin_email: adminEmail,
    admin_name: `QA Codex ${spec.key}`,
    plan: 'plan-basic',
    premium_modules: [],
    rfc: 'XAXX010101000',
    razon_social: spec.name,
    regimen: '601',
    codigo_postal: '01000',
    school_year: '2026-2027',
    eval_scheme: 'standard',
  });

  if (!created.ok && created.status !== 409) {
    recordResult({
      area: 'School Creation',
      flow: `crear ${spec.name}`,
      status: 'FAIL',
      school: spec.name,
      url: `${e2eApiURL}/api/v1/super-admin/schools`,
      expected: 'Crear escuela QA sin tocar datos reales.',
      actual: `HTTP ${created.status}: ${created.text}`,
      severity: created.status >= 500 ? 'P1' : 'P2',
      recommendation: 'Revisar CreateSchool en produccion/MySQL antes de continuar portales.',
    });
    return null;
  }

  const afterCreate = await findQASchoolBySlug(request, session, spec.slug);
  if (!afterCreate) {
    recordResult({
      area: 'School Creation',
      flow: `validar persistencia ${spec.name}`,
      status: 'FAIL',
      school: spec.name,
      expected: 'La escuela creada aparece en listado Super Admin.',
      actual: `Create returned HTTP ${created.status}, pero no se encontro por slug.`,
      severity: 'P1',
    });
    return null;
  }

  const state = schoolStateFromRecord(spec, afterCreate);
  saveQASchoolState(state);
  appendCreatedQAObject({ type: 'school', id: state.id, name: state.name, slug: state.slug });
  recordResult({
    area: 'School Creation',
    flow: `crear ${spec.name}`,
    status: 'PASS',
    school: spec.name,
    url: `${e2eApiURL}/api/v1/super-admin/schools`,
    expected: 'Escuela QA creada con prefijo y slug controlado.',
    actual: `tenant_id=${state.id}; slug=${state.slug}; plan=plan-basic.`,
  });
  return state;
}

export async function ensureAllQASchools(request: APIRequestContext): Promise<{ session: AuthSession | null; schools: QASchoolState[] }> {
  const session = await apiLoginSuperAdmin(request);
  if (!session) return { session: null, schools: [] };
  const schools: QASchoolState[] = [];
  for (const spec of qaSchoolSpecs) {
    const school = await ensureQASchool(request, session, spec);
    if (school) schools.push(school);
  }
  return { session, schools };
}

export async function validateSchoolModules(request: APIRequestContext, session: AuthSession, school: QASchoolState): Promise<void> {
  const result = await apiGetJSON(request, session, '/api/v1/school-admin/modules/enabled', school.id);
  const modules = extractArray(result.body, ['modules', 'data']);
  const keys = modules.map((item) => String(item.key ?? item.module_key ?? '')).filter(Boolean);
  const missing = school.expectedModules.filter((key) => !keys.includes(key));
  recordResult({
    area: 'Module Entitlements',
    flow: `${school.name}: modulos activos por nivel`,
    status: result.ok && missing.length === 0 ? 'PASS_REAL' : result.ok ? 'PARTIAL' : 'FAIL',
    school: school.name,
    url: `${e2eApiURL}/api/v1/school-admin/modules/enabled`,
    expected: `Modulos esperados: ${school.expectedModules.join(', ')}`,
    actual: result.ok ? `Activos=${keys.join(', ')}; faltantes=${missing.join(', ') || 'ninguno'}` : `HTTP ${result.status}: ${result.text}`,
    severity: result.ok ? (missing.length ? 'P2' : undefined) : 'P1',
  });
}

export async function loadQASchoolsFromState(): Promise<QASchoolState[]> {
  if (!fs.existsSync(qaStatePath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(qaStatePath, 'utf8')) as { schools?: QASchoolState[] };
    return raw.schools ?? [];
  } catch (error) {
    updateProgress('qa-state-recovery', `Ignored corrupt qa-state.json: ${String((error as Error).message)}`, 'skipped');
    return [];
  }
}

export async function ensureCoreDataForSchool(request: APIRequestContext, session: AuthSession, school: QASchoolState): Promise<QACoreState | null> {
  const core: QACoreState = { school, portalCredentials: {} };
  const groups = await apiGetJSON(request, session, '/api/v1/school-admin/academic/groups', school.id);
  const group = extractArray(groups.body, ['groups', 'data'])[0];
  recordResult({
    area: 'School Admin',
    flow: `${school.name}: grupo base disponible`,
    status: groups.ok && Boolean(group?.id) ? 'PASS_REAL' : 'FAIL',
    school: school.name,
    url: `${e2eApiURL}/api/v1/school-admin/academic/groups`,
    expected: 'Grupo base disponible para asignaciones QA.',
    actual: groups.ok ? `groups=${extractArray(groups.body, ['groups', 'data']).length}` : `HTTP ${groups.status}: ${groups.text}`,
    severity: groups.ok && Boolean(group?.id) ? undefined : 'P1',
  });
  if (!groups.ok || !group?.id) return core;
  core.group = group;

  core.teacher = await ensureQATeacher(request, session, school);
  core.student = await ensureQAStudent(request, session, school, group.id);
  const subjects = await apiGetJSON(request, session, '/api/v1/school-admin/academic/subjects', school.id);
  core.subject = extractArray(subjects.body, ['subjects', 'data'])[0];

  if (core.group && (core.teacher?.id || core.student?.id)) {
    const updated = await apiPutJSON(request, session, `/api/v1/school-admin/academic/groups/${core.group.id}`, {
      name: core.group.name ?? 'A',
      grade_level_id: core.group.grade_level_id ?? core.group.grade_id,
      school_year_id: core.group.school_year_id,
      description: core.group.description ?? 'Grupo QA Codex',
      max_students: core.group.max_students ?? core.group.capacity ?? 30,
      teacher_ids: core.teacher?.id ? [core.teacher.id] : [],
      student_ids: core.student?.id ? [core.student.id] : [],
      status: 'active',
      room: core.group.room ?? 'Aula QA',
    }, school.id);
    recordResult({
      area: 'School Admin',
      flow: `${school.name}: asignar profesor/alumno a grupo`,
      status: updated.ok ? 'PASS_REAL' : 'PARTIAL',
      school: school.name,
      url: `${e2eApiURL}/api/v1/school-admin/academic/groups/${core.group.id}`,
      expected: 'Grupo QA queda con profesor y alumno asignados.',
      actual: updated.ok ? 'Asignacion enviada correctamente.' : `HTTP ${updated.status}: ${updated.text}`,
      severity: updated.ok ? undefined : 'P2',
    });
  }

  if (core.teacher?.id) {
    const access = await apiPostJSON(request, session, `/api/v1/school-admin/academic/teachers/${core.teacher.id}/portal-access`, {}, school.id);
    const data = access.body?.data ?? {};
    core.portalCredentials!.teacher = { email: data.email ?? core.teacher.email, password: data.password };
    recordResult({
      area: 'Billing/Credentials',
      flow: `${school.name}: credencial profesor`,
      status: access.ok || access.status === 409 ? 'PASS_REAL' : 'FAIL',
      school: school.name,
      url: `${e2eApiURL}/api/v1/school-admin/academic/teachers/${core.teacher.id}/portal-access`,
      expected: 'Crear o confirmar credencial QA de profesor sin enviar correo.',
      actual: access.ok ? 'Credencial temporal generada en memoria.' : `HTTP ${access.status}: ${access.text}`,
      severity: access.ok || access.status === 409 ? undefined : 'P1',
    });
  }

  if (core.student?.id) {
    const studentAccess = await apiPostJSON(request, session, `/api/v1/school-admin/academic/students/${core.student.id}/portal-access`, {}, school.id);
    const parentAccess = await apiPostJSON(request, session, `/api/v1/school-admin/academic/students/${core.student.id}/parent-portal-access`, {}, school.id);
    core.portalCredentials!.student = { email: studentAccess.body?.data?.email ?? core.student.email, password: studentAccess.body?.data?.password };
    core.portalCredentials!.parent = { email: parentAccess.body?.data?.email, password: parentAccess.body?.data?.password };
    for (const [role, access] of [['student', studentAccess], ['parent', parentAccess]] as const) {
      recordResult({
        area: 'Billing/Credentials',
        flow: `${school.name}: credencial ${role}`,
        status: access.ok || access.status === 409 ? 'PASS_REAL' : 'FAIL',
        school: school.name,
        expected: `Crear o confirmar credencial QA ${role} sin enviar correo.`,
        actual: access.ok ? 'Credencial temporal generada en memoria.' : `HTTP ${access.status}: ${access.text}`,
        severity: access.ok || access.status === 409 ? undefined : 'P1',
      });
    }
  }

  return core;
}

async function parseAPIResponse(response: any): Promise<{ ok: boolean; status: number; body: any; text: string }> {
  const rawText = await response.text().catch(() => '');
  let body: any = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }
  return { ok: response.ok(), status: response.status(), body, text: sanitizeText(rawText) };
}

function extractArray(body: any, keys: string[]): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  for (const key of keys) {
    if (Array.isArray(body?.[key])) return body[key];
    if (Array.isArray(body?.data?.[key])) return body.data[key];
  }
  return [];
}

async function findQASchoolBySlug(request: APIRequestContext, session: AuthSession, slug: string): Promise<Record<string, any> | null> {
  const result = await apiGetJSON(request, session, `/api/v1/super-admin/schools?search=${encodeURIComponent(slug)}&per_page=50`);
  if (!result.ok) return null;
  return extractArray(result.body, ['schools', 'tenants', 'data']).find((school) => school.slug === slug) ?? null;
}

function schoolStateFromRecord(spec: QASchoolSpec, record: Record<string, any>): QASchoolState {
  return {
    ...spec,
    id: String(record.id ?? record.tenant_id ?? record.tenantId ?? ''),
    adminEmail: `qa.codex.admin.${spec.key}@example.test`,
  };
}

function saveQASchoolState(school: QASchoolState): void {
  fs.mkdirSync(reportsDir, { recursive: true });
  let existing: { schools?: QASchoolState[] } = { schools: [] };
  if (fs.existsSync(qaStatePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(qaStatePath, 'utf8')) as { schools?: QASchoolState[] };
    } catch {
      existing = { schools: [] };
    }
  }
  const schools = [...(existing.schools ?? []).filter((item) => item.slug !== school.slug), school]
    .sort((a, b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync(qaStatePath, `${JSON.stringify({ schools }, null, 2)}\n`, 'utf8');
}

async function ensureQATeacher(request: APIRequestContext, session: AuthSession, school: QASchoolState): Promise<Record<string, any> | undefined> {
  const email = `qa.codex.nightly.teacher.${school.key}@example.test`;
  const teachers = await apiGetJSON(request, session, '/api/v1/school-admin/academic/teachers', school.id);
  const existing = extractArray(teachers.body, ['teachers', 'data']).find((teacher) => teacher.email === email);
  if (existing) {
    recordResult({
      area: 'School Admin',
      flow: `${school.name}: reutilizar profesor QA`,
      status: 'PASS_REAL',
      school: school.name,
      expected: 'Profesor QA existente por correo example.test.',
      actual: `teacher_id=${existing.id}`,
    });
    return existing;
  }

  const created = await apiPostJSON(request, session, '/api/v1/school-admin/academic/teachers', {
    first_name: 'QA Codex',
    last_name: 'Teacher',
    email,
    phone: '+52 555 010 1000',
    address: 'QA Codex',
    specialties: ['QA'],
    employee_id: `QA-CODEX-NIGHTLY-${school.key.toUpperCase()}-T001`,
    hire_date: '2026-05-08',
    salary: 0,
    status: 'active',
  }, school.id);
  const teacher = created.body?.data;
  recordResult({
    area: 'School Admin',
    flow: `${school.name}: crear profesor QA`,
    status: created.ok && teacher?.id ? 'PASS_REAL' : 'FAIL',
    school: school.name,
    url: `${e2eApiURL}/api/v1/school-admin/academic/teachers`,
    expected: 'Crear profesor QA con email example.test.',
    actual: created.ok ? `teacher_id=${teacher?.id ?? 'missing'}` : `HTTP ${created.status}: ${created.text}`,
    severity: created.ok && teacher?.id ? undefined : 'P1',
  });
  return teacher;
}

async function ensureQAStudent(request: APIRequestContext, session: AuthSession, school: QASchoolState, groupID: string): Promise<Record<string, any> | undefined> {
  const enrollmentID = `QA-CODEX-NIGHTLY-${school.key.toUpperCase()}-S001`;
  const email = `qa.codex.nightly.student.${school.key}@example.test`;
  const parentEmail = `qa.codex.nightly.parent.${school.key}@example.test`;
  const students = await apiGetJSON(request, session, `/api/v1/school-admin/academic/students?search=${encodeURIComponent(enrollmentID)}&per_page=50`, school.id);
  const existing = extractArray(students.body, ['students', 'data']).find((student) => student.enrollment_id === enrollmentID || student.email === email);
  if (existing) {
    recordResult({
      area: 'School Admin',
      flow: `${school.name}: reutilizar alumno QA`,
      status: 'PASS_REAL',
      school: school.name,
      expected: 'Alumno QA existente por matricula/correo example.test.',
      actual: `student_id=${existing.id}`,
    });
    return existing;
  }

  const created = await apiPostJSON(request, session, '/api/v1/school-admin/academic/students', {
    first_name: 'QA Codex',
    paternal_last_name: 'Student',
    maternal_last_name: school.key,
    last_name: `Student ${school.key}`,
    email,
    phone: '+52 555 010 2000',
    birth_date: '2015-05-08',
    birth_day: '8',
    birth_month: '5',
    birth_year: '2015',
    address: 'QA Codex',
    group_id: groupID,
    parent_name: 'QA Codex Parent',
    parent_email: parentEmail,
    parent_phone: '+52 555 010 3000',
    parents: [{
      first_name: 'QA Codex',
      paternal_last_name: 'Parent',
      maternal_last_name: school.key,
      email: parentEmail,
      phone: '+52 555 010 3000',
      relationship: 'tutor',
      is_primary: true,
      notes: 'QA-CODEX-NIGHTLY automated parent',
    }],
    enrollment_id: enrollmentID,
    status: 'active',
  }, school.id);
  const student = created.body?.data;
  recordResult({
    area: 'School Admin',
    flow: `${school.name}: crear alumno QA`,
    status: created.ok && student?.id ? 'PASS_REAL' : 'FAIL',
    school: school.name,
    url: `${e2eApiURL}/api/v1/school-admin/academic/students`,
    expected: 'Crear alumno QA con padre primario y email example.test.',
    actual: created.ok ? `student_id=${student?.id ?? 'missing'}` : `HTTP ${created.status}: ${created.text}`,
    severity: created.ok && student?.id ? undefined : 'P1',
  });
  return student;
}

export async function expectProtectedAPIRejects(
  request: APIRequestContext,
  endpoint: string,
  role: string,
): Promise<void> {
  const noToken = await probeAPI(request, 'GET', endpoint);
  const badToken = await probeAPI(request, 'GET', endpoint, { token: 'QA-CODEX-NIGHTLY-invalid-token' });
  const leakedHash = /password_hash|bcrypt|\$2[aby]\$/i.test(`${noToken.body}\n${badToken.body}`);
  const accepted = noToken.status < 400 || badToken.status < 400;
  recordResult({
    area: 'Security/RBAC',
    flow: `API protegida ${endpoint}`,
    status: !accepted && !leakedHash ? 'PASS_REAL' : 'FAIL_SECURITY',
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
    status: overflow ? 'FAIL' : 'PASS_REAL',
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
    status: pattern.test(text) ? 'PASS_REAL' : 'FAIL',
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
  const counts = report.results.reduce<Record<string, number>>(
    (acc, result) => {
      acc[result.status] = (acc[result.status] ?? 0) + 1;
      return acc;
    },
    {},
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
    ...Object.keys(counts).sort().map((status) => `| ${status} | ${counts[status]} |`),
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

function isBugStatus(status: AuditStatus): boolean {
  return status === 'FAIL'
    || status === 'FAIL_404'
    || status === 'FAIL_500'
    || status === 'FAIL_BUTTON_DEAD'
    || status === 'FAIL_SECURITY';
}
