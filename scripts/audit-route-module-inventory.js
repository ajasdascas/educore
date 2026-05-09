const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reportDir = path.join(root, 'qa', 'reports');

function walk(dir, filter = () => true, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'out') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filter, acc);
    else if (filter(full)) acc.push(full);
  }
  return acc;
}

function routeFromPage(file) {
  const rel = path.relative(path.join(root, 'frontend', 'app'), file).replace(/\\/g, '/');
  return '/' + rel.replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '').replace(/\/index$/, '').replace(/\/$/, '');
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

const pageFiles = walk(path.join(root, 'frontend', 'app'), (file) => file.endsWith('page.tsx'));
const frontendRoutes = unique(pageFiles.map(routeFromPage).map((route) => route === '/' ? '/' : route));

const sourceFiles = [
  ...walk(path.join(root, 'frontend', 'app'), (file) => /\.(tsx|ts)$/.test(file)),
  ...walk(path.join(root, 'frontend', 'components'), (file) => /\.(tsx|ts)$/.test(file)),
  ...walk(path.join(root, 'frontend', 'lib'), (file) => /\.(tsx|ts)$/.test(file)),
];

const hrefs = [];
const moduleHints = [];
for (const file of sourceFiles) {
  const text = read(file);
  for (const match of text.matchAll(/href\s*=\s*["'`]([^"'`#][^"'`]*)["'`]/g)) hrefs.push(match[1]);
  for (const match of text.matchAll(/(?:moduleKey|key)\s*:\s*["'`]([a-z0-9_/-]+)["'`]/g)) {
    moduleHints.push({ file: path.relative(root, file).replace(/\\/g, '/'), module: match[1] });
  }
}

const backendFiles = [
  ...walk(path.join(root, 'backend', 'cmd'), (file) => file.endsWith('.go')),
  ...walk(path.join(root, 'backend', 'internal'), (file) => file.endsWith('.go')),
];
const endpoints = [];
for (const file of backendFiles) {
  const text = read(file);
  for (const match of text.matchAll(/\.(Get|Post|Put|Patch|Delete)\("([^"]+)"/g)) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      file: path.relative(root, file).replace(/\\/g, '/'),
    });
  }
}

function normalizeHref(href) {
  if (!href.startsWith('/')) return null;
  const clean = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (clean.startsWith('/api/') || clean.startsWith('/_next/')) return null;
  return clean;
}

function routeExists(route) {
  if (frontendRoutes.includes(route)) return true;
  return frontendRoutes.some((candidate) => {
    const pattern = '^' + candidate.replace(/\[[^\]]+\]/g, '[^/]+') + '$';
    return new RegExp(pattern).test(route);
  });
}

const visibleHrefs = unique(hrefs.map(normalizeHref).filter(Boolean));
const routesMissing = visibleHrefs.filter((href) => !routeExists(href));
const routesNotInMenu = frontendRoutes.filter((route) => {
  if (route === '/') return false;
  return !visibleHrefs.some((href) => href === route || routeExists(href));
});

const inventory = {
  generated_at: new Date().toISOString(),
  frontend_routes: frontendRoutes,
  sidebar_hrefs: visibleHrefs,
  modules_detected: unique(moduleHints.map((item) => item.module)),
  module_hints: moduleHints,
  endpoints_found: endpoints,
  endpoints_expected: [
    '/api/v1/auth/login',
    '/api/v1/super-admin/*',
    '/api/v1/school-admin/*',
    '/api/v1/teacher/*',
    '/api/v1/parent/*',
    '/api/v1/student/*',
  ],
  routes_that_do_not_exist: routesMissing,
  routes_that_exist_but_are_not_in_menu: routesNotInMenu,
  visible_routes_returning_404: [],
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'ROUTE_AND_MODULE_INVENTORY.json'), JSON.stringify(inventory, null, 2) + '\n');
console.log(`Inventory written: ${inventory.frontend_routes.length} frontend routes, ${inventory.sidebar_hrefs.length} hrefs, ${inventory.endpoints_found.length} backend route declarations.`);
