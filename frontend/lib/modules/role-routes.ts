/**
 * Central registry of module routes per role.
 * Menus and audit scripts consume this to validate that no active module leads to a 404.
 *
 * Rules:
 * 1. Every sidebar href must have a matching entry here.
 * 2. Every entry here must have a physical page.tsx file.
 * 3. The audit script `scripts/check-module-pages-exist.js` enforces both rules.
 */
export const MODULE_ROLE_ROUTES = {
  school_admin: {
    // ── Kinder / Guardería ──────────────────────────────────────────────────
    daily_logs:             "/school-admin/daily-logs",
    child_status:           "/school-admin/kinder/child-status",
    meals:                  "/school-admin/meals",
    naps:                   "/school-admin/naps",
    diapers:                "/school-admin/kinder/diapers",
    mood:                   "/school-admin/kinder/mood",
    health_checks:          "/school-admin/health",
    incidents:              "/school-admin/incidents",
    pickup_authorizations:  "/school-admin/pickup",
    milestones:             "/school-admin/milestones",
    photos_evidence:        "/school-admin/photos",
    // ── Preescolar ──────────────────────────────────────────────────────────
    qualitative_assessments: "/school-admin/qualitative",
    development_areas:       "/school-admin/development",
    observations:            "/school-admin/observations",
    activities:              "/school-admin/activities",
    behavior_notes:          "/school-admin/preschool/behavior-notes",
    preschool_report_cards:  "/school-admin/preschool-report-cards",
    socioemotional:          "/school-admin/preschool/socioemotional",
    // ── Primaria ────────────────────────────────────────────────────────────
    subjects:                "/school-admin/primary/subjects",
    assignments:             "/school-admin/primary/assignments",
    exams:                   "/school-admin/primary/exams",
    discipline:              "/school-admin/primary/discipline",
    classroom:               "/school-admin/primary/classroom",
    primary_report_cards:    "/school-admin/primary/report-cards",
    primary_grades:          "/school-admin/primary/grades",
    // ── Servicios ───────────────────────────────────────────────────────────
    cafeteria_service:       "/school-admin/services/cafeteria",
    transport_service:       "/school-admin/services/transport",
  },

  teacher: {
    // ── Kinder / Guardería ──────────────────────────────────────────────────
    daily_logs:              "/teacher/kinder/daily-logs",
    child_status:            "/teacher/kinder/child-status",
    meals:                   "/teacher/kinder/meals",
    naps:                    "/teacher/kinder/naps",
    diapers:                 "/teacher/kinder/diapers",
    mood:                    "/teacher/kinder/mood",
    health_checks:           "/teacher/kinder/health-checks",
    incidents:               "/teacher/kinder/incidents",
    pickup_authorizations:   "/teacher/kinder/pickup-authorizations",
    milestones:              "/teacher/kinder/milestones",
    photos_evidence:         "/teacher/kinder/photos-evidence",
    // ── Preescolar ──────────────────────────────────────────────────────────
    qualitative_assessments: "/teacher/preschool/qualitative-assessments",
    development_areas:       "/teacher/preschool/development-areas",
    observations:            "/teacher/preschool/observations",
    activities:              "/teacher/preschool/activities",
    behavior_notes:          "/teacher/preschool/behavior-notes",
    preschool_report_cards:  "/teacher/preschool/report-cards",
    socioemotional:          "/teacher/preschool/socioemotional",
    // ── Primaria ────────────────────────────────────────────────────────────
    subjects:                "/teacher/primary/subjects",
    assignments:             "/teacher/primary/assignments",
    exams:                   "/teacher/primary/exams",
    discipline:              "/teacher/primary/discipline",
    classroom:               "/teacher/primary/classroom",
    primary_report_cards:    "/teacher/primary/report-cards",
    primary_grades:          "/teacher/primary/grades",
    // ── Servicios ───────────────────────────────────────────────────────────
    cafeteria_service:       "/teacher/services/cafeteria",
    transport_service:       "/teacher/services/transport",
  },

  parent: {
    // ── Kinder (flat existing routes) ───────────────────────────────────────
    daily_logs:              "/parent/daily-logs",
    meals:                   "/parent/meals",
    naps:                    "/parent/naps",
    diapers:                 "/parent/diapers",
    mood:                    "/parent/mood",
    incidents:               "/parent/incidents",
    // ── Kinder (nested new routes) ──────────────────────────────────────────
    child_status:            "/parent/kinder/child-status",
    health_checks:           "/parent/kinder/health-checks",
    pickup_authorizations:   "/parent/kinder/pickup-authorizations",
    milestones:              "/parent/kinder/milestones",
    photos_evidence:         "/parent/kinder/photos-evidence",
    // ── Preescolar ──────────────────────────────────────────────────────────
    qualitative_assessments: "/parent/preschool/qualitative-assessments",
    development_areas:       "/parent/preschool/development-areas",
    observations:            "/parent/preschool/observations",
    activities:              "/parent/preschool/activities",
    behavior_notes:          "/parent/preschool/behavior-notes",
    preschool_report_cards:  "/parent/preschool/report-cards",
    socioemotional:          "/parent/preschool/socioemotional",
    evidence:                "/parent/preschool/evidence",
    // ── Primaria ────────────────────────────────────────────────────────────
    subjects:                "/parent/primary/subjects",
    assignments:             "/parent/primary/assignments",
    exams:                   "/parent/primary/exams",
    primary_report_cards:    "/parent/primary/report-cards",
    primary_grades:          "/parent/primary/grades",
    // ── Servicios ───────────────────────────────────────────────────────────
    cafeteria_service:       "/parent/services/cafeteria",
    transport_service:       "/parent/services/transport",
  },

  student: {
    // ── Flat existing ────────────────────────────────────────────────────────
    qualitative_assessments: "/student/qualitative-assessments",
    development_areas:       "/student/development-areas",
    observations:            "/student/observations",
    evidence:                "/student/evidence",
    assignments:             "/student/assignments",
    // ── Preescolar ──────────────────────────────────────────────────────────
    activities:              "/student/preschool/activities",
    // ── Primaria ────────────────────────────────────────────────────────────
    primary_assignments:     "/student/primary/assignments",
    exams:                   "/student/primary/exams",
    subjects:                "/student/primary/subjects",
    primary_grades:          "/student/primary/grades",
    // ── Servicios ───────────────────────────────────────────────────────────
    cafeteria_service:       "/student/services/cafeteria",
    transport_service:       "/student/services/transport",
  },
} as const;

export type Role = keyof typeof MODULE_ROLE_ROUTES;
export type RoleRouteMap = typeof MODULE_ROLE_ROUTES;

/** Returns the route for a moduleKey + role, or undefined if not mapped. */
export function getModuleRoute(role: Role, moduleKey: string): string | undefined {
  return (MODULE_ROLE_ROUTES[role] as Record<string, string>)[moduleKey];
}
