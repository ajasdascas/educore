#!/usr/bin/env node
/**
 * QA audit: notifications mark-as-read + teacher announcements
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

let failed = 0;

function read(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function section(title) { console.log(`\n== ${title} ==`); }
function pass(msg) { console.log(`  PASS ${msg}`); }
function fail(msg) { console.log(`  FAIL ${msg}`); failed++; }
function check(condition, ok, bad) { condition ? pass(ok) : fail(bad); }

// ─── Teacher backend ─────────────────────────────────────────────────────────
section("Backend: teacher notifications + announcements");

const tHandler = read("backend/internal/modules/teacher/handler.go");
check(tHandler.includes("MarkNotificationRead"),      "teacher MarkNotificationRead handler exists",         "teacher MarkNotificationRead handler missing");
check(tHandler.includes(`"/notifications/:id/read"`), "teacher PUT /notifications/:id/read route registered","teacher mark-read route missing");
check(tHandler.includes("GetAnnouncements"),          "teacher GetAnnouncements handler exists",             "teacher GetAnnouncements handler missing");
check(tHandler.includes("CreateAnnouncement"),        "teacher CreateAnnouncement handler exists",           "teacher CreateAnnouncement handler missing");
check(tHandler.includes(`"/announcements"`),          "teacher /announcements route registered",             "teacher /announcements route missing");

const tRepo = read("backend/internal/modules/teacher/repository.go");
check(tRepo.includes("MarkNotificationRead"),   "teacher repo MarkNotificationRead exists",   "teacher repo MarkNotificationRead missing");
check(tRepo.includes("GetAnnouncements"),       "teacher repo GetAnnouncements exists",       "teacher repo GetAnnouncements missing");
check(tRepo.includes("CreateAnnouncement"),     "teacher repo CreateAnnouncement exists",     "teacher repo CreateAnnouncement missing");
check(tRepo.includes("is_read = TRUE"),         "teacher mark-read sets is_read TRUE",        "teacher mark-read missing is_read=TRUE");
check(tRepo.includes("'published'"),            "teacher CreateAnnouncement sets published",  "teacher CreateAnnouncement status not set");

const tSvc = read("backend/internal/modules/teacher/service.go");
check(tSvc.includes("MarkNotificationRead"), "teacher service MarkNotificationRead exists", "teacher service MarkNotificationRead missing");
check(tSvc.includes("GetAnnouncements"),     "teacher service GetAnnouncements exists",     "teacher service GetAnnouncements missing");
check(tSvc.includes("CreateAnnouncement"),   "teacher service CreateAnnouncement exists",   "teacher service CreateAnnouncement missing");

const tTypes = read("backend/internal/modules/teacher/types.go");
check(tTypes.includes("AnnouncementSummary"),         "teacher AnnouncementSummary type exists",         "teacher AnnouncementSummary type missing");
check(tTypes.includes("CreateAnnouncementRequest"),   "teacher CreateAnnouncementRequest type exists",   "teacher CreateAnnouncementRequest type missing");

// ─── Student backend ─────────────────────────────────────────────────────────
section("Backend: student notifications mark-as-read");

const sHandler = read("backend/internal/modules/student/handler.go");
check(sHandler.includes("MarkNotificationRead"),      "student MarkNotificationRead handler exists",         "student MarkNotificationRead handler missing");
check(sHandler.includes(`"/notifications/:id/read"`), "student PUT /notifications/:id/read route registered","student mark-read route missing");

const sRepo = read("backend/internal/modules/student/repository.go");
check(sRepo.includes("MarkNotificationRead"), "student repo MarkNotificationRead exists", "student repo MarkNotificationRead missing");
check(sRepo.includes("is_read = TRUE"),       "student mark-read sets is_read TRUE",      "student mark-read missing is_read=TRUE");

// ─── Parent backend (pre-existing check) ─────────────────────────────────────
section("Backend: parent notifications mark-as-read (pre-existing)");

const pHandler = read("backend/internal/modules/parent/handler.go");
check(pHandler.includes("MarkNotificationRead"),          "parent MarkNotificationRead handler exists",          "parent MarkNotificationRead handler missing");
check(pHandler.includes(`"/notifications/:id/read"`),     "parent PUT /notifications/:id/read registered",       "parent mark-read route missing");

// ─── Frontend: teacher notifications page ────────────────────────────────────
section("Frontend: teacher notifications page");

const tPage = read("frontend/app/teacher/notifications/page.tsx");
check(tPage.includes(`tab === "received"`),                            "teacher page has Recibidas tab",                 "teacher page missing Recibidas tab");
check(tPage.includes(`tab === "sent"`),                                "teacher page has Avisos enviados tab",           "teacher page missing Avisos enviados tab");
check(tPage.includes(`tab === "create"`),                              "teacher page has Crear aviso tab",               "teacher page missing Crear aviso tab");
check(tPage.includes("/api/v1/teacher/notifications"),                 "teacher page fetches notifications endpoint",    "teacher page missing notifications fetch");
check(tPage.includes("/api/v1/teacher/announcements"),                 "teacher page fetches announcements endpoint",    "teacher page missing announcements fetch");
check(tPage.includes("/api/v1/teacher/notifications/") && tPage.includes("/read"),  "teacher page calls mark-read endpoint",  "teacher page missing mark-read call");
check(tPage.includes(`method: "PUT"`),                                 "teacher page uses PUT for mark-read",            "teacher page missing PUT method");
check(tPage.includes(`method: "POST"`),                                "teacher page uses POST to create announcement",  "teacher page missing POST for create");
check(tPage.includes("Marcar todo como leído"),                        "teacher page has mark-all-read button",          "teacher page missing mark-all-read");
check(tPage.includes("Publicar aviso"),                                "teacher page has publish button",                "teacher page missing publish button");

// ─── Frontend: parent notifications page ─────────────────────────────────────
section("Frontend: parent notifications page");

const pPage = read("frontend/app/parent/notifications/page.tsx");
check(pPage.includes("/api/v1/parent/notifications"),                  "parent page fetches notifications endpoint",  "parent page missing notifications fetch");
check(pPage.includes("/api/v1/parent/notifications/") && pPage.includes("/read"),  "parent page calls mark-read endpoint", "parent page missing mark-read call");
check(pPage.includes(`method: "PUT"`),                                 "parent page uses PUT for mark-read",          "parent page missing PUT method");
check(pPage.includes("Marcar todo como leído"),                        "parent page has mark-all-read button",        "parent page missing mark-all-read");
check(pPage.includes("unreadCount"),                                   "parent page tracks unread count",             "parent page missing unread count");

// ─── Frontend: student notifications page ────────────────────────────────────
section("Frontend: student notifications page");

const sPage = read("frontend/app/student/notifications/page.tsx");
check(sPage.includes("/api/v1/student/notifications"),                  "student page fetches notifications endpoint",  "student page missing notifications fetch");
check(sPage.includes("/api/v1/student/notifications/") && sPage.includes("/read"),  "student page calls mark-read endpoint", "student page missing mark-read call");
check(sPage.includes(`method: "PUT"`),                                  "student page uses PUT for mark-read",          "student page missing PUT method");
check(sPage.includes("Marcar todo como leído"),                         "student page has mark-all-read button",        "student page missing mark-all-read");
check(sPage.includes("unreadCount"),                                    "student page tracks unread count",             "student page missing unread count");

// ─── Frontend: teacher layout sidebar ────────────────────────────────────────
section("Frontend: teacher layout sidebar");

const tLayout = read("frontend/app/teacher/layout.tsx");
check(tLayout.includes("Megaphone"),                                   "teacher layout uses Megaphone icon for Avisos",  "teacher layout missing Megaphone icon");
check(tLayout.includes(`label: "Avisos"`),                             "teacher sidebar item renamed to Avisos",         "teacher sidebar still says Notificaciones");
check(tLayout.includes("Seguridad") && tLayout.includes("/teacher/security"), "teacher layout includes Seguridad link",  "teacher layout missing Seguridad nav item");

// ─── Frontend: parent layout sidebar ─────────────────────────────────────────
section("Frontend: parent layout sidebar");

const pLayout = read("frontend/app/parent/layout.tsx");
check(pLayout.includes(`"Mi Perfil"`) && pLayout.includes("/parent/profile"), "parent layout includes Mi Perfil link", "parent layout missing Mi Perfil nav item");

// ─── MySQL safety ────────────────────────────────────────────────────────────
section("MySQL safety: no RETURNING in new notification code");

// Check CreateAnnouncement specifically does not use RETURNING
const createAnnBlock = tRepo.split("func (r *Repository) CreateAnnouncement")[1] || "";
const nextFuncAnn = createAnnBlock.indexOf("\nfunc ");
const createAnnBody = nextFuncAnn > 0 ? createAnnBlock.slice(0, nextFuncAnn) : createAnnBlock.slice(0, 600);
check(!createAnnBody.includes("RETURNING"),  "CreateAnnouncement does not use RETURNING (MySQL-safe)",  "CreateAnnouncement still uses RETURNING — MySQL-unsafe!");
check(!sRepo.includes("RETURNING"), "student/repository.go has no RETURNING clause", "student/repository.go uses RETURNING — MySQL-unsafe!");
check(tRepo.includes("database.NewID()"), "teacher CreateAnnouncement uses database.NewID() to avoid RETURNING", "teacher CreateAnnouncement does not use database.NewID()");

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
if (failed === 0) {
  console.log("All notifications/announcements checks passed.");
} else {
  console.log(`${failed} check(s) failed.`);
  process.exit(1);
}
