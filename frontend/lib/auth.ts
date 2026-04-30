import { API_URL, isNgrok } from "./api";

export interface User {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT";
  tenant_id: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthTokens {
  access_token: string;
  expires_in: number;
}

// --- Token management ---

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User) {
  localStorage.setItem("access_token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// --- API with auth ---

export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // --- DEMO INTERCEPTOR ---
  if (token && token.startsWith("mock-")) {
    return mockDemoFetch(endpoint, options);
  }
  // ------------------------

  if (isNgrok()) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401, try refresh
  if (res.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      const retryRes = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
      return retryRes.json();
    } else {
      clearAuth();
      if (typeof window !== "undefined") {
        const basePath = window.location.pathname.startsWith("/educore") ? "/educore" : "";
        window.location.href = basePath || "/";
      }
      throw new Error("Session expired");
    }
  }

  return res.json();
}

const nowIso = () => new Date().toISOString();

const defaultMockSchools = [
  {
    id: "school-don-bosco",
    name: "Instituto Tecnologico Don Bosco",
    slug: "don-bosco",
    status: "active",
    plan: "professional",
    logo_url: "",
    created_at: "2026-04-20T10:00:00.000Z",
    updated_at: "2026-04-28T10:00:00.000Z",
    total_students: 248,
    total_users: 34,
    total_teachers: 22,
    total_parents: 226,
  },
  {
    id: "school-san-miguel",
    name: "Colegio San Miguel",
    slug: "san-miguel",
    status: "trial",
    plan: "basic",
    logo_url: "",
    created_at: "2026-04-22T12:00:00.000Z",
    updated_at: "2026-04-28T12:00:00.000Z",
    total_students: 86,
    total_users: 14,
    total_teachers: 9,
    total_parents: 72,
  },
  {
    id: "school-la-paz",
    name: "Escuela Primaria La Paz",
    slug: "la-paz",
    status: "suspended",
    plan: "enterprise",
    logo_url: "",
    created_at: "2026-04-24T09:30:00.000Z",
    updated_at: "2026-04-28T09:30:00.000Z",
    total_students: 412,
    total_users: 58,
    total_teachers: 31,
    total_parents: 379,
  },
];

const defaultMockPlans = [
  {
    id: "basic",
    name: "Basico",
    description: "Para escuelas pequenas que inician su digitalizacion.",
    price_monthly: 899,
    price_annual: 8990,
    currency: "MXN",
    max_students: 120,
    max_teachers: 12,
    modules: JSON.stringify(["auth", "users", "academic_core", "grading"]),
    features: JSON.stringify(["Auth + RBAC", "Usuarios y alumnos", "Nucleo academico", "Calificaciones base", "Soporte por email"]),
    is_active: true,
    is_featured: false,
    created_at: "2026-04-20T08:00:00.000Z",
  },
  {
    id: "professional",
    name: "Profesional",
    description: "Para colegios en crecimiento con operacion academica completa.",
    price_monthly: 1899,
    price_annual: 18990,
    currency: "MXN",
    max_students: 500,
    max_teachers: 45,
    modules: JSON.stringify(["auth", "users", "academic_core", "grading", "schedules", "attendance", "documents", "report_cards", "communications", "parent_portal", "teacher_portal"]),
    features: JSON.stringify(["Todo Basic", "Asistencia rapida", "Horarios", "Boletas", "Expedientes digitales", "Portal de padres"]),
    is_active: true,
    is_featured: true,
    created_at: "2026-04-20T08:00:00.000Z",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para instituciones multi-campus con necesidades avanzadas.",
    price_monthly: 3499,
    price_annual: 34990,
    currency: "MXN",
    max_students: 0,
    max_teachers: 0,
    modules: JSON.stringify(["auth", "users", "academic_core", "grading", "schedules", "attendance", "documents", "report_cards", "communications", "parent_portal", "teacher_portal", "payments", "qr_access", "credentials", "workshops", "analytics"]),
    features: JSON.stringify(["Alumnos ilimitados", "Todos los modulos vendibles", "SLA empresarial", "Integraciones a medida", "Acompanamiento dedicado"]),
    is_active: true,
    is_featured: false,
    created_at: "2026-04-20T08:00:00.000Z",
  },
];

const defaultMockUsers = [
  {
    id: "user-admin-1",
    email: "admin@educore.mx",
    first_name: "Giovanni",
    last_name: "SuperAdmin",
    role: "SUPER_ADMIN",
    is_active: true,
    created_at: "2026-04-20T08:00:00.000Z",
    updated_at: "2026-04-28T08:00:00.000Z",
  },
  {
    id: "user-ops-1",
    email: "operaciones@educore.mx",
    first_name: "Equipo",
    last_name: "Operaciones",
    role: "SUPER_ADMIN",
    is_active: true,
    created_at: "2026-04-21T08:00:00.000Z",
    updated_at: "2026-04-28T08:00:00.000Z",
  },
];

const defaultMockTeachers = [
  {
    id: "teacher-maria-lopez",
    first_name: "Maria",
    last_name: "Lopez",
    email: "maria.lopez@donbosco.mx",
    phone: "777 101 2201",
    employee_id: "PROF-001",
    status: "active",
    specialties: ["Matematicas", "Fisica"],
    group_count: 3,
    hire_date: "2023-08-15",
    created_at: "2023-08-15T09:00:00.000Z",
    address: "Jiutepec, Morelos",
    salary: 18500,
  },
  {
    id: "teacher-carlos-rivera",
    first_name: "Carlos",
    last_name: "Rivera",
    email: "carlos.rivera@donbosco.mx",
    phone: "777 101 2202",
    employee_id: "PROF-002",
    status: "active",
    specialties: ["Historia", "Civismo"],
    group_count: 2,
    hire_date: "2022-01-10",
    created_at: "2022-01-10T09:00:00.000Z",
    address: "Cuernavaca, Morelos",
    salary: 17200,
  },
  {
    id: "teacher-ana-martinez",
    first_name: "Ana",
    last_name: "Martinez",
    email: "ana.martinez@donbosco.mx",
    phone: "777 101 2203",
    employee_id: "PROF-003",
    status: "inactive",
    specialties: ["Ingles"],
    group_count: 1,
    hire_date: "2024-03-04",
    created_at: "2024-03-04T09:00:00.000Z",
    address: "Emiliano Zapata, Morelos",
    salary: 15800,
  },
];

const defaultMockStudents = [
  {
    id: "student-juan-perez",
    first_name: "Juan",
    last_name: "Perez",
    email: "",
    phone: "",
    enrollment_id: "ALU-2026-001",
    status: "active",
    group_id: "group-1a",
    group_name: "1A",
    grade_name: "Primero",
    parent_name: "Laura Perez",
    parent_email: "laura.perez@familia.mx",
    parent_phone: "777 210 1101",
    birth_date: "2018-05-12",
    address: "Jiutepec, Morelos",
    attendance_rate: 96,
    average_grade: 91,
    total_absences: 1,
    created_at: "2026-01-10T09:00:00.000Z",
    updated_at: "2026-04-28T09:00:00.000Z",
  },
  {
    id: "student-sofia-garcia",
    first_name: "Sofia",
    last_name: "Garcia",
    email: "",
    phone: "",
    enrollment_id: "ALU-2026-002",
    status: "active",
    group_id: "group-2b",
    group_name: "2B",
    grade_name: "Segundo",
    parent_name: "Marco Garcia",
    parent_email: "marco.garcia@familia.mx",
    parent_phone: "777 210 1102",
    birth_date: "2017-09-21",
    address: "Cuernavaca, Morelos",
    attendance_rate: 93,
    average_grade: 88,
    total_absences: 2,
    created_at: "2026-01-11T09:00:00.000Z",
    updated_at: "2026-04-28T09:00:00.000Z",
  },
  {
    id: "student-diego-ramirez",
    first_name: "Diego",
    last_name: "Ramirez",
    email: "",
    phone: "",
    enrollment_id: "ALU-2026-003",
    status: "inactive",
    group_id: "group-3a",
    group_name: "3A",
    grade_name: "Tercero",
    parent_name: "Paola Ramirez",
    parent_email: "paola.ramirez@familia.mx",
    parent_phone: "777 210 1103",
    birth_date: "2016-02-18",
    address: "Emiliano Zapata, Morelos",
    attendance_rate: 81,
    average_grade: 79,
    total_absences: 6,
    created_at: "2026-01-12T09:00:00.000Z",
    updated_at: "2026-04-28T09:00:00.000Z",
  },
];

const defaultMockSchoolYears = [
  {
    id: "year-2025-2026",
    name: "Ciclo 2025-2026",
    start_date: "2025-08-25",
    end_date: "2026-07-10",
    status: "active",
    is_current: true,
    notes: "Ciclo escolar actual.",
    group_count: 4,
    student_count: 71,
    created_at: "2025-08-01T09:00:00.000Z",
    updated_at: "2026-04-29T09:00:00.000Z",
  },
  {
    id: "year-2024-2025",
    name: "Ciclo 2024-2025",
    start_date: "2024-08-26",
    end_date: "2025-07-11",
    status: "closed",
    is_current: false,
    notes: "Ciclo cerrado y disponible para historial.",
    group_count: 3,
    student_count: 64,
    created_at: "2024-08-01T09:00:00.000Z",
    updated_at: "2025-07-11T14:00:00.000Z",
  },
  {
    id: "year-2023-2024",
    name: "Ciclo 2023-2024",
    start_date: "2023-08-28",
    end_date: "2024-07-12",
    status: "archived",
    is_current: false,
    notes: "Archivado para consulta historica.",
    group_count: 3,
    student_count: 59,
    created_at: "2023-08-01T09:00:00.000Z",
    updated_at: "2024-07-12T14:00:00.000Z",
  },
];

const defaultMockSubjects = [
  { id: "subject-math", name: "Matematicas", code: "MAT", description: "Pensamiento matematico, algebra basica y resolucion de problemas.", credits: 5, grade_level_id: "", grade_name: "Todos", status: "active", teacher_count: 1, student_count: 71, created_at: "2025-08-01T09:00:00.000Z" },
  { id: "subject-reading", name: "Lectura", code: "LEC", description: "Comprension lectora, fluidez y expresion oral.", credits: 4, grade_level_id: "", grade_name: "Todos", status: "active", teacher_count: 1, student_count: 50, created_at: "2025-08-01T09:00:00.000Z" },
  { id: "subject-spanish", name: "Espanol", code: "ESP", description: "Lenguaje, escritura y comunicacion.", credits: 5, grade_level_id: "", grade_name: "Todos", status: "active", teacher_count: 1, student_count: 71, created_at: "2025-08-01T09:00:00.000Z" },
  { id: "subject-science", name: "Ciencias", code: "CIE", description: "Exploracion natural, laboratorio y pensamiento cientifico.", credits: 4, grade_level_id: "", grade_name: "Todos", status: "active", teacher_count: 1, student_count: 47, created_at: "2025-08-01T09:00:00.000Z" },
  { id: "subject-history", name: "Historia", code: "HIS", description: "Historia de Mexico, civismo y contexto social.", credits: 3, grade_level_id: "", grade_name: "Todos", status: "active", teacher_count: 1, student_count: 24, created_at: "2025-08-01T09:00:00.000Z" },
  { id: "subject-english", name: "Ingles", code: "ING", description: "Vocabulario, lectura y conversacion.", credits: 4, grade_level_id: "", grade_name: "Todos", status: "active", teacher_count: 1, student_count: 21, created_at: "2025-08-01T09:00:00.000Z" },
  { id: "subject-art", name: "Arte", code: "ART", description: "Expresion artistica y apreciacion cultural.", credits: 2, grade_level_id: "", grade_name: "Todos", status: "active", teacher_count: 0, student_count: 0, created_at: "2025-08-01T09:00:00.000Z" },
  { id: "subject-pe", name: "Educacion fisica", code: "EDF", description: "Desarrollo motriz, salud y trabajo en equipo.", credits: 2, grade_level_id: "", grade_name: "Todos", status: "active", teacher_count: 0, student_count: 0, created_at: "2025-08-01T09:00:00.000Z" },
];

const mockSchoolGroups = [
  {
    id: "group-1a",
    name: "1A",
    grade_level_id: "grade-1",
    grade_name: "Primero",
    school_year_id: "year-2025-2026",
    school_year: "Ciclo 2025-2026",
    generation: "Generacion 2031",
    teacher_id: "teacher-maria-lopez",
    teacher_name: "Maria Lopez",
    teacher_ids: ["teacher-maria-lopez"],
    subject_ids: ["subject-math", "subject-reading", "subject-spanish", "subject-science"],
    student_count: 26,
    max_students: 30,
    room: "A-101",
    schedule: "Lun-Vie 08:00-13:30",
    status: "active",
    description: "Grupo base de primer grado.",
    created_at: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "group-2b",
    name: "2B",
    grade_level_id: "grade-2",
    grade_name: "Segundo",
    school_year_id: "year-2025-2026",
    school_year: "Ciclo 2025-2026",
    generation: "Generacion 2030",
    teacher_id: "teacher-carlos-rivera",
    teacher_name: "Carlos Rivera",
    teacher_ids: ["teacher-carlos-rivera"],
    subject_ids: ["subject-math", "subject-spanish", "subject-history", "subject-science"],
    student_count: 24,
    max_students: 30,
    room: "B-204",
    schedule: "Lun-Vie 08:00-13:30",
    status: "active",
    description: "Grupo con enfoque en lectura y civismo.",
    created_at: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "group-3a",
    name: "3A",
    grade_level_id: "grade-3",
    grade_name: "Tercero",
    school_year_id: "year-2025-2026",
    school_year: "Ciclo 2025-2026",
    generation: "Generacion 2029",
    teacher_id: "teacher-ana-martinez",
    teacher_name: "Ana Martinez",
    teacher_ids: ["teacher-ana-martinez"],
    subject_ids: ["subject-english", "subject-spanish", "subject-math"],
    student_count: 21,
    max_students: 28,
    room: "C-301",
    schedule: "Lun-Vie 08:00-13:30",
    status: "inactive",
    description: "Grupo temporalmente pausado.",
    created_at: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "group-4a",
    name: "4A",
    grade_level_id: "grade-4",
    grade_name: "Cuarto",
    school_year_id: "year-2025-2026",
    school_year: "Ciclo 2025-2026",
    generation: "Generacion 2028",
    teacher_id: "",
    teacher_name: "",
    teacher_ids: [],
    subject_ids: ["subject-math", "subject-spanish", "subject-science"],
    student_count: 0,
    max_students: 30,
    room: "D-401",
    schedule: "Lun-Vie 08:00-13:30",
    status: "active",
    description: "Grupo listo para asignacion.",
    created_at: "2026-01-10T09:00:00.000Z",
  },
];

const defaultMockScheduleBlocks = [
  {
    id: "schedule-math-1a-mon",
    group_id: "group-1a",
    group_name: "1A",
    grade_name: "Primero",
    teacher_id: "teacher-maria-lopez",
    teacher_name: "Maria Lopez",
    subject_id: "subject-math",
    subject: "Matematicas",
    day: "monday",
    start_time: "08:00",
    end_time: "08:50",
    room: "A-101",
    status: "active",
    notes: "Bloque de inicio para calculo mental.",
    created_at: "2026-01-10T09:00:00.000Z",
    updated_at: "2026-04-29T09:00:00.000Z",
  },
  {
    id: "schedule-reading-1a-mon",
    group_id: "group-1a",
    group_name: "1A",
    grade_name: "Primero",
    teacher_id: "teacher-maria-lopez",
    teacher_name: "Maria Lopez",
    subject_id: "subject-reading",
    subject: "Lectura",
    day: "monday",
    start_time: "09:00",
    end_time: "09:50",
    room: "A-101",
    status: "active",
    notes: "Comprension lectora guiada.",
    created_at: "2026-01-10T09:00:00.000Z",
    updated_at: "2026-04-29T09:00:00.000Z",
  },
  {
    id: "schedule-history-2b-tue",
    group_id: "group-2b",
    group_name: "2B",
    grade_name: "Segundo",
    teacher_id: "teacher-carlos-rivera",
    teacher_name: "Carlos Rivera",
    subject_id: "subject-history",
    subject: "Historia",
    day: "tuesday",
    start_time: "10:00",
    end_time: "10:50",
    room: "B-204",
    status: "active",
    notes: "Linea del tiempo del periodo.",
    created_at: "2026-01-10T09:00:00.000Z",
    updated_at: "2026-04-29T09:00:00.000Z",
  },
  {
    id: "schedule-english-3a-wed",
    group_id: "group-3a",
    group_name: "3A",
    grade_name: "Tercero",
    teacher_id: "teacher-ana-martinez",
    teacher_name: "Ana Martinez",
    subject_id: "subject-english",
    subject: "Ingles",
    day: "wednesday",
    start_time: "11:00",
    end_time: "11:50",
    room: "C-301",
    status: "inactive",
    notes: "Bloque pausado por grupo inactivo.",
    created_at: "2026-01-10T09:00:00.000Z",
    updated_at: "2026-04-29T09:00:00.000Z",
  },
];

const defaultMockReports = [
  {
    id: "report-attendance-week",
    name: "Asistencia semanal - Primaria",
    type: "attendance",
    status: "completed",
    format: "pdf",
    group_id: "all",
    group_name: "Todos los grupos",
    start_date: "2026-04-22",
    end_date: "2026-04-29",
    generated_by: "Direccion",
    created_at: "2026-04-29T08:00:00.000Z",
    completed_at: "2026-04-29T08:01:00.000Z",
    summary: {
      attendance_rate: 94,
      average_grade: 88,
      total_students: 245,
      risk_students: 7,
      generated_files: 1,
    },
    insights: [
      "La asistencia subio 2 puntos contra la semana anterior.",
      "Segundo B mantiene el mejor promedio de puntualidad.",
      "7 estudiantes requieren seguimiento por ausencias acumuladas.",
    ],
  },
  {
    id: "report-grades-month",
    name: "Calificaciones mensuales",
    type: "grades",
    status: "completed",
    format: "excel",
    group_id: "all",
    group_name: "Todos los grupos",
    start_date: "2026-04-01",
    end_date: "2026-04-29",
    generated_by: "Coordinacion academica",
    created_at: "2026-04-28T15:30:00.000Z",
    completed_at: "2026-04-28T15:31:00.000Z",
    summary: {
      attendance_rate: 92,
      average_grade: 87,
      total_students: 245,
      risk_students: 12,
      generated_files: 1,
    },
    insights: [
      "Matematicas concentra la mayor dispersion de calificaciones.",
      "El promedio general se mantiene en rango saludable.",
      "Tercero A necesita refuerzo academico en Ingles.",
    ],
  },
  {
    id: "report-academic-summary",
    name: "Resumen academico directivo",
    type: "academic_summary",
    status: "scheduled",
    format: "pdf",
    group_id: "all",
    group_name: "Todos los grupos",
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    generated_by: "Direccion",
    created_at: "2026-04-27T10:00:00.000Z",
    completed_at: "",
    summary: {
      attendance_rate: 92,
      average_grade: 87,
      total_students: 245,
      risk_students: 9,
      generated_files: 0,
    },
    insights: [
      "Programado para cierre mensual.",
      "Incluye asistencia, calificaciones y alertas por grupo.",
    ],
  },
];

const defaultMockCommunications = [
  {
    id: "comm-welcome-parents",
    title: "Bienvenida al ciclo escolar",
    content: "Estimadas familias, les damos la bienvenida al nuevo ciclo escolar. En esta semana compartiremos horarios, lineamientos y canales oficiales.",
    type: "announcement",
    priority: "normal",
    status: "sent",
    recipient_type: "role",
    recipient_id: "parents",
    recipient_label: "Padres de familia",
    channels: ["email", "push"],
    total_recipients: 226,
    delivered_count: 221,
    read_count: 168,
    created_at: "2026-04-29T08:30:00.000Z",
    scheduled_for: "",
    sent_at: "2026-04-29T08:31:00.000Z",
  },
  {
    id: "comm-teachers-meeting",
    title: "Reunion de consejo tecnico",
    content: "Recordatorio: el viernes tendremos reunion de consejo tecnico a las 15:00 en sala de maestros.",
    type: "message",
    priority: "high",
    status: "sent",
    recipient_type: "role",
    recipient_id: "teachers",
    recipient_label: "Profesores",
    channels: ["email"],
    total_recipients: 18,
    delivered_count: 18,
    read_count: 14,
    created_at: "2026-04-28T12:00:00.000Z",
    scheduled_for: "",
    sent_at: "2026-04-28T12:01:00.000Z",
  },
  {
    id: "comm-payment-reminder",
    title: "Recordatorio administrativo",
    content: "Se enviara un recordatorio administrativo a familias con documentacion pendiente.",
    type: "notification",
    priority: "normal",
    status: "scheduled",
    recipient_type: "group",
    recipient_id: "group-2b",
    recipient_label: "Segundo 2B",
    channels: ["email", "sms"],
    total_recipients: 24,
    delivered_count: 0,
    read_count: 0,
    created_at: "2026-04-27T10:00:00.000Z",
    scheduled_for: "2026-04-30T09:00:00.000Z",
    sent_at: "",
  },
  {
    id: "comm-draft-field-trip",
    title: "Permisos para visita academica",
    content: "Borrador de aviso para solicitar autorizacion de salida academica. Pendiente validar horario y transporte.",
    type: "announcement",
    priority: "normal",
    status: "draft",
    recipient_type: "group",
    recipient_id: "group-1a",
    recipient_label: "Primero 1A",
    channels: ["email"],
    total_recipients: 26,
    delivered_count: 0,
    read_count: 0,
    created_at: "2026-04-29T11:00:00.000Z",
    scheduled_for: "",
    sent_at: "",
  },
];

const defaultMockSchoolSettings = {
  school: {
    name: "Instituto Tecnologico Don Bosco",
    legal_name: "Instituto Tecnologico Don Bosco S.C.",
    campus_code: "DONBOSCO-MOR",
    logo_url: "",
    primary_color: "#4f46e5",
    timezone: "America/Mexico_City",
    language: "es-MX",
    phone: "777 100 2000",
    email: "direccion@donbosco.mx",
    address: "Jiutepec, Morelos",
  },
  academic: {
    school_year: "Ciclo 2025-2026",
    attendance_mode: "daily",
    default_capacity: 30,
    periods: ["Primer trimestre", "Segundo trimestre", "Tercer trimestre"],
    grading_scale: { min: 0, max: 100, passing: 60 },
  },
  notifications: {
    email_enabled: true,
    push_enabled: true,
    absence_alerts: true,
    grade_alerts: true,
    weekly_summary: true,
  },
  security: {
    require_2fa_admins: false,
    session_timeout_minutes: 120,
    allow_parent_invites: true,
    audit_log_enabled: true,
  },
  updated_at: "2026-04-29T09:00:00.000Z",
};

const mockGradeLevels = [
  { id: "grade-1", name: "Primero" },
  { id: "grade-2", name: "Segundo" },
  { id: "grade-3", name: "Tercero" },
  { id: "grade-4", name: "Cuarto" },
  { id: "grade-5", name: "Quinto" },
  { id: "grade-6", name: "Sexto" },
];

const modulesCatalog = [
  { key: "auth", name: "Auth + Tenant + RBAC", description: "Login, sesiones, roles, permisos y tenant context.", category: "core", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", dependencies: [], price_monthly_mxn: 0 },
  { key: "users", name: "Usuarios", description: "Personas unificadas: alumnos, padres, docentes y staff.", category: "core", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", dependencies: ["auth"], price_monthly_mxn: 0 },
  { key: "academic_core", name: "Academico Core", description: "Ciclos, grados, grupos, materias, inscripciones e historial.", category: "core", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", dependencies: ["auth", "users"], price_monthly_mxn: 0 },
  { key: "grading", name: "Grading System", description: "Calificaciones, promedios, evaluaciones y comentarios.", category: "core", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", dependencies: ["academic_core"], price_monthly_mxn: 0 },
  { key: "schedules", name: "Horarios", description: "Agenda semanal por grupo, profesor, salon y materia.", category: "academic_extension", is_core: false, is_required: false, enabled: true, source: "plan", layer: "extension", dependencies: ["academic_core"], price_monthly_mxn: 249 },
  { key: "attendance", name: "Asistencias", description: "Registro rapido, ausencias, retardos y alertas.", category: "academic_extension", is_core: false, is_required: false, enabled: true, source: "plan", layer: "extension", dependencies: ["academic_core"], price_monthly_mxn: 299 },
  { key: "documents", name: "Expedientes digitales", description: "PDF/JPG/PNG por alumno con preview y verificacion.", category: "operations", is_core: false, is_required: false, enabled: true, source: "plan", layer: "extension", dependencies: ["users"], price_monthly_mxn: 349 },
  { key: "report_cards", name: "Boletas", description: "Preview y export de boletas con calificaciones y asistencia.", category: "grading_extension", is_core: false, is_required: false, enabled: true, source: "plan", layer: "extension", dependencies: ["grading", "attendance"], price_monthly_mxn: 299 },
  { key: "communications", name: "Comunicaciones", description: "Avisos, mensajes y notificaciones por segmento.", category: "operations", is_core: false, is_required: false, enabled: true, source: "plan", layer: "extension", dependencies: ["users"], price_monthly_mxn: 249 },
  { key: "parent_portal", name: "Portal de Padres", description: "Hijos, asistencia, calificaciones, pagos, documentos y mensajes.", category: "portal", is_core: false, is_required: false, enabled: true, source: "plan", layer: "extension", dependencies: ["users", "academic_core"], price_monthly_mxn: 399 },
  { key: "teacher_portal", name: "Portal de Profesores", description: "Clases, asistencia, calificaciones y mensajes docentes.", category: "portal", is_core: false, is_required: false, enabled: true, source: "plan", layer: "extension", dependencies: ["users", "academic_core"], price_monthly_mxn: 399 },
  { key: "payments", name: "Pagos y cobranza escolar", description: "Adeudos, recibos, recordatorios y reportes de cobranza.", category: "monetization", is_core: false, is_required: false, enabled: true, source: "addon", layer: "extension", dependencies: ["users"], price_monthly_mxn: 499 },
  { key: "qr_access", name: "QR acceso y salida", description: "Entrada, salida y pickup auditado por QR.", category: "operations", is_core: false, is_required: false, enabled: true, source: "addon", layer: "extension", dependencies: ["users"], price_monthly_mxn: 449 },
  { key: "credentials", name: "Credenciales", description: "Credenciales imprimibles con foto, logo y QR.", category: "operations", is_core: false, is_required: false, enabled: true, source: "addon", layer: "extension", dependencies: ["users", "qr_access"], price_monthly_mxn: 299 },
  { key: "workshops", name: "Talleres", description: "Catalogo, inscripcion, horarios, asistencia y cobros de talleres.", category: "academic_extension", is_core: false, is_required: false, enabled: true, source: "addon", layer: "extension", dependencies: ["academic_core"], price_monthly_mxn: 399 },
  { key: "analytics", name: "Analytics", description: "Indicadores operativos, academic risk y uso por modulo.", category: "analytics", is_core: false, is_required: false, enabled: true, source: "addon", layer: "extension", dependencies: ["academic_core"], price_monthly_mxn: 499 },
  { key: "database_admin", name: "Database Admin", description: "Herramienta interna SuperAdmin para inspeccion/export/import.", category: "internal", is_core: false, is_required: false, enabled: true, source: "internal", layer: "internal", dependencies: [], price_monthly_mxn: 0 },
];

function readMockList<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function writeMockList<T>(key: string, value: T[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function readMockObject<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function writeMockObject<T>(key: string, value: T) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function parseBody(options: RequestInit): any {
  if (!options.body || typeof options.body !== "string") return {};
  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
}

function paginate<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    meta: { total, page, per_page: perPage, pages },
  };
}

function buildMockStudentHistory(student: any) {
  const years = readMockList("mock_school_years", defaultMockSchoolYears);
  const stored = readMockList("mock_student_academic_history", []);
  const existing = stored.filter((item: any) => item.student_id === student.id);
  if (existing.length > 0) return existing;

  return years.slice(0, 3).map((year: any, index: number) => ({
    id: `${student.id}-${year.id}`,
    student_id: student.id,
    school_year_id: year.id,
    school_year: year.name,
    grade_name: index === 0 ? student.grade_name || "Sin grado" : `Grado anterior ${index}`,
    group_name: index === 0 ? student.group_name || "Sin grupo" : "Historico",
    status: index === 0 ? student.status || "active" : "promoted",
    average_grade: Math.max(70, Number(student.average_grade || 88) - index * 2),
    attendance_rate: Math.max(80, Number(student.attendance_rate || 94) - index),
    absences: Number(student.total_absences || 1) + index,
    notes: index === 0 ? "Ciclo actual." : "Registro historico demo.",
  }));
}

function buildMockParentsFromBody(body: any) {
  if (Array.isArray(body.parents) && body.parents.length > 0) {
    return body.parents.map((parent: any, index: number) => ({
      id: parent.id || `parent-${Date.now()}-${index}`,
      first_name: parent.first_name || "",
      paternal_last_name: parent.paternal_last_name || "",
      maternal_last_name: parent.maternal_last_name || "",
      email: parent.email || "",
      phone: parent.phone || "",
      relationship: parent.relationship || (index === 0 ? "mother" : "father"),
      is_primary: parent.is_primary || index === 0,
      notes: parent.notes || "",
    }));
  }
  const parentName = String(body.parent_name || "").trim().split(" ");
  return [{
    id: `parent-${Date.now()}-0`,
    first_name: parentName.slice(0, -2).join(" ") || parentName[0] || "",
    paternal_last_name: parentName.slice(-2, -1)[0] || "",
    maternal_last_name: parentName.slice(-1)[0] || "",
    email: body.parent_email || "",
    phone: body.parent_phone || "",
    relationship: "guardian",
    is_primary: true,
    notes: "",
  }];
}

async function mockDemoFetch(endpoint: string, options: RequestInit = {}) {
  const url = new URL(endpoint, "https://mock.educore.local");
  if (url.pathname.includes("/teacher")) {
    return mockTeacherFetch(endpoint, options);
  }
  if (url.pathname.includes("/parent")) {
    return mockParentFetch(endpoint, options);
  }
  if (url.pathname.includes("/school-admin")) {
    return mockSchoolAdminFetch(endpoint, options);
  }
  return mockSuperAdminFetch(endpoint, options);
}

function getMockParentChildren() {
  const students = readMockList("mock_school_students", defaultMockStudents)
    .filter((student: any) => student.status !== "inactive")
    .slice(0, 2);

  return students.map((student: any) => ({
    id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    enrollment_id: student.enrollment_id,
    group_name: student.group_name || "",
    grade_name: student.grade_name || "",
    status: student.status || "active",
    attendance_rate: Number(student.attendance_rate || 0),
    current_gpa: Number(student.average_grade || 0),
    last_attendance: "2026-04-29",
    next_class: student.group_id === "group-1a" ? "Matematicas 08:00" : "Espanol 09:00",
    recent_grade: `${student.average_grade || 0} - Matematicas`,
    profile_photo: "",
    updated_at: student.updated_at || nowIso(),
    birth_date: student.birth_date || "",
    address: student.address || "",
    teacher_name: student.group_id === "group-1a" ? "Maria Lopez" : "Carlos Rivera",
    teacher_email: student.group_id === "group-1a" ? "maria.lopez@donbosco.mx" : "carlos.rivera@donbosco.mx",
    emergency_info: {
      primary_contact: student.parent_name || "Tutor principal",
      primary_phone: student.parent_phone || "",
    },
  }));
}

function buildMockParentGrades(child: any, period = "current") {
  const subjects = readMockList("mock_school_subjects", defaultMockSubjects).slice(0, 4);
  const base = Number(child?.average_grade || child?.current_gpa || 88);
  const subjectGrades = subjects.map((subject: any, index: number) => {
    const score = Math.max(60, Math.min(100, base + (index % 2 === 0 ? 2 : -3)));
    const letter = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "D";
    return {
      subject_id: subject.id,
      subject_name: subject.name,
      teacher_name: index % 2 === 0 ? "Maria Lopez" : "Carlos Rivera",
      current_grade: score,
      letter_grade: letter,
      trend: index === 0 ? "improving" : "stable",
      last_updated: nowIso(),
      assignments: [
        {
          id: `grade-${child.id}-${subject.id}-1`,
          title: period === "current" ? "Evaluacion parcial" : period,
          type: "exam",
          score,
          max_score: 100,
          percentage: score,
          letter_grade: letter,
          date: "2026-04-28",
          subject: subject.name,
          teacher_name: index % 2 === 0 ? "Maria Lopez" : "Carlos Rivera",
          comments: score >= 80 ? "Buen desempeno." : "Requiere reforzar el tema.",
          created_at: nowIso(),
        },
      ],
    };
  });
  const average = Math.round(subjectGrades.reduce((sum: number, item: any) => sum + item.current_grade, 0) / Math.max(subjectGrades.length, 1));
  return {
    child_id: child.id,
    child_name: `${child.first_name} ${child.last_name}`,
    period,
    overall_gpa: average,
    overall_grade: average >= 90 ? "A" : average >= 80 ? "B" : "C",
    subjects: subjectGrades,
    trend_data: [{ period: "Actual", gpa: average, change: 1.2 }],
    summary: {
      highest_grade: Math.max(...subjectGrades.map((item: any) => item.current_grade)),
      lowest_grade: Math.min(...subjectGrades.map((item: any) => item.current_grade)),
      average_grade: average,
      total_assignments: subjectGrades.length,
      passing_rate: 100,
      improvement_trend: "stable",
    },
    last_updated: nowIso(),
  };
}

function buildMockParentAttendance(child: any, startDate: string, endDate: string) {
  const records = [
    { date: "2026-04-29", status: "present", check_in: "08:02", check_out: "14:00", notes: "", excuse_note: "" },
    { date: "2026-04-28", status: "present", check_in: "07:58", check_out: "14:00", notes: "", excuse_note: "" },
    { date: "2026-04-27", status: child.id.includes("garcia") ? "late" : "present", check_in: "08:14", check_out: "14:00", notes: "Entrada despues del timbre", excuse_note: "" },
    { date: "2026-04-24", status: "present", check_in: "08:00", check_out: "14:00", notes: "", excuse_note: "" },
    { date: "2026-04-23", status: child.attendance_rate < 90 ? "absent" : "present", check_in: "", check_out: "", notes: child.attendance_rate < 90 ? "Ausencia sin justificar" : "", excuse_note: "" },
  ];
  const present = records.filter((item) => ["present", "late", "excused"].includes(item.status)).length;
  const late = records.filter((item) => item.status === "late").length;
  const absent = records.filter((item) => item.status === "absent").length;
  const excused = records.filter((item) => item.status === "excused").length;
  return {
    child_id: child.id,
    child_name: `${child.first_name} ${child.last_name}`,
    start_date: startDate,
    end_date: endDate,
    records,
    summary: {
      total_days: records.length,
      present_days: records.filter((item) => item.status === "present").length,
      absent_days: absent,
      late_days: late,
      excused_days: excused,
      rate: Math.round((present * 100) / records.length),
      on_time_rate: Math.round(((present - late) * 100) / records.length),
    },
    trend_data: [{ week: "Actual", rate: child.attendance_rate || 0 }],
    patterns: {
      most_absent_day: "Jueves",
      most_late_day: "Lunes",
      best_attendance_month: "Abril",
      needs_attention: (child.attendance_rate || 0) < 85,
    },
  };
}

function getMockTeacherClasses() {
  const groups = readMockList("mock_school_groups", mockSchoolGroups);
  const subjects = readMockList("mock_school_subjects", defaultMockSubjects);
  const schedule = readMockList("mock_school_schedule", defaultMockScheduleBlocks);
  return groups.slice(0, 3).map((group: any, index: number) => {
    const subject = subjects[index % Math.max(subjects.length, 1)] || {};
    const block = schedule.find((item: any) => item.group_id === group.id) || {};
    return {
      id: block.id || `teacher-class-${group.id}-${subject.id}`,
      group_id: group.id,
      group_name: group.name,
      grade_name: group.grade_name || group.grade || "Primaria",
      subject_id: subject.id || "subject-math",
      subject_name: subject.name || "Matematicas",
      day: block.day || "monday",
      start_time: block.start_time || "08:00",
      end_time: block.end_time || "09:00",
      room: block.room || group.room || "Salon 1",
      student_count: group.student_count || 24,
      status: "active",
      updated_at: group.updated_at || nowIso(),
    };
  });
}

function getMockTeacherStudents(groupId: string) {
  const students = readMockList("mock_school_students", defaultMockStudents);
  return students.slice(0, 12).map((student: any, index: number) => ({
    id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    enrollment_id: student.enrollment_id || `ALU-${index + 1}`,
    group_id: groupId,
    group_name: student.group_name || "1A",
    attendance_rate: Number(student.attendance_rate || 92),
    average_grade: Number(student.average_grade || 86),
    last_attendance: "2026-04-29",
    status: student.status || "active",
    parent_id: `parent-${student.id}`,
    parent_name: student.parent_name || "Tutor principal",
  }));
}

async function mockTeacherFetch(endpoint: string, options: RequestInit = {}) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const method = (options.method || "GET").toUpperCase();
  const url = new URL(endpoint, "https://mock.educore.local");
  const path = url.pathname;
  const classes = getMockTeacherClasses();

  if (path.endsWith("/teacher/dashboard")) {
    const messages = readMockList("mock_teacher_messages", [
      { id: "teacher-msg-1", conversation_id: "conv-teacher-1", sender_name: "Padre de Sofia", recipient_name: "Maria Lopez", subject: "Duda sobre tarea", content: "Buenas tardes, podria confirmar la fecha de entrega?", priority: "normal", is_read: false, created_at: "2026-04-29T11:00:00.000Z" },
    ]);
    const totalStudents = classes.reduce((sum, item) => sum + Number(item.student_count || 0), 0);
    return {
      success: true,
      data: {
        stats: {
          total_groups: new Set(classes.map((item) => item.group_id)).size,
          total_students: totalStudents,
          today_classes: classes.length,
          pending_attendance: 1,
          pending_grades: 2,
          average_grade: 87,
        },
        today_classes: classes,
        alerts: [
          { id: "alert-att", type: "attendance", title: "Asistencia pendiente", message: "El grupo 1A aun no tiene pase de lista.", priority: "high" },
          { id: "alert-grade", type: "grades", title: "Calificaciones por revisar", message: "Hay 2 evaluaciones listas para publicar.", priority: "normal" },
        ],
        recent_messages: messages.slice(0, 4),
        last_updated: nowIso(),
      },
    };
  }

  if (path.endsWith("/teacher/classes")) {
    return { success: true, data: classes };
  }

  const studentsMatch = path.match(/\/teacher\/classes\/([^/]+)\/students$/);
  if (studentsMatch) {
    return { success: true, data: getMockTeacherStudents(decodeURIComponent(studentsMatch[1])) };
  }

  if (path.endsWith("/teacher/attendance")) {
    const groupId = url.searchParams.get("group_id") || classes[0]?.group_id || "group-1a";
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const key = `mock_teacher_attendance_${groupId}_${date}`;
    if (method === "POST") {
      const body = parseBody(options);
      writeMockList(`mock_teacher_attendance_${body.group_id}_${body.date}`, body.records || []);
      return { success: true, message: "Asistencia guardada en modo demo" };
    }
    const saved = readMockList(key, []);
    const students = getMockTeacherStudents(groupId).map((student) => {
      const record = saved.find((item: any) => item.student_id === student.id || item.student_id === student.student_id);
      return { student_id: student.id, student_name: `${student.first_name} ${student.last_name}`, enrollment_id: student.enrollment_id, status: record?.status || "present", notes: record?.notes || "" };
    });
    const summary = students.reduce((acc: any, item: any) => {
      acc.total += 1;
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, { total: 0, present: 0, absent: 0, late: 0, excused: 0 });
    return { success: true, data: { group_id: groupId, group_name: classes.find((item) => item.group_id === groupId)?.group_name || "Grupo", date, students, summary } };
  }

  if (path.endsWith("/teacher/grades")) {
    const groupId = url.searchParams.get("group_id") || classes[0]?.group_id || "group-1a";
    const subjectId = url.searchParams.get("subject_id") || classes[0]?.subject_id || "subject-math";
    const period = url.searchParams.get("period") || "current";
    const key = `mock_teacher_grades_${groupId}_${subjectId}_${period}`;
    if (method === "POST") {
      const body = parseBody(options);
      writeMockList(`mock_teacher_grades_${body.group_id}_${body.grades?.[0]?.subject_id || subjectId}_${body.period || "current"}`, body.grades || []);
      return { success: true, message: "Calificaciones guardadas en modo demo" };
    }
    const saved = readMockList(key, []);
    const students = getMockTeacherStudents(groupId).map((student, index) => {
      const record = saved.find((item: any) => item.student_id === student.id || item.student_id === student.student_id);
      const score = Number(record?.score ?? Math.max(70, Number(student.average_grade || 86) + (index % 2 === 0 ? 2 : -4)));
      return { student_id: student.id, student_name: `${student.first_name} ${student.last_name}`, enrollment_id: student.enrollment_id, score, status: score >= 60 ? "passing" : "at_risk", notes: record?.notes || "" };
    });
    const avg = Math.round(students.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(students.length, 1));
    return { success: true, data: { group_id: groupId, group_name: classes.find((item) => item.group_id === groupId)?.group_name || "Grupo", subject_id: subjectId, subject_name: classes.find((item) => item.subject_id === subjectId)?.subject_name || "Materia", period, students, summary: { total: students.length, average: avg, passing: students.filter((item) => item.score >= 60).length, at_risk: students.filter((item) => item.score < 70).length } } };
  }

  if (path.endsWith("/teacher/messages")) {
    const messages = readMockList("mock_teacher_messages", [
      { id: "teacher-msg-1", conversation_id: "conv-teacher-1", sender_name: "Padre de Sofia", recipient_name: "Maria Lopez", subject: "Duda sobre tarea", content: "Buenas tardes, podria confirmar la fecha de entrega?", priority: "normal", is_read: false, created_at: "2026-04-29T11:00:00.000Z" },
    ]);
    if (method === "POST") {
      const body = parseBody(options);
      const created = { id: `teacher-msg-${Date.now()}`, conversation_id: `teacher-conv-${Date.now()}`, sender_name: "Maria Lopez", recipient_name: body.recipient_id === "school-admin" ? "Direccion" : "Tutor", subject: body.subject, content: body.content, priority: body.priority || "normal", is_read: false, created_at: nowIso() };
      writeMockList("mock_teacher_messages", [created, ...messages]);
      return { success: true, data: created, message: "Mensaje enviado en modo demo" };
    }
    return { success: true, data: messages };
  }

  return { success: false, message: "Endpoint Teacher demo no implementado" };
}

async function mockParentFetch(endpoint: string, options: RequestInit = {}) {
  await new Promise((resolve) => setTimeout(resolve, 160));

  const method = (options.method || "GET").toUpperCase();
  const url = new URL(endpoint, "https://mock.educore.local");
  const path = url.pathname;
  const children = getMockParentChildren();
  const childMatch = path.match(/\/parent\/children\/([^/]+)(?:\/([^/]+))?$/);
  const defaultEvents = [
    { id: "event-parents", title: "Reunion de padres", description: "Junta mensual con direccion.", type: "meeting", start_date: "2026-05-06", end_date: "2026-05-06", start_time: "18:00", end_time: "19:00", location: "Auditorio", is_all_day: false, is_recurring: false, child_name: "", category: "school", priority: "high", created_at: nowIso() },
    { id: "event-exam", title: "Evaluacion de Matematicas", description: "Repaso de operaciones basicas.", type: "exam", start_date: "2026-05-08", end_date: "2026-05-08", start_time: "09:00", end_time: "10:00", location: "Salon 1A", is_all_day: false, is_recurring: false, child_name: `${children[0]?.first_name || "Alumno"} ${children[0]?.last_name || ""}`.trim(), category: "academic", priority: "normal", created_at: nowIso() },
  ];
  const defaultMessages = [
    { id: "message-demo-1", conversation_id: "conversation-demo-1", sender_name: "Maria Lopez", recipient_name: "padre@educore.mx", subject: "Avance en Matematicas", content: "El alumno entrego sus actividades y muestra buen avance esta semana.", is_read: false, priority: "normal", has_attachments: false, created_at: "2026-04-29T10:00:00.000Z" },
  ];

  if (path.endsWith("/parent/dashboard")) {
    const notifications = readMockList("mock_parent_notifications", [
      { id: "notif-parent-1", title: "Boleta disponible", type: "grade_published", is_read: false, created_at: nowIso() },
      { id: "notif-parent-2", title: "Recordatorio de reunion", type: "announcement", is_read: true, created_at: "2026-04-28T13:00:00.000Z" },
    ]);
    const events = readMockList("mock_parent_events", defaultEvents);
    return {
      success: true,
      data: {
        children,
        recent_activity: [
          { id: "act-grade", type: "grade", title: "Nueva calificacion", description: children[0]?.recent_grade || "Calificacion publicada", child_name: `${children[0]?.first_name || ""} ${children[0]?.last_name || ""}`.trim(), timestamp: nowIso(), action_url: "/parent/grades" },
          { id: "act-att", type: "attendance", title: "Asistencia registrada", description: "Registro del dia actualizado", child_name: `${children[1]?.first_name || ""} ${children[1]?.last_name || ""}`.trim(), timestamp: "2026-04-29T08:20:00.000Z", action_url: "/parent/attendance" },
        ],
        upcoming_events: events.slice(0, 3).map((event: any) => ({ id: event.id, title: event.title, date: event.start_date, time: event.start_time, type: event.type, child_name: event.child_name })),
        recent_notifications: notifications.slice(0, 5),
        quick_stats: {
          total_children: children.length,
          overall_attendance: Math.round(children.reduce((sum: number, child: any) => sum + child.attendance_rate, 0) / Math.max(children.length, 1)),
          overall_gpa: Math.round(children.reduce((sum: number, child: any) => sum + child.current_gpa, 0) / Math.max(children.length, 1)),
          unread_notifications: notifications.filter((item: any) => !item.is_read).length,
          upcoming_events: events.length,
          pending_assignments: 2,
        },
        last_updated: nowIso(),
      },
    };
  }

  if (path.endsWith("/parent/children")) {
    return { success: true, data: children };
  }

  if (childMatch) {
    const child = children.find((item: any) => item.id === decodeURIComponent(childMatch[1]));
    if (!child) return { success: false, message: "Alumno no encontrado" };
    const action = childMatch[2];
    if (!action) {
      return { success: true, data: { ...child, schedule: [], recent_attendance: buildMockParentAttendance(child, "", "").records.slice(0, 3), recent_grades: buildMockParentGrades(child).subjects.flatMap((subject: any) => subject.assignments).slice(0, 3), upcoming_assignments: [], behavior: { overall_rating: "Adecuado", recent_incidents: [], improvements: [], goals: [] } } };
    }
    if (action === "grades") return { success: true, data: buildMockParentGrades(child, url.searchParams.get("period") || "current") };
    if (action === "attendance") return { success: true, data: buildMockParentAttendance(child, url.searchParams.get("start_date") || "", url.searchParams.get("end_date") || "") };
    if (action === "schedule") return { success: true, data: { child_id: child.id, child_name: `${child.first_name} ${child.last_name}`, group_name: child.group_name, weekly_schedule: [], special_events: [] } };
    if (action === "report-card") {
      const grades = buildMockParentGrades(child);
      return { success: true, data: { child_id: child.id, child_name: `${child.first_name} ${child.last_name}`, period: url.searchParams.get("period") || "current", grade_name: child.grade_name, group_name: child.group_name, overall_gpa: grades.overall_gpa, overall_grade: grades.overall_grade, attendance_rate: child.attendance_rate, subject_grades: grades.subjects, generated_at: nowIso(), status: "generated" } };
    }
    if (action === "teachers") return { success: true, data: readMockList("mock_school_teachers", defaultMockTeachers).slice(0, 2).map((teacher: any) => ({ teacher_id: teacher.id, first_name: teacher.first_name, last_name: teacher.last_name, email: teacher.email, phone: teacher.phone, subject: teacher.specialties?.[0] || "Titular", role: "Docente", can_message: true })) };
    if (action === "assignments") return { success: true, data: [{ assignments: [], summary: { total: 0, pending: 0, submitted: 0, graded: 0, overdue: 0 }, subjects: [] }] };
  }

  if (path.endsWith("/parent/messages")) {
    const messages = readMockList("mock_parent_messages", defaultMessages);
    if (method === "POST") {
      const body = parseBody(options);
      const recipient = defaultMockTeachers.find((teacher) => teacher.id === body.recipient_id);
      const created = { id: `message-${Date.now()}`, conversation_id: `conversation-${Date.now()}`, sender_name: "padre@educore.mx", recipient_name: recipient ? `${recipient.first_name} ${recipient.last_name}` : "Direccion", subject: body.subject, content: body.content, is_read: false, priority: body.priority || "normal", has_attachments: false, created_at: nowIso() };
      writeMockList("mock_parent_messages", [created, ...messages]);
      return { success: true, data: created, message: "Mensaje enviado en modo demo" };
    }
    return { success: true, data: messages, meta: { total: messages.length, page: 1, per_page: 20 } };
  }

  if (path.endsWith("/parent/notifications")) {
    const notifications = readMockList("mock_parent_notifications", [
      { id: "notif-parent-1", title: "Boleta disponible", message: "Ya puedes revisar la boleta del periodo.", type: "grade_published", priority: "normal", is_read: false, sender_name: "Direccion", created_at: nowIso() },
    ]);
    return { success: true, data: notifications, meta: { total: notifications.length, page: 1, per_page: 20 } };
  }

  if (path.endsWith("/parent/documents")) {
    const fallback = children.flatMap((child: any, index: number) => [
      { id: `doc-${child.id}-report`, student_id: child.id, student_name: `${child.first_name} ${child.last_name}`, title: "Boleta parcial", description: "Reporte academico del periodo actual.", category: "report_card", file_name: "boleta-parcial.pdf", file_url: "#", mime_type: "application/pdf", status: "active", created_at: nowIso() },
      { id: `doc-${child.id}-circular`, student_id: child.id, student_name: `${child.first_name} ${child.last_name}`, title: index === 0 ? "Circular reunion de padres" : "Lista de materiales", description: "Documento compartido por direccion escolar.", category: "circular", file_name: "circular.pdf", file_url: "#", mime_type: "application/pdf", status: "active", created_at: "2026-04-28T12:00:00.000Z" },
    ]);
    return { success: true, data: readMockList("mock_parent_documents", fallback) };
  }

  if (path.endsWith("/parent/payments")) {
    const fallback = children.flatMap((child: any, index: number) => [
      { id: `pay-${child.id}-may`, student_id: child.id, student_name: `${child.first_name} ${child.last_name}`, concept: "Colegiatura mayo", description: "Pago mensual escolar", amount: 1850 + index * 150, currency: "MXN", due_date: "2026-05-05", paid_at: null, payment_method: "", receipt_number: "", receipt_url: "", status: index === 0 ? "pending" : "paid" },
      { id: `pay-${child.id}-ins`, student_id: child.id, student_name: `${child.first_name} ${child.last_name}`, concept: "Material academico", description: "Cuota de material y plataforma", amount: 450, currency: "MXN", due_date: "2026-04-15", paid_at: "2026-04-12T10:00:00.000Z", payment_method: "Transferencia", receipt_number: `REC-${index + 1}`, receipt_url: "#", status: "paid" },
    ]);
    const payments = readMockList("mock_parent_payments", fallback);
    return {
      success: true,
      data: {
        payments,
        summary: {
          total_due: payments.filter((item: any) => item.status !== "paid" && item.status !== "cancelled").reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
          total_paid: payments.filter((item: any) => item.status === "paid").reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
          overdue_count: payments.filter((item: any) => item.status === "overdue").length,
          pending_count: payments.filter((item: any) => item.status === "pending").length,
          currency: "MXN",
        },
      },
    };
  }

  if (path.endsWith("/parent/consents")) {
    const fallback = children.map((child: any, index: number) => ({
      id: `consent-${child.id}`,
      student_id: child.id,
      student_name: `${child.first_name} ${child.last_name}`,
      title: index === 0 ? "Autorizacion salida academica" : "Uso de imagen institucional",
      description: index === 0 ? "Autorizacion para participar en visita escolar supervisada." : "Consentimiento para fotografias en eventos escolares.",
      category: index === 0 ? "activity" : "image_rights",
      due_date: "2026-05-10",
      status: "pending",
      signed_at: null,
      notes: "",
      created_at: nowIso(),
    }));
    return { success: true, data: readMockList("mock_parent_consents", fallback) };
  }

  const consentMatch = path.match(/\/parent\/consents\/([^/]+)$/);
  if (consentMatch && method === "PATCH") {
    const body = parseBody(options);
    const consents = readMockList("mock_parent_consents", []);
    const updated = consents.map((item: any) => item.id === decodeURIComponent(consentMatch[1]) ? { ...item, status: body.action || "approved", notes: body.notes || item.notes, signed_at: nowIso() } : item);
    writeMockList("mock_parent_consents", updated);
    return { success: true, data: updated.find((item: any) => item.id === decodeURIComponent(consentMatch[1])), message: "Permiso actualizado en modo demo" };
  }

  if (path.endsWith("/parent/reports/summary")) {
    const documents = readMockList("mock_parent_documents", []);
    const payments = readMockList("mock_parent_payments", []);
    const consents = readMockList("mock_parent_consents", []);
    const messages = readMockList("mock_parent_messages", defaultMessages);
    return {
      success: true,
      data: {
        children_count: children.length,
        average_attendance: Math.round(children.reduce((sum: number, child: any) => sum + Number(child.attendance_rate || 0), 0) / Math.max(children.length, 1)),
        average_grade: Math.round(children.reduce((sum: number, child: any) => sum + Number(child.current_gpa || 0), 0) / Math.max(children.length, 1)),
        pending_payments: payments.filter((item: any) => item.status !== "paid").reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
        pending_consents: consents.filter((item: any) => item.status === "pending").length,
        unread_messages: messages.filter((item: any) => !item.is_read).length,
        documents_available: documents.length,
        last_updated: nowIso(),
      },
    };
  }

  const notificationReadMatch = path.match(/\/parent\/notifications\/([^/]+)\/read$/);
  if (notificationReadMatch && method === "PUT") {
    const notifications = readMockList("mock_parent_notifications", []);
    writeMockList("mock_parent_notifications", notifications.map((item: any) => item.id === decodeURIComponent(notificationReadMatch[1]) ? { ...item, is_read: true, read_at: nowIso() } : item));
    return { success: true, message: "Notificacion marcada como leida" };
  }

  if (path.endsWith("/parent/calendar")) {
    const events = readMockList("mock_parent_events", defaultEvents);
    return { success: true, data: { month: Number(url.searchParams.get("month") || "4"), year: Number(url.searchParams.get("year") || "2026"), days: [], events, holidays: [], statistics: { total_events: events.length, school_days: 20, holidays: 0, weekends: 8 } } };
  }

  if (path.endsWith("/parent/events")) {
    const events = readMockList("mock_parent_events", defaultEvents);
    return { success: true, data: [{ events, grouped_by: {}, summary: { total: events.length, by_type: {}, by_child: {}, upcoming: events.length, this_week: 1 }, child_filter: children.map((child: any) => `${child.first_name} ${child.last_name}`) }] };
  }

  return { success: false, message: "Endpoint Parent demo no implementado" };
}

const tenantDatabaseTableDefs = [
  { name: "users", label: "Usuarios", storage: "mock_tenant_users", fallback: [] as any[], is_read_only: false },
  { name: "students", label: "Alumnos", storage: "mock_school_students", fallback: defaultMockStudents, is_read_only: false },
  { name: "parent_student", label: "Padres por alumno", storage: "mock_parent_student_links", fallback: [] as any[], is_read_only: true },
  { name: "school_years", label: "Ciclos escolares", storage: "mock_school_years", fallback: defaultMockSchoolYears, is_read_only: false },
  { name: "grade_levels", label: "Grados", storage: "mock_grade_levels", fallback: [] as any[], is_read_only: false },
  { name: "groups", label: "Grupos", storage: "mock_school_groups", fallback: mockSchoolGroups, is_read_only: false },
  { name: "group_students", label: "Alumnos por grupo", storage: "mock_group_students", fallback: [] as any[], is_read_only: true },
  { name: "group_teachers", label: "Profesores por grupo", storage: "mock_group_teachers", fallback: [] as any[], is_read_only: true },
  { name: "subjects", label: "Materias", storage: "mock_school_subjects", fallback: defaultMockSubjects, is_read_only: false },
  { name: "class_schedule_blocks", label: "Horarios", storage: "mock_school_schedule", fallback: defaultMockScheduleBlocks, is_read_only: false },
  { name: "attendance_records", label: "Asistencias", storage: "mock_school_attendance_rows", fallback: [] as any[], is_read_only: false },
  { name: "grade_records", label: "Calificaciones", storage: "mock_school_grades", fallback: [] as any[], is_read_only: false },
  { name: "student_academic_history", label: "Historial academico", storage: "mock_student_history_rows", fallback: [] as any[], is_read_only: false },
  { name: "import_batches", label: "Importaciones", storage: "mock_import_batches", fallback: [] as any[], is_read_only: true },
  { name: "tenant_custom_fields", label: "Campos personalizados", storage: "mock_tenant_custom_fields", fallback: [] as any[], is_read_only: false, is_custom: true },
  { name: "tenant_custom_tables", label: "Tablas personalizadas", storage: "mock_tenant_custom_tables", fallback: [] as any[], is_read_only: false, is_custom: true },
  { name: "tenant_custom_rows", label: "Filas personalizadas", storage: "mock_tenant_custom_rows", fallback: [] as any[], is_read_only: false, is_custom: true },
];

function seedTenantUsers() {
  return [
    { id: "tenant-admin-demo", tenant_id: "school-don-bosco", email: "admin@educore.mx", first_name: "Administrador", last_name: "Escuela", role: "SCHOOL_ADMIN", is_active: true, created_at: nowIso(), updated_at: nowIso(), custom_fields: {} },
    ...defaultMockTeachers.map((teacher) => ({
      id: teacher.id,
      tenant_id: "school-don-bosco",
      email: teacher.email,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      role: "TEACHER",
      is_active: teacher.status === "active",
      created_at: teacher.created_at,
      updated_at: nowIso(),
      custom_fields: {},
    })),
  ];
}

function getTenantTableDef(table: string) {
  return tenantDatabaseTableDefs.find((item) => item.name === table);
}

function getTenantRows(table: string) {
  const def = getTenantTableDef(table);
  if (!def) return [];
  const fallback = def.name === "users" ? seedTenantUsers() : def.fallback;
  if (def.name === "parent_student") {
    const students = readMockList("mock_school_students", defaultMockStudents);
    return students.map((student: any, index) => ({
      id: `link-${student.id}`,
      parent_id: `parent-${student.id}`,
      student_id: student.id,
      relationship: index % 2 === 0 ? "mother" : "father",
      is_primary: true,
      phone: student.parent_phone || "777 000 0000",
      parent_name: student.parent_name || "Tutor principal",
      student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      created_at: student.created_at || nowIso(),
      updated_at: student.updated_at || nowIso(),
    }));
  }
  if (def.name === "group_students") {
    const students = readMockList("mock_school_students", defaultMockStudents);
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    return students.map((student: any, index) => ({
      id: `gs-${student.id}`,
      group_id: groups[index % Math.max(groups.length, 1)]?.id || "group-1a",
      student_id: student.id,
      group_name: groups[index % Math.max(groups.length, 1)]?.name || "1A",
      student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      enrolled_at: student.created_at || nowIso(),
    }));
  }
  if (def.name === "group_teachers") {
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
    const subjects = readMockList("mock_school_subjects", defaultMockSubjects);
    return groups.slice(0, 6).map((group: any, index) => ({
      id: `gt-${group.id}-${index}`,
      group_id: group.id,
      teacher_id: teachers[index % Math.max(teachers.length, 1)]?.id || "",
      subject_id: subjects[index % Math.max(subjects.length, 1)]?.id || "",
      group_name: group.name,
      teacher_name: `${teachers[index % Math.max(teachers.length, 1)]?.first_name || ""} ${teachers[index % Math.max(teachers.length, 1)]?.last_name || ""}`.trim(),
      subject_name: subjects[index % Math.max(subjects.length, 1)]?.name || "",
    }));
  }
  return readMockList(def.storage, fallback);
}

function writeTenantRows(table: string, rows: any[]) {
  const def = getTenantTableDef(table);
  if (!def || def.is_read_only) return;
  writeMockList(def.storage, rows);
}

function inferTenantColumns(table: string) {
  const rows = getTenantRows(table);
  const first = rows[0] || {};
  const keys = Object.keys(first);
  const baseKeys = keys.length > 0 ? keys : ["id", "tenant_id", "name", "created_at", "updated_at"];
  const customFields = readMockList("mock_tenant_custom_fields", []).filter((field: any) => field.table_name === table);
  return {
    columns: baseKeys.map((key) => ({
      name: key,
      type: key.endsWith("_at") ? "timestamptz" : key === "custom_fields" || key === "data" ? "jsonb" : "text",
      nullable: !["id", "tenant_id", "first_name", "last_name", "name"].includes(key),
      is_primary: key === "id",
      is_protected: ["id", "tenant_id", "created_at", "updated_at", "password_hash"].includes(key),
    })),
    custom_fields: customFields.map((field: any) => ({ ...field, name: field.field_key, type: field.field_type, is_virtual: true })),
  };
}

async function mockSchoolAdminFetch(endpoint: string, options: RequestInit = {}) {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const method = (options.method || "GET").toUpperCase();
  const url = new URL(endpoint, "https://mock.educore.local");
  const path = url.pathname;

  if (path.endsWith("/school-admin/database/tables")) {
    const tables = tenantDatabaseTableDefs.map((table) => ({
      name: table.name,
      label: table.label,
      description: `${table.label} del tenant actual`,
      estimated_rows: getTenantRows(table.name).length,
      tenant_scoped: true,
      is_read_only: table.is_read_only,
      is_custom: Boolean(table.is_custom),
    }));
    return { success: true, data: { tables } };
  }

  const tenantDatabaseSchemaMatch = path.match(/\/school-admin\/database\/tables\/([^/]+)\/schema$/);
  if (tenantDatabaseSchemaMatch) {
    const table = decodeURIComponent(tenantDatabaseSchemaMatch[1]);
    const def = getTenantTableDef(table);
    if (!def) return { success: false, message: "Tabla no permitida" };
    const schema = inferTenantColumns(table);
    return {
      success: true,
      data: {
        table,
        label: def.label,
        columns: schema.columns,
        custom_fields: schema.custom_fields,
        relationships: table === "students" ? [{ column: "tenant_id", foreign_table: "tenants", foreign_column: "id" }] : [],
        tenant_scoped: true,
        is_read_only: def.is_read_only,
      },
    };
  }

  const tenantDatabaseRowsMatch = path.match(/\/school-admin\/database\/tables\/([^/]+)\/rows(?:\/([^/]+))?$/);
  if (tenantDatabaseRowsMatch) {
    const table = decodeURIComponent(tenantDatabaseRowsMatch[1]);
    const rowID = tenantDatabaseRowsMatch[2] ? decodeURIComponent(tenantDatabaseRowsMatch[2]) : "";
    const def = getTenantTableDef(table);
    if (!def) return { success: false, message: "Tabla no permitida" };
    let rows = getTenantRows(table);

    if (!rowID && method === "GET") {
      const search = (url.searchParams.get("search") || "").toLowerCase();
      if (search) rows = rows.filter((row: any) => JSON.stringify(row).toLowerCase().includes(search));
      return { success: true, data: { rows, page: 1, per_page: 50, total: rows.length } };
    }

    if (def.is_read_only) return { success: false, message: "Tabla de solo lectura" };

    const body = parseBody(options);
    if (!rowID && method === "POST") {
      const created = {
        id: `${table}-${Date.now()}`,
        tenant_id: "school-don-bosco",
        ...(body.values || {}),
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      writeTenantRows(table, [created, ...rows]);
      return { success: true, data: { id: created.id }, message: "Fila creada en modo demo" };
    }

    if (rowID && method === "PUT") {
      rows = rows.map((row: any) => row.id === rowID ? { ...row, ...(body.values || {}), updated_at: nowIso() } : row);
      writeTenantRows(table, rows);
      return { success: true, data: { id: rowID }, message: "Fila actualizada en modo demo" };
    }

    if (rowID && method === "DELETE") {
      rows = rows.map((row: any) => row.id === rowID ? { ...row, deleted_at: nowIso(), status: row.status ? "inactive" : row.status, is_active: row.is_active === undefined ? row.is_active : false } : row);
      writeTenantRows(table, rows);
      return { success: true, data: { id: rowID }, message: "Soft delete aplicado en modo demo" };
    }
  }

  if (path.endsWith("/school-admin/database/custom-fields") && method === "POST") {
    const body = parseBody(options);
    const fields = readMockList("mock_tenant_custom_fields", []);
    const created = { id: `field-${Date.now()}`, ...body, created_at: nowIso(), updated_at: nowIso() };
    writeMockList("mock_tenant_custom_fields", [created, ...fields.filter((field: any) => !(field.table_name === body.table_name && field.field_key === body.field_key))]);
    return { success: true, data: { id: created.id }, message: "Campo virtual creado en modo demo" };
  }

  if (path.endsWith("/school-admin/database/custom-tables") && method === "POST") {
    const body = parseBody(options);
    const tables = readMockList("mock_tenant_custom_tables", []);
    const created = { id: `custom-table-${Date.now()}`, tenant_id: "school-don-bosco", tenant_scoped: true, is_active: true, ...body, created_at: nowIso(), updated_at: nowIso() };
    writeMockList("mock_tenant_custom_tables", [created, ...tables]);
    return { success: true, data: { id: created.id }, message: "Tabla virtual creada en modo demo" };
  }

  const tenantExportTableMatch = path.match(/\/school-admin\/database\/export\/table\/([^/]+)$/);
  if (tenantExportTableMatch) {
    const table = decodeURIComponent(tenantExportTableMatch[1]);
    return { success: true, data: { generated_at: nowIso(), tables: { [table]: getTenantRows(table) }, format: "json-workbook-source" } };
  }

  if (path.endsWith("/school-admin/database/export/all")) {
    const tables: Record<string, any[]> = {};
    tenantDatabaseTableDefs.forEach((table) => {
      tables[table.name] = getTenantRows(table.name);
    });
    return { success: true, data: { generated_at: nowIso(), tables, format: "json-workbook-source" } };
  }

  if (path.endsWith("/school-admin/database/import/validate") && method === "POST") {
    return { success: true, data: { valid: true, tenant_scoped: true, required_steps: ["map_columns", "preview", "commit"], warnings: [] }, message: "Import validado en modo demo" };
  }

  if (path.endsWith("/school-admin/dashboard") || path.endsWith("/school-admin/stats")) {
    const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
    const students = readMockList("mock_school_students", defaultMockStudents);
    return {
      success: true,
      data: {
        stats: {
          total_students: students.length,
          total_teachers: teachers.length,
          total_groups: 12,
          active_students: students.filter((student) => student.status === "active").length,
          attendance_rate: 92,
          average_grade: 87,
          new_students_month: 12,
          graduations_month: 0,
        },
        recent_activity: [
          {
            id: "act-1",
            type: "teacher",
            title: "Plantilla actualizada",
            description: "Se sincronizo el directorio de profesores",
            user_name: "Direccion",
            timestamp: nowIso(),
            metadata: {},
          },
          {
            id: "act-2",
            type: "attendance",
            title: "Asistencia capturada",
            description: "Reporte diario generado correctamente",
            user_name: "Coordinacion",
            timestamp: nowIso(),
            metadata: {},
          },
        ],
        last_updated: nowIso(),
      },
    };
  }

  if (path.endsWith("/school-admin/settings")) {
    const current = readMockObject("mock_school_settings", defaultMockSchoolSettings);
    if (method === "PUT") {
      const body = parseBody(options);
      const updated = {
        ...current,
        school: { ...current.school, ...(body.school || {}) },
        academic: { ...current.academic, ...(body.academic || {}) },
        notifications: { ...current.notifications, ...(body.notifications || {}) },
        security: { ...current.security, ...(body.security || {}) },
        updated_at: nowIso(),
      };
      writeMockObject("mock_school_settings", updated);
      return { success: true, data: updated, message: "Configuracion guardada en modo demo" };
    }
    return { success: true, data: current };
  }

  if (path.endsWith("/school-admin/modules/enabled")) {
    return {
      success: true,
      data: {
        modules: modulesCatalog
          .filter((mod) => mod.is_core || mod.enabled !== false)
          .map((mod) => ({
            ...mod,
            enabled: mod.enabled !== false,
            is_active: mod.enabled !== false,
            is_required: mod.is_required ?? mod.is_core,
            layer: (mod as any).layer || "core",
            level: (mod as any).level || "",
            source: (mod as any).source || (mod.is_core ? "core" : "manual"),
          })),
      },
    };
  }

  if (path.endsWith("/school-admin/academic/school-years")) {
    const years = readMockList("mock_school_years", defaultMockSchoolYears);
    if (method === "POST") {
      const body = parseBody(options);
      const created = {
        id: `year-${Date.now()}`,
        name: body.name,
        start_date: body.start_date,
        end_date: body.end_date,
        status: body.status || (body.is_current ? "active" : "planned"),
        is_current: !!body.is_current,
        notes: body.notes || "",
        group_count: 0,
        student_count: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      const normalized = created.is_current
        ? years.map((year) => ({ ...year, is_current: false, status: year.status === "active" ? "closed" : year.status }))
        : years;
      writeMockList("mock_school_years", [created, ...normalized]);
      return { success: true, data: created, message: "Ciclo escolar creado en modo demo" };
    }
    return { success: true, data: years };
  }

  const schoolYearMatch = path.match(/\/school-admin\/academic\/school-years\/([^/]+)$/);
  if (schoolYearMatch) {
    const id = decodeURIComponent(schoolYearMatch[1]);
    const years = readMockList("mock_school_years", defaultMockSchoolYears);
    if (method === "PUT") {
      const body = parseBody(options);
      const updated = years.map((year) => {
        if (body.is_current && year.id !== id) {
          return { ...year, is_current: false, status: year.status === "active" ? "closed" : year.status, updated_at: nowIso() };
        }
        return year.id === id ? { ...year, ...body, updated_at: nowIso() } : year;
      });
      writeMockList("mock_school_years", updated);
      return { success: true, data: updated.find((year) => year.id === id), message: "Ciclo escolar actualizado en modo demo" };
    }
    const item = years.find((year) => year.id === id);
    return item ? { success: true, data: item } : { success: false, message: "Ciclo escolar no encontrado" };
  }

  if (path.endsWith("/school-admin/academic/subjects")) {
    const subjects = readMockList("mock_school_subjects", defaultMockSubjects);
    if (method === "POST") {
      const body = parseBody(options);
      const grade = mockGradeLevels.find((item) => item.id === body.grade_level_id);
      const created = {
        id: `subject-${Date.now()}`,
        name: body.name,
        code: body.code,
        description: body.description || "",
        credits: Number(body.credits || 1),
        grade_level_id: body.grade_level_id || "",
        grade_name: grade?.name || "Todos",
        status: body.status || "active",
        teacher_count: 0,
        student_count: 0,
        created_at: nowIso(),
      };
      writeMockList("mock_school_subjects", [created, ...subjects]);
      return { success: true, data: created, message: "Materia creada en modo demo" };
    }
    return { success: true, data: subjects };
  }

  const subjectMatch = path.match(/\/school-admin\/academic\/subjects\/([^/]+)$/);
  if (subjectMatch) {
    const id = decodeURIComponent(subjectMatch[1]);
    const subjects = readMockList("mock_school_subjects", defaultMockSubjects);
    if (method === "PUT") {
      const body = parseBody(options);
      const grade = mockGradeLevels.find((item) => item.id === body.grade_level_id);
      const updated = subjects.map((subject) => subject.id === id ? { ...subject, ...body, grade_name: grade?.name || subject.grade_name } : subject);
      writeMockList("mock_school_subjects", updated);
      return { success: true, data: updated.find((subject) => subject.id === id), message: "Materia actualizada en modo demo" };
    }
    if (method === "DELETE") {
      writeMockList("mock_school_subjects", subjects.filter((subject) => subject.id !== id));
      const groups = readMockList("mock_school_groups", mockSchoolGroups);
      writeMockList("mock_school_groups", groups.map((group) => ({ ...group, subject_ids: (group.subject_ids || []).filter((subjectID: string) => subjectID !== id) })));
      return { success: true, message: "Materia eliminada en modo demo" };
    }
    const item = subjects.find((subject) => subject.id === id);
    return item ? { success: true, data: item } : { success: false, message: "Materia no encontrada" };
  }

  if (path.endsWith("/school-admin/academic/groups")) {
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    if (method === "POST") {
      const body = parseBody(options);
      const grade = mockGradeLevels.find((item) => item.id === body.grade_level_id);
      const years = readMockList("mock_school_years", defaultMockSchoolYears);
      const year = years.find((item) => item.id === body.school_year_id) || years.find((item) => item.is_current);
      const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
      const teacherIDs = Array.isArray(body.teacher_ids) ? body.teacher_ids : body.teacher_id ? [body.teacher_id] : [];
      const primaryTeacher = teachers.find((item) => item.id === teacherIDs[0]);
      const created = {
        id: `group-${Date.now()}`,
        name: body.name,
        grade_level_id: body.grade_level_id,
        grade_name: grade?.name || "",
        school_year_id: year?.id || "",
        school_year: year?.name || "",
        generation: body.generation || `Generacion ${Number(new Date().getFullYear()) + 6}`,
        teacher_id: primaryTeacher?.id || "",
        teacher_ids: teacherIDs,
        teacher_name: primaryTeacher ? `${primaryTeacher.first_name} ${primaryTeacher.last_name}` : "",
        subject_ids: Array.isArray(body.subject_ids) ? body.subject_ids : [],
        student_count: Array.isArray(body.student_ids) ? body.student_ids.length : 0,
        student_ids: Array.isArray(body.student_ids) ? body.student_ids : [],
        max_students: Number(body.max_students || 30),
        room: body.room || "",
        schedule: body.schedule || "",
        status: body.status || "active",
        description: body.description || "",
        created_at: nowIso(),
      };
      writeMockList("mock_school_groups", [created, ...groups]);
      return { success: true, data: created, message: "Grupo creado en modo demo" };
    }
    return { success: true, data: groups };
  }

  if (path.endsWith("/school-admin/academic/schedule")) {
    const blocks = readMockList("mock_school_schedule", defaultMockScheduleBlocks);
    if (method === "POST") {
      const body = parseBody(options);
      const groups = readMockList("mock_school_groups", mockSchoolGroups);
      const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
      const group = groups.find((item) => item.id === body.group_id);
      const teacher = teachers.find((item) => item.id === body.teacher_id);
      const subjects = readMockList("mock_school_subjects", defaultMockSubjects);
      const subject = subjects.find((item) => item.id === body.subject_id);
      const created = {
        id: `schedule-${Date.now()}`,
        group_id: body.group_id || "",
        group_name: group?.name || "",
        grade_name: group?.grade_name || "",
        teacher_id: body.teacher_id || "",
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "",
        subject_id: body.subject_id || subject?.id || "",
        subject: subject?.name || body.subject || "",
        day: body.day || "monday",
        start_time: body.start_time || "08:00",
        end_time: body.end_time || "08:50",
        room: body.room || group?.room || "",
        status: body.status || "active",
        notes: body.notes || "",
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      writeMockList("mock_school_schedule", [created, ...blocks]);
      return { success: true, data: created, message: "Bloque de horario creado en modo demo" };
    }

    const groupID = url.searchParams.get("group_id") || "";
    const day = url.searchParams.get("day") || "";
    const status = url.searchParams.get("status") || "";
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const filtered = blocks.filter((block) => {
      const matchesGroup = !groupID || groupID === "all" || block.group_id === groupID;
      const matchesDay = !day || day === "all" || block.day === day;
      const matchesStatus = !status || status === "all" || block.status === status;
      const matchesSearch = !search || `${block.subject} ${block.teacher_name} ${block.group_name} ${block.room}`.toLowerCase().includes(search);
      return matchesGroup && matchesDay && matchesStatus && matchesSearch;
    });
    return { success: true, data: filtered };
  }

  const scheduleMatch = path.match(/\/school-admin\/academic\/schedule\/([^/]+)$/);
  if (scheduleMatch) {
    const id = decodeURIComponent(scheduleMatch[1]);
    const blocks = readMockList("mock_school_schedule", defaultMockScheduleBlocks);
    const block = blocks.find((item) => item.id === id);

    if (method === "PUT") {
      const body = parseBody(options);
      const groups = readMockList("mock_school_groups", mockSchoolGroups);
      const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
      const group = groups.find((item) => item.id === body.group_id);
      const teacher = teachers.find((item) => item.id === body.teacher_id);
      const subjects = readMockList("mock_school_subjects", defaultMockSubjects);
      const subject = subjects.find((item) => item.id === body.subject_id);
      const updated = blocks.map((item) =>
        item.id === id
          ? {
              ...item,
              ...body,
              group_name: group?.name ?? item.group_name,
              grade_name: group?.grade_name ?? item.grade_name,
              teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : item.teacher_name,
              subject: subject?.name ?? body.subject ?? item.subject,
              room: body.room ?? item.room,
              updated_at: nowIso(),
            }
          : item
      );
      writeMockList("mock_school_schedule", updated);
      return { success: true, data: updated.find((item) => item.id === id), message: "Horario actualizado en modo demo" };
    }

    if (method === "DELETE") {
      writeMockList("mock_school_schedule", blocks.filter((item) => item.id !== id));
      return { success: true, message: "Bloque eliminado en modo demo" };
    }

    return block ? { success: true, data: block } : { success: false, message: "Bloque de horario no encontrado" };
  }

  const attendanceTodayMatch = path.match(/\/school-admin\/attendance\/groups\/([^/]+)\/today$/);
  if (attendanceTodayMatch) {
    const groupID = decodeURIComponent(attendanceTodayMatch[1]);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const students = readMockList("mock_school_students", defaultMockStudents).filter((student: any) => student.group_id === groupID);
    const records = readMockList("mock_school_attendance", []);
    const data = students.map((student: any) => {
      const existing = records.find((record: any) => record.group_id === groupID && record.student_id === student.id && record.date === date);
      return {
        student_id: student.id,
        first_name: student.first_name,
        last_name: [student.paternal_last_name || student.last_name, student.maternal_last_name].filter(Boolean).join(" "),
        status: existing?.status || "present",
        notes: existing?.notes || "",
        last_changed: existing?.updated_at || "",
      };
    });
    const present = data.filter((item) => item.status === "present").length;
    const late = data.filter((item) => item.status === "late").length;
    const sick = data.filter((item) => item.status === "sick").length;
    const absent = data.filter((item) => item.status === "absent").length;
    const excused = data.filter((item) => item.status === "excused").length;
    return {
      success: true,
      data: {
        group_id: groupID,
        date,
        students: data,
        summary: { present, late, sick, absent, excused, rate: data.length ? Math.round(((present + late + sick + excused) / data.length) * 100) : 0 },
        last_updated: nowIso(),
      },
    };
  }

  const attendanceBulkMatch = path.match(/\/school-admin\/attendance\/groups\/([^/]+)\/bulk$/);
  if (attendanceBulkMatch && method === "POST") {
    const groupID = decodeURIComponent(attendanceBulkMatch[1]);
    const body = parseBody(options);
    const date = body.date || new Date().toISOString().slice(0, 10);
    const current = readMockList("mock_school_attendance", []);
    const withoutDay = current.filter((record: any) => !(record.group_id === groupID && record.date === date));
    const next = (Array.isArray(body.records) ? body.records : []).map((record: any) => ({
      id: `attendance-${groupID}-${record.student_id}-${date}`,
      group_id: groupID,
      student_id: record.student_id,
      date,
      status: record.status || "present",
      notes: record.notes || "",
      updated_at: nowIso(),
    }));
    writeMockList("mock_school_attendance", [...next, ...withoutDay]);

    const students = readMockList("mock_school_students", defaultMockStudents);
    const updatedStudents = students.map((student: any) => {
      if (student.group_id !== groupID) return student;
      const studentRecords = [...next, ...withoutDay].filter((record: any) => record.student_id === student.id);
      if (studentRecords.length === 0) return student;
      const healthy = studentRecords.filter((record: any) => ["present", "late", "sick", "excused"].includes(record.status)).length;
      const absent = studentRecords.filter((record: any) => record.status === "absent").length;
      return {
        ...student,
        attendance_rate: Math.round((healthy / studentRecords.length) * 100),
        total_absences: absent,
        updated_at: nowIso(),
      };
    });
    writeMockList("mock_school_students", updatedStudents);
    return { success: true, message: "Asistencia guardada en modo demo" };
  }

  const attendanceHistoryMatch = path.match(/\/school-admin\/attendance\/students\/([^/]+)\/history$/);
  if (attendanceHistoryMatch) {
    const studentID = decodeURIComponent(attendanceHistoryMatch[1]);
    const students = readMockList("mock_school_students", defaultMockStudents);
    const student = students.find((item: any) => item.id === studentID);
    const records = readMockList("mock_school_attendance", [])
      .filter((record: any) => record.student_id === studentID)
      .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
    const fallback = records.length ? records : [
      { date: "2026-04-30", status: "present", notes: "", student_id: studentID },
      { date: "2026-04-29", status: "present", notes: "", student_id: studentID },
      { date: "2026-04-28", status: "late", notes: "Llego 10 minutos tarde", student_id: studentID },
    ];
    const present = fallback.filter((item: any) => item.status === "present").length;
    const late = fallback.filter((item: any) => item.status === "late").length;
    const sick = fallback.filter((item: any) => item.status === "sick").length;
    const absent = fallback.filter((item: any) => item.status === "absent").length;
    const excused = fallback.filter((item: any) => item.status === "excused").length;
    return {
      success: true,
      data: {
        student_id: studentID,
        student_name: student ? `${student.first_name} ${student.last_name}` : "",
        records: fallback,
        summary: { present, late, sick, absent, excused, rate: fallback.length ? Math.round(((present + late + sick + excused) / fallback.length) * 100) : 0 },
      },
    };
  }

  const groupGradesMatch = path.match(/\/school-admin\/grades\/groups\/([^/]+)\/subjects\/([^/]+)$/);
  if (groupGradesMatch) {
    const groupID = decodeURIComponent(groupGradesMatch[1]);
    const subjectID = decodeURIComponent(groupGradesMatch[2]);
    const students = readMockList("mock_school_students", defaultMockStudents).filter((student: any) => student.group_id === groupID);
    const grades = readMockList("mock_school_grades", []);
    const data = students.map((student: any) => {
      const studentGrades = grades.filter((grade: any) => grade.student_id === student.id && grade.subject_id === subjectID);
      const average = studentGrades.length
        ? Math.round(studentGrades.reduce((sum: number, grade: any) => sum + Number(grade.score || 0), 0) / studentGrades.length)
        : Number(student.average_grade || 0);
      return {
        student_id: student.id,
        first_name: student.first_name,
        last_name: [student.paternal_last_name || student.last_name, student.maternal_last_name].filter(Boolean).join(" "),
        grades: studentGrades,
        average,
        letter_grade: average >= 90 ? "A" : average >= 80 ? "B" : average >= 70 ? "C" : average >= 60 ? "D" : "F",
      };
    });
    const average = data.length ? Math.round(data.reduce((sum, student) => sum + student.average, 0) / data.length) : 0;
    return {
      success: true,
      data: {
        group_id: groupID,
        subject_id: subjectID,
        students: data,
        summary: {
          average,
          highest: Math.max(0, ...data.map((student) => student.average)),
          lowest: Math.min(100, ...data.map((student) => student.average || 100)),
          passing_rate: data.length ? Math.round((data.filter((student) => student.average >= 60).length / data.length) * 100) : 0,
          student_count: data.length,
          grade_count: grades.filter((grade: any) => grade.subject_id === subjectID).length,
        },
      },
    };
  }

  if (path.endsWith("/school-admin/grades/grades/bulk") && method === "POST") {
    const body = parseBody(options);
    const current = readMockList("mock_school_grades", []);
    const created = (Array.isArray(body.grades) ? body.grades : []).map((grade: any) => ({
      id: `grade-${Date.now()}-${grade.student_id}`,
      student_id: grade.student_id,
      subject_id: grade.subject_id,
      score: Number(grade.score || 0),
      max_score: 100,
      type: grade.type || "exam",
      description: grade.description || "Evaluacion",
      weight: Number(grade.weight || 0),
      date: new Date().toISOString().slice(0, 10),
      teacher_name: "Coordinacion academica",
      created_at: nowIso(),
    }));
    writeMockList("mock_school_grades", [...created, ...current]);

    const students = readMockList("mock_school_students", defaultMockStudents);
    const allGrades = [...created, ...current];
    writeMockList("mock_school_students", students.map((student: any) => {
      const studentGrades = allGrades.filter((grade: any) => grade.student_id === student.id);
      if (studentGrades.length === 0) return student;
      return {
        ...student,
        average_grade: Math.round(studentGrades.reduce((sum: number, grade: any) => sum + Number(grade.score || 0), 0) / studentGrades.length),
        updated_at: nowIso(),
      };
    }));
    return { success: true, data: { updated: created.length }, message: "Calificaciones guardadas en modo demo" };
  }

  if (path.endsWith("/school-admin/report-cards/generate") && method === "POST") {
    const body = parseBody(options);
    const student = readMockList("mock_school_students", defaultMockStudents).find((item: any) => item.id === body.student_id);
    const subjects = readMockList("mock_school_subjects", defaultMockSubjects);
    const grades = readMockList("mock_school_grades", []);
    const subjectGrades = subjects.slice(0, 6).map((subject: any) => {
      const subjectRecords = grades.filter((grade: any) => grade.student_id === body.student_id && grade.subject_id === subject.id);
      const average = subjectRecords.length
        ? Math.round(subjectRecords.reduce((sum: number, grade: any) => sum + Number(grade.score || 0), 0) / subjectRecords.length)
        : Number(student?.average_grade || 88);
      return {
        subject_name: subject.name,
        teacher_name: "Coordinacion academica",
        average,
        letter_grade: average >= 90 ? "A" : average >= 80 ? "B" : average >= 70 ? "C" : average >= 60 ? "D" : "F",
        credits: subject.credits || 0,
        effort: average >= 85 ? "Excelente" : average >= 70 ? "Bueno" : "Requiere apoyo",
        behavior: average >= 70 ? "Adecuado" : "Seguimiento requerido",
      };
    });
    const overall = subjectGrades.length ? Math.round(subjectGrades.reduce((sum: number, item: any) => sum + item.average, 0) / subjectGrades.length) : 0;
    return {
      success: true,
      data: {
        student_id: body.student_id,
        student_name: student ? `${student.first_name} ${student.last_name}` : "Alumno demo",
        group_name: student?.group_name || "",
        period: body.period || "current",
        overall_gpa: overall,
        overall_grade: overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "F",
        attendance_rate: Number(student?.attendance_rate || 100),
        subject_grades: subjectGrades,
        comments: [{ teacher_name: "Coordinacion academica", subject: "General", comment: "Boleta generada con datos demo tenant-scoped.", date: new Date().toISOString().slice(0, 10) }],
        generated_at: nowIso(),
      },
    };
  }

  if (path.endsWith("/school-admin/documents") && method === "POST") {
    const body = parseBody(options);
    const students = readMockList("mock_school_students", defaultMockStudents);
    const student = students.find((item: any) => item.id === body.student_id);
    const documents = readMockList("mock_school_documents", []);
    const created = {
      id: `doc-${Date.now()}`,
      student_id: body.student_id,
      student_name: student ? `${student.first_name} ${student.last_name}` : "",
      title: body.title,
      description: body.description || "",
      category: body.category || "other",
      file_name: body.file_name || "",
      file_url: body.file_url || "",
      file_size: Number(body.file_size || 0),
      mime_type: body.mime_type || "application/pdf",
      storage_status: body.storage_status || "digital_only",
      is_verified: false,
      verified_at: "",
      verified_by: "",
      status: "active",
      uploaded_by: "Admin Escuela",
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    writeMockList("mock_school_documents", [created, ...documents]);
    return { success: true, data: created, message: "Documento guardado en modo demo" };
  }

  const schoolDocumentVerifyMatch = path.match(/\/school-admin\/documents\/([^/]+)\/verify$/);
  if (schoolDocumentVerifyMatch && method === "PATCH") {
    const id = decodeURIComponent(schoolDocumentVerifyMatch[1]);
    const documents = readMockList("mock_school_documents", []);
    const updated = documents.map((item: any) => item.id === id ? { ...item, is_verified: true, verified_at: nowIso(), verified_by: "Admin Escuela", updated_at: nowIso() } : item);
    const found = updated.find((item: any) => item.id === id);
    writeMockList("mock_school_documents", updated);
    return { success: true, data: found, message: "Documento verificado en modo demo" };
  }

  const schoolDocumentMatch = path.match(/\/school-admin\/documents\/([^/]+)$/);
  if (schoolDocumentMatch) {
    const id = decodeURIComponent(schoolDocumentMatch[1]);
    const documents = readMockList("mock_school_documents", []);
    if (method === "PUT") {
      const body = parseBody(options);
      const updated = documents.map((item: any) => item.id === id ? {
        ...item,
        title: body.title || item.title,
        description: body.description || "",
        category: body.category || item.category || "other",
        file_name: body.file_name || "",
        file_url: body.file_url || "",
        file_size: Number(body.file_size || 0),
        mime_type: body.mime_type || item.mime_type || "application/pdf",
        storage_status: body.storage_status || item.storage_status || "digital_only",
        updated_at: nowIso(),
      } : item);
      const found = updated.find((item: any) => item.id === id);
      writeMockList("mock_school_documents", updated);
      return { success: true, data: found, message: "Documento actualizado en modo demo" };
    }
    if (method === "DELETE") {
      writeMockList("mock_school_documents", documents.map((item: any) => item.id === id ? { ...item, status: "deleted", updated_at: nowIso() } : item));
      return { success: true, message: "Documento eliminado en modo demo" };
    }
    const students = readMockList("mock_school_students", defaultMockStudents);
    const existing = documents.filter((item: any) => item.student_id === id && item.status !== "deleted");
    const student = students.find((item: any) => item.id === id);
    const fallback = existing.length || !student ? existing : [
      {
        id: `doc-${id}-enrollment`,
        student_id: id,
        student_name: `${student.first_name} ${student.last_name}`,
        title: "Acta de nacimiento",
        description: "Documento de inscripcion",
        category: "enrollment",
        file_name: "acta-nacimiento.pdf",
        file_url: "",
        file_size: 0,
        mime_type: "application/pdf",
        storage_status: "both",
        is_verified: true,
        verified_at: nowIso(),
        verified_by: "Control Escolar",
        status: "active",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ];
    return { success: true, data: fallback };
  }

  if (path.endsWith("/school-admin/reports/metrics")) {
    const reports = readMockList("mock_school_reports", defaultMockReports);
    const students = readMockList("mock_school_students", defaultMockStudents);
    const completed = reports.filter((report) => report.status === "completed");
    const latest = completed[0]?.summary || {};
    return {
      success: true,
      data: {
        total_reports: reports.length,
        completed_reports: completed.length,
        scheduled_reports: reports.filter((report) => report.status === "scheduled").length,
        attendance_rate: latest.attendance_rate ?? 92,
        average_grade: latest.average_grade ?? 87,
        risk_students: latest.risk_students ?? students.filter((student) => (student.average_grade || 0) < 80 || (student.attendance_rate || 0) < 85).length,
      },
    };
  }

  if (path.endsWith("/school-admin/reports/generate")) {
    const reports = readMockList("mock_school_reports", defaultMockReports);
    const body = parseBody(options);
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    const group = groups.find((item) => item.id === body.group_id);
    const typeLabel = {
      attendance: "Asistencia",
      grades: "Calificaciones",
      academic_summary: "Resumen academico",
      behavior: "Conducta",
      financial: "Financiero",
    }[body.type as string] || "Reporte";
    const created = {
      id: `report-${Date.now()}`,
      name: `${typeLabel} - ${group ? `${group.grade_name} ${group.name}` : "Todos los grupos"}`,
      type: body.type || "academic_summary",
      status: "completed",
      format: body.format || "pdf",
      group_id: body.group_id || "all",
      group_name: group ? `${group.grade_name} ${group.name}` : "Todos los grupos",
      start_date: body.start_date || new Date().toISOString().slice(0, 10),
      end_date: body.end_date || new Date().toISOString().slice(0, 10),
      generated_by: "Direccion",
      created_at: nowIso(),
      completed_at: nowIso(),
      summary: {
        attendance_rate: 93,
        average_grade: 88,
        total_students: group?.student_count || readMockList("mock_school_students", defaultMockStudents).length,
        risk_students: 4,
        generated_files: 1,
      },
      insights: [
        "Reporte generado correctamente en modo demo.",
        "Los indicadores estan listos para revision directiva.",
        "Exportacion disponible desde el historial.",
      ],
    };
    writeMockList("mock_school_reports", [created, ...reports]);
    return { success: true, data: created, message: "Reporte generado en modo demo" };
  }

  if (path.endsWith("/school-admin/reports")) {
    const reports = readMockList("mock_school_reports", defaultMockReports);
    const type = url.searchParams.get("type") || "";
    const status = url.searchParams.get("status") || "";
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const filtered = reports.filter((report) => {
      const matchesType = !type || type === "all" || report.type === type;
      const matchesStatus = !status || status === "all" || report.status === status;
      const matchesSearch = !search || `${report.name} ${report.group_name} ${report.generated_by}`.toLowerCase().includes(search);
      return matchesType && matchesStatus && matchesSearch;
    });
    return { success: true, data: filtered };
  }

  const reportExportMatch = path.match(/\/school-admin\/reports\/([^/]+)\/export$/);
  if (reportExportMatch) {
    const id = decodeURIComponent(reportExportMatch[1]);
    const reports = readMockList("mock_school_reports", defaultMockReports);
    const report = reports.find((item) => item.id === id);
    return report
      ? {
          success: true,
          data: {
            filename: `${report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${report.format === "excel" ? "csv" : report.format}`,
            content: JSON.stringify(report, null, 2),
            mime_type: report.format === "excel" || report.format === "csv" ? "text/csv" : "application/json",
          },
        }
      : { success: false, message: "Reporte no encontrado" };
  }

  const reportMatch = path.match(/\/school-admin\/reports\/([^/]+)$/);
  if (reportMatch) {
    const id = decodeURIComponent(reportMatch[1]);
    const reports = readMockList("mock_school_reports", defaultMockReports);
    const report = reports.find((item) => item.id === id);

    if (method === "PUT") {
      const body = parseBody(options);
      const updated = reports.map((item) => item.id === id ? { ...item, ...body } : item);
      writeMockList("mock_school_reports", updated);
      return { success: true, data: updated.find((item) => item.id === id), message: "Reporte actualizado en modo demo" };
    }

    if (method === "DELETE") {
      writeMockList("mock_school_reports", reports.filter((item) => item.id !== id));
      return { success: true, message: "Reporte eliminado en modo demo" };
    }

    return report ? { success: true, data: report } : { success: false, message: "Reporte no encontrado" };
  }

  if (path.endsWith("/school-admin/communications/stats")) {
    const communications = readMockList("mock_school_communications", defaultMockCommunications);
    return {
      success: true,
      data: {
        total_messages: communications.length,
        sent_messages: communications.filter((item) => item.status === "sent").length,
        scheduled_messages: communications.filter((item) => item.status === "scheduled").length,
        draft_messages: communications.filter((item) => item.status === "draft").length,
        delivered_count: communications.reduce((sum, item) => sum + (item.delivered_count || 0), 0),
        read_count: communications.reduce((sum, item) => sum + (item.read_count || 0), 0),
      },
    };
  }

  if (path.endsWith("/school-admin/communications/send")) {
    const communications = readMockList("mock_school_communications", defaultMockCommunications);
    const body = parseBody(options);
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    const group = groups.find((item) => item.id === body.recipient_id);
    const isScheduled = !!body.scheduled_for;
    const recipientLabel = body.recipient_type === "group"
      ? group ? `${group.grade_name} ${group.name}` : "Grupo seleccionado"
      : body.recipient_id === "teachers"
        ? "Profesores"
        : body.recipient_id === "students"
          ? "Estudiantes"
          : "Padres de familia";
    const totalRecipients = body.recipient_type === "group" ? (group?.student_count || 0) : body.recipient_id === "teachers" ? 18 : body.recipient_id === "students" ? 245 : 226;
    const created = {
      id: `comm-${Date.now()}`,
      title: body.title || "",
      content: body.content || "",
      type: body.type || "announcement",
      priority: body.priority || "normal",
      status: isScheduled ? "scheduled" : "sent",
      recipient_type: body.recipient_type || "role",
      recipient_id: body.recipient_id || "parents",
      recipient_label: recipientLabel,
      channels: Array.isArray(body.channels) ? body.channels : ["email"],
      total_recipients: totalRecipients,
      delivered_count: isScheduled ? 0 : totalRecipients,
      read_count: isScheduled ? 0 : Math.round(totalRecipients * 0.62),
      created_at: nowIso(),
      scheduled_for: body.scheduled_for || "",
      sent_at: isScheduled ? "" : nowIso(),
    };
    writeMockList("mock_school_communications", [created, ...communications]);
    return { success: true, data: created, message: isScheduled ? "Comunicado programado en modo demo" : "Comunicado enviado en modo demo" };
  }

  if (path.endsWith("/school-admin/communications")) {
    const communications = readMockList("mock_school_communications", defaultMockCommunications);
    if (method === "POST") {
      const body = parseBody(options);
      const groups = readMockList("mock_school_groups", mockSchoolGroups);
      const group = groups.find((item) => item.id === body.recipient_id);
      const recipientLabel = body.recipient_type === "group"
        ? group ? `${group.grade_name} ${group.name}` : "Grupo seleccionado"
        : body.recipient_id === "teachers"
          ? "Profesores"
          : body.recipient_id === "students"
            ? "Estudiantes"
            : "Padres de familia";
      const totalRecipients = body.recipient_type === "group" ? (group?.student_count || 0) : body.recipient_id === "teachers" ? 18 : body.recipient_id === "students" ? 245 : 226;
      const created = {
        id: `comm-${Date.now()}`,
        title: body.title || "",
        content: body.content || "",
        type: body.type || "announcement",
        priority: body.priority || "normal",
        status: "draft",
        recipient_type: body.recipient_type || "role",
        recipient_id: body.recipient_id || "parents",
        recipient_label: recipientLabel,
        channels: Array.isArray(body.channels) ? body.channels : ["email"],
        total_recipients: totalRecipients,
        delivered_count: 0,
        read_count: 0,
        created_at: nowIso(),
        scheduled_for: "",
        sent_at: "",
      };
      writeMockList("mock_school_communications", [created, ...communications]);
      return { success: true, data: created, message: "Borrador guardado en modo demo" };
    }
    const type = url.searchParams.get("type") || "";
    const status = url.searchParams.get("status") || "";
    const priority = url.searchParams.get("priority") || "";
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const filtered = communications.filter((item) => {
      const matchesType = !type || type === "all" || item.type === type;
      const matchesStatus = !status || status === "all" || item.status === status;
      const matchesPriority = !priority || priority === "all" || item.priority === priority;
      const matchesSearch = !search || `${item.title} ${item.content} ${item.recipient_label}`.toLowerCase().includes(search);
      return matchesType && matchesStatus && matchesPriority && matchesSearch;
    });
    return { success: true, data: filtered };
  }

  const communicationMatch = path.match(/\/school-admin\/communications\/([^/]+)$/);
  if (communicationMatch) {
    const id = decodeURIComponent(communicationMatch[1]);
    const communications = readMockList("mock_school_communications", defaultMockCommunications);
    const item = communications.find((message) => message.id === id);

    if (method === "PUT") {
      const body = parseBody(options);
      const updated = communications.map((message) => message.id === id ? { ...message, ...body } : message);
      writeMockList("mock_school_communications", updated);
      return { success: true, data: updated.find((message) => message.id === id), message: "Comunicacion actualizada en modo demo" };
    }

    if (method === "DELETE") {
      writeMockList("mock_school_communications", communications.filter((message) => message.id !== id));
      return { success: true, message: "Comunicacion eliminada en modo demo" };
    }

    return item ? { success: true, data: item } : { success: false, message: "Comunicacion no encontrada" };
  }

  const groupMatch = path.match(/\/school-admin\/academic\/groups\/([^/]+)$/);
  if (groupMatch) {
    const id = decodeURIComponent(groupMatch[1]);
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    const group = groups.find((item) => item.id === id);

    if (method === "PUT") {
      const body = parseBody(options);
      const grade = mockGradeLevels.find((item) => item.id === body.grade_level_id);
      const years = readMockList("mock_school_years", defaultMockSchoolYears);
      const year = years.find((item) => item.id === body.school_year_id);
      const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
      const teacherIDs = Array.isArray(body.teacher_ids) ? body.teacher_ids : body.teacher_id ? [body.teacher_id] : undefined;
      const primaryTeacher = teacherIDs ? teachers.find((item) => item.id === teacherIDs[0]) : undefined;
      const updated = groups.map((item) =>
        item.id === id
          ? {
              ...item,
              ...body,
              grade_name: grade?.name ?? item.grade_name,
              school_year: year?.name ?? item.school_year,
              teacher_ids: teacherIDs ?? item.teacher_ids,
              teacher_id: primaryTeacher?.id ?? item.teacher_id,
              teacher_name: primaryTeacher ? `${primaryTeacher.first_name} ${primaryTeacher.last_name}` : item.teacher_name,
              max_students: body.max_students !== undefined ? Number(body.max_students) : item.max_students,
              student_count: Array.isArray(body.student_ids) ? body.student_ids.length : item.student_count,
            }
          : item
      );
      writeMockList("mock_school_groups", updated);
      return { success: true, data: updated.find((item) => item.id === id), message: "Grupo actualizado en modo demo" };
    }

    if (method === "DELETE") {
      writeMockList("mock_school_groups", groups.filter((item) => item.id !== id));
      return { success: true, message: "Grupo eliminado en modo demo" };
    }

    return group
      ? {
          success: true,
          data: {
            ...group,
            students: readMockList("mock_school_students", defaultMockStudents).filter((student) => (group.student_ids || []).includes(student.id) || student.group_id === id),
            teachers: readMockList("mock_school_teachers", defaultMockTeachers).filter((teacher) => (group.teacher_ids || (group.teacher_id ? [group.teacher_id] : [])).includes(teacher.id)),
            subjects: readMockList("mock_school_subjects", defaultMockSubjects).filter((subject) => (group.subject_ids || []).includes(subject.id)),
            recent_activity: [],
          },
        }
      : { success: false, message: "Grupo no encontrado" };
  }

  if (path.endsWith("/school-admin/academic/imports/students/commit")) {
    const students = readMockList("mock_school_students", defaultMockStudents);
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    const years = readMockList("mock_school_years", defaultMockSchoolYears);
    const history = readMockList("mock_student_academic_history", []);
    const body = parseBody(options);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const imported = rows.map((row: any, index: number) => {
      const group = groups.find((item) =>
        item.name?.toLowerCase() === String(row.group_name || "").toLowerCase() ||
        `${item.grade_name} ${item.name}`.toLowerCase() === String(row.group_name || "").toLowerCase()
      );
      const parents = buildMockParentsFromBody({
        parents: [
          {
            first_name: row.parent1_first_name,
            paternal_last_name: row.parent1_paternal_last_name,
            maternal_last_name: row.parent1_maternal_last_name,
            email: row.parent1_email,
            phone: row.parent1_phone,
            relationship: "mother",
            is_primary: true,
          },
          row.parent2_first_name || row.parent2_email
            ? {
                first_name: row.parent2_first_name,
                paternal_last_name: row.parent2_paternal_last_name,
                maternal_last_name: row.parent2_maternal_last_name,
                email: row.parent2_email,
                phone: row.parent2_phone,
                relationship: "father",
                is_primary: false,
              }
            : null,
        ].filter(Boolean),
      });
      const birthDate = row.birth_year && row.birth_month && row.birth_day
        ? `${String(row.birth_year).padStart(4, "0")}-${String(row.birth_month).padStart(2, "0")}-${String(row.birth_day).padStart(2, "0")}`
        : "";
      const student = {
        id: `student-import-${Date.now()}-${index}`,
        first_name: row.first_name,
        paternal_last_name: row.paternal_last_name,
        maternal_last_name: row.maternal_last_name,
        last_name: [row.paternal_last_name, row.maternal_last_name].filter(Boolean).join(" "),
        email: "",
        phone: "",
        enrollment_id: row.enrollment_id,
        status: "active",
        group_id: group?.id || "",
        group_name: group?.name || row.group_name || "",
        grade_name: group?.grade_name || row.history_grade_name || "",
        parent_name: parents[0] ? `${parents[0].first_name} ${parents[0].paternal_last_name} ${parents[0].maternal_last_name}`.trim() : "",
        parent_email: parents[0]?.email || "",
        parent_phone: parents[0]?.phone || "",
        parents,
        birth_day: row.birth_day,
        birth_month: row.birth_month,
        birth_year: row.birth_year,
        birth_date: birthDate,
        address: row.address || "",
        attendance_rate: Number(row.history_attendance_rate || 100),
        average_grade: Number(row.history_average_grade || 0),
        total_absences: Number(row.history_absences || 0),
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      const year = years.find((item) => item.name === row.school_year) || years.find((item) => item.is_current) || years[0];
      if (year) {
        history.push({
          id: `${student.id}-${year.id}`,
          student_id: student.id,
          school_year_id: year.id,
          school_year: year.name,
          grade_name: row.history_grade_name || student.grade_name,
          group_name: row.history_group_name || student.group_name,
          status: "imported",
          average_grade: Number(row.history_average_grade || 0),
          attendance_rate: Number(row.history_attendance_rate || 0),
          absences: Number(row.history_absences || 0),
          notes: `Importado desde ${body.source_sheet || "Excel"}`,
        });
      }
      return student;
    });
    writeMockList("mock_school_students", [...imported, ...students]);
    writeMockList("mock_student_academic_history", history);
    return { success: true, data: { imported: imported.length, total: rows.length }, message: "Importacion completada en modo demo" };
  }

  if (path.endsWith("/school-admin/academic/students")) {
    const students = readMockList("mock_school_students", defaultMockStudents);
    if (method === "POST") {
      const body = parseBody(options);
      const group = readMockList("mock_school_groups", mockSchoolGroups).find((item) => item.id === body.group_id);
      const parents = buildMockParentsFromBody(body);
      const created = {
        id: `student-${Date.now()}`,
        first_name: body.first_name,
        paternal_last_name: body.paternal_last_name || body.last_name || "",
        maternal_last_name: body.maternal_last_name || "",
        last_name: body.last_name || [body.paternal_last_name, body.maternal_last_name].filter(Boolean).join(" "),
        email: body.email || "",
        phone: body.phone || "",
        enrollment_id: body.enrollment_id,
        status: body.status || "active",
        group_id: body.group_id || "",
        group_name: group?.name || "",
        grade_name: group?.grade_name || "",
        parent_name: body.parent_name,
        parent_email: body.parent_email,
        parent_phone: body.parent_phone,
        parents,
        birth_day: body.birth_day || "",
        birth_month: body.birth_month || "",
        birth_year: body.birth_year || "",
        birth_date: body.birth_date,
        address: body.address || "",
        attendance_rate: 100,
        average_grade: 0,
        total_absences: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      writeMockList("mock_school_students", [created, ...students]);
      return { success: true, data: created, message: "Estudiante matriculado en modo demo" };
    }

    const search = (url.searchParams.get("search") || "").toLowerCase();
    const status = url.searchParams.get("status") || "";
    const groupID = url.searchParams.get("group_id") || "";
    const gradeID = url.searchParams.get("grade_id") || "";
    const sortBy = url.searchParams.get("sort_by") || "";
    const sortDir = url.searchParams.get("sort_dir") || "asc";
    const page = Number(url.searchParams.get("page") || "1");
    const perPage = Number(url.searchParams.get("per_page") || "20");
    let filtered = students.filter((student) => {
      const matchesSearch = !search || `${student.first_name} ${student.paternal_last_name || ""} ${student.maternal_last_name || ""} ${student.last_name} ${student.enrollment_id} ${student.parent_name}`.toLowerCase().includes(search);
      const matchesStatus = !status || status === "all" || student.status === status;
      const matchesGroup = !groupID || groupID === "all" || student.group_id === groupID;
      const matchesGrade = !gradeID || gradeID === "all" || student.grade_id === gradeID || student.grade_name === gradeID;
      return matchesSearch && matchesStatus && matchesGroup && matchesGrade;
    });
    filtered = [...filtered].sort((a: any, b: any) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortBy === "grade") return `${a.grade_name} ${a.group_name}`.localeCompare(`${b.grade_name} ${b.group_name}`) * dir;
      if (sortBy === "attendance") return (Number(b.attendance_rate || 0) - Number(a.attendance_rate || 0)) * dir;
      if (sortBy === "average") return (Number(b.average_grade || 0) - Number(a.average_grade || 0)) * dir;
      if (sortBy === "name") return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`) * dir;
      return 0;
    });
    const { items, meta } = paginate(filtered, page, perPage);
    return { success: true, data: items, meta };
  }

  const studentHistoryMatch = path.match(/\/school-admin\/academic\/students\/([^/]+)\/history$/);
  if (studentHistoryMatch) {
    const id = decodeURIComponent(studentHistoryMatch[1]);
    const students = readMockList("mock_school_students", defaultMockStudents);
    const student = students.find((item) => item.id === id);
    return student
      ? { success: true, data: buildMockStudentHistory(student) }
      : { success: false, message: "Estudiante no encontrado" };
  }

  const studentScheduleMatch = path.match(/\/school-admin\/academic\/students\/([^/]+)\/schedule$/);
  if (studentScheduleMatch) {
    const id = decodeURIComponent(studentScheduleMatch[1]);
    const student = readMockList("mock_school_students", defaultMockStudents).find((item: any) => item.id === id);
    const blocks = readMockList("mock_school_schedule", defaultMockScheduleBlocks).filter((block: any) => !student?.group_id || block.group_id === student.group_id);
    return { success: true, data: blocks };
  }

  const studentMatch = path.match(/\/school-admin\/academic\/students\/([^/]+)$/);
  if (studentMatch) {
    const id = decodeURIComponent(studentMatch[1]);
    const students = readMockList("mock_school_students", defaultMockStudents);
    const student = students.find((item) => item.id === id);

    if (method === "PUT") {
      const body = parseBody(options);
      const group = readMockList("mock_school_groups", mockSchoolGroups).find((item) => item.id === body.group_id);
      const parents = body.parents ? buildMockParentsFromBody(body) : undefined;
      const updated = students.map((item) =>
        item.id === id
          ? {
              ...item,
              ...body,
              parents: parents ?? item.parents,
              last_name: body.last_name || [body.paternal_last_name ?? item.paternal_last_name ?? item.last_name, body.maternal_last_name ?? item.maternal_last_name].filter(Boolean).join(" "),
              group_name: group?.name ?? item.group_name,
              grade_name: group?.grade_name ?? item.grade_name,
              updated_at: nowIso(),
            }
          : item
      );
      writeMockList("mock_school_students", updated);
      return {
        success: true,
        data: updated.find((item) => item.id === id),
        message: "Estudiante actualizado en modo demo",
      };
    }

    if (method === "DELETE") {
      writeMockList("mock_school_students", students.filter((item) => item.id !== id));
      return { success: true, message: "Estudiante eliminado en modo demo" };
    }

    return student
      ? {
          success: true,
          data: {
            ...student,
            recent_grades: [
              { id: `${id}-grade-1`, type: "exam", score: student.average_grade || 88, max_score: 100, description: "Evaluacion parcial", weight: 40, date: "2026-04-20", teacher_name: "Maria Lopez", created_at: nowIso() },
            ],
            recent_attendance: [
              { date: "2026-04-28", status: "present", notes: "" },
              { date: "2026-04-27", status: "present", notes: "" },
            ],
            academic_history: buildMockStudentHistory(student),
          },
        }
      : { success: false, message: "Estudiante no encontrado" };
  }

  if (path.endsWith("/school-admin/academic/teachers")) {
    const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
    if (method === "POST") {
      const body = parseBody(options);
      const created = {
        id: `teacher-${Date.now()}`,
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        employee_id: body.employee_id,
        status: body.status || "active",
        specialties: Array.isArray(body.specialties) ? body.specialties : [],
        group_count: 0,
        hire_date: body.hire_date || new Date().toISOString().slice(0, 10),
        created_at: nowIso(),
        address: body.address || "",
        salary: Number(body.salary || 0),
      };
      writeMockList("mock_school_teachers", [created, ...teachers]);
      return { success: true, data: created, message: "Profesor registrado en modo demo" };
    }
    return { success: true, data: teachers };
  }

  const teacherMatch = path.match(/\/school-admin\/academic\/teachers\/([^/]+)$/);
  if (teacherMatch) {
    const id = decodeURIComponent(teacherMatch[1]);
    const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
    const teacher = teachers.find((item) => item.id === id);

    if (method === "PUT") {
      const body = parseBody(options);
      const updated = teachers.map((item) =>
        item.id === id
          ? {
              ...item,
              ...body,
              specialties: Array.isArray(body.specialties) ? body.specialties : item.specialties,
              salary: body.salary !== undefined ? Number(body.salary) : item.salary,
            }
          : item
      );
      writeMockList("mock_school_teachers", updated);
      return {
        success: true,
        data: updated.find((item) => item.id === id),
        message: "Profesor actualizado en modo demo",
      };
    }

    return teacher
      ? {
          success: true,
          data: {
            ...teacher,
            groups: [],
            subjects: [],
            performance: {
              student_count: teacher.group_count * 24,
              attendance_rate: 94,
              average_grade: 88,
              student_satisfaction: 4.6,
            },
          },
        }
      : { success: false, message: "Profesor no encontrado" };
  }

  return { success: false, message: "Endpoint School Admin demo no implementado" };
}

async function mockSuperAdminFetch(endpoint: string, options: RequestInit = {}) {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const method = (options.method || "GET").toUpperCase();
  const url = new URL(endpoint, "https://mock.educore.local");
  const path = url.pathname;

  const enterpriseModules = modulesCatalog.map((mod, index) => ({
    ...mod,
    id: mod.key,
    status: mod.enabled === false ? "inactive" : index > 9 ? "in_development" : "active",
    version: index < 8 ? "1.0.0" : "0.9.0",
    dependencies: (mod as any).dependencies || (mod.is_core ? [] : ["academic_core"]),
    required_level: (mod as any).required_level || ((mod as any).layer === "level" ? mod.key : "all"),
    global_enabled: mod.enabled !== false,
    active_tenants: mod.is_core ? 3 : 1,
    error_rate: index % 4 === 0 ? 1.8 : 0.2,
  }));

  const enterpriseSubscriptions = defaultMockSchools.map((school) => {
    const plan = defaultMockPlans.find((item) => item.id === school.plan) || defaultMockPlans[0];
    return {
      id: `sub-${school.id}`,
      tenant_id: school.id,
      tenant_name: school.name,
      plan_id: plan.id,
      status: school.status === "active" ? "active" : school.status,
      billing_cycle: "monthly",
      price_monthly: plan.price_monthly,
      discount_percent: plan.id === "enterprise" ? 10 : 0,
      max_students: plan.max_students,
      max_teachers: plan.max_teachers,
      storage_limit_mb: plan.id === "enterprise" ? 51200 : 10240,
      current_period_end: "2026-05-29T00:00:00.000Z",
      created_at: school.created_at,
    };
  });

  const enterpriseAuditLogs = [
    { id: "audit-1", created_at: nowIso(), user: "admin@educore.mx", action: "module.toggle", resource: "reports", severity: "warning", ip_address: "127.0.0.1" },
    { id: "audit-2", created_at: "2026-04-29T12:20:00.000Z", user: "admin@educore.mx", action: "impersonation.start", resource: "school@educore.mx", severity: "critical", ip_address: "127.0.0.1" },
    { id: "audit-3", created_at: "2026-04-29T11:42:00.000Z", user: "operaciones@educore.mx", action: "billing.manual_payment", resource: "school-don-bosco", severity: "warning", ip_address: "127.0.0.1" },
  ];

  if (path.endsWith("/super-admin/dashboard/overview")) {
    const schools = readMockList("mock_schools", defaultMockSchools);
    const users = readMockList("mock_users", defaultMockUsers);
    const subscriptions = readMockList("mock_enterprise_subscriptions", enterpriseSubscriptions);
    const mrr = subscriptions.reduce((sum, sub) => sum + (sub.status === "active" ? Number(sub.price_monthly || 0) : 0), 0);
    return {
      success: true,
      data: {
        total_tenants: schools.length,
        active_tenants: schools.filter((school) => school.status === "active").length,
        trial_tenants: schools.filter((school) => school.status === "trial").length,
        total_students: schools.reduce((sum, school) => sum + (school.total_students || 0), 0),
        total_users: users.length + schools.reduce((sum, school) => sum + (school.total_users || 0), 0),
        active_sessions: 42,
        mrr_mxn: mrr,
        arr_mxn: mrr * 12,
        churn_risk_avg: 28,
        recent_schools: schools.slice(0, 5),
        module_usage: enterpriseModules.slice(0, 6),
        risky_institutions: schools.map((school, index) => ({ ...school, risk_score: index === 1 ? 62 : 18 + index * 8 })).slice(0, 4),
        health: [
          { module_key: "auth", status: "healthy", severity: "info", latency_ms: 82, error_rate: 0.1 },
          { module_key: "reports", status: "degraded", severity: "warning", latency_ms: 680, error_rate: 2.5 },
        ],
        alerts: [
          { id: "alert-health", message: "Reportes con latencia elevada en modo demo", severity: "warning" },
        ],
      },
    };
  }

  if (path.endsWith("/super-admin/stats")) {
    const schools = readMockList("mock_schools", defaultMockSchools);
    return {
      success: true,
      data: {
        total_tenants: schools.length,
        active_tenants: schools.filter((school) => school.status === "active").length,
        trial_tenants: schools.filter((school) => school.status === "trial").length,
        total_students: schools.reduce((sum, school) => sum + (school.total_students || 0), 0),
        mrr_mxn: 0,
        recent_schools: schools.slice(0, 5),
        alerts: [],
      },
    };
  }

  if (path.endsWith("/super-admin/modules-catalog")) {
    return { success: true, data: { modules: modulesCatalog } };
  }

  if (path.endsWith("/super-admin/modules")) {
    return {
      success: true,
      data: {
        modules: readMockList("mock_enterprise_modules", enterpriseModules),
        total_modules: enterpriseModules.length,
        active_modules: enterpriseModules.filter((mod) => mod.status === "active").length,
      },
    };
  }

  if (path.endsWith("/super-admin/modules/usage") || path.endsWith("/super-admin/analytics/module-usage")) {
    return {
      success: true,
      data: {
        modules: enterpriseModules.map((mod, index) => ({
          id: `usage-${mod.key}`,
          module_key: mod.key,
          name: mod.name,
          active_tenants: mod.active_tenants,
          requests_30d: 1200 - index * 67,
          error_rate: mod.error_rate,
        })),
      },
    };
  }

  const globalModuleMatch = path.match(/\/super-admin\/modules\/([^/]+)\/global$/);
  if (globalModuleMatch && method === "PATCH") {
    return { success: true, message: "Modulo global actualizado en modo demo" };
  }

  const schoolModuleMatch = path.match(/\/super-admin\/schools\/([^/]+)\/modules\/([^/]+)$/);
  if (schoolModuleMatch && method === "PATCH") {
    return { success: true, message: "Modulo de institucion actualizado en modo demo" };
  }

  if (path.endsWith("/super-admin/global-users")) {
    return { success: true, data: { users: readMockList("mock_users", defaultMockUsers) } };
  }

  const globalUserActionMatch = path.match(/\/super-admin\/global-users\/([^/]+)\/(reset-password|force-logout)$/);
  if (globalUserActionMatch && method === "POST") {
    return {
      success: true,
      data: globalUserActionMatch[2] === "reset-password" ? { temporary_password: "EduCore-Temp-2026" } : {},
      message: globalUserActionMatch[2] === "reset-password" ? "Password temporal generado en modo demo" : "Sesiones cerradas en modo demo",
    };
  }

  if (path.endsWith("/super-admin/impersonation/start") && method === "POST") {
    const body = parseBody(options);
    const sessions = readMockList<any>("mock_impersonation_sessions", []);
    const created = {
      id: `imp-${Date.now()}`,
      acting_user: "admin@educore.mx",
      target_user: body.target_user_id || "usuario-demo",
      tenant_name: "EduCore",
      reason: body.reason || "Soporte SuperAdmin",
      status: "active",
      started_at: nowIso(),
      ended_at: null,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    writeMockList("mock_impersonation_sessions", [created, ...sessions]);
    return { success: true, data: { session_id: created.id, target_user: created.target_user, expires_in_minutes: 30 }, message: "Impersonation iniciado en modo demo" };
  }

  if (path.endsWith("/super-admin/impersonation/stop") && method === "POST") {
    const sessions = readMockList<any>("mock_impersonation_sessions", []);
    writeMockList("mock_impersonation_sessions", sessions.map((session) => ({ ...session, status: "ended", ended_at: nowIso() })));
    return { success: true, message: "Impersonation detenido en modo demo" };
  }

  if (path.endsWith("/super-admin/impersonation/audit")) {
    return {
      success: true,
      data: {
        sessions: readMockList("mock_impersonation_sessions", [
          { id: "imp-demo", acting_user: "admin@educore.mx", target_user: "school@educore.mx", tenant_name: "Instituto Tecnologico Don Bosco", reason: "Soporte de configuracion", status: "ended", started_at: "2026-04-29T12:00:00.000Z", ended_at: "2026-04-29T12:10:00.000Z", expires_at: "2026-04-29T12:30:00.000Z" },
        ]),
      },
    };
  }

  if (path.endsWith("/super-admin/billing/subscriptions")) {
    return { success: true, data: { subscriptions: readMockList("mock_enterprise_subscriptions", enterpriseSubscriptions) } };
  }

  if (path.endsWith("/super-admin/billing/invoices")) {
    const invoices = readMockList("mock_enterprise_invoices", defaultMockSchools.map((school, index) => ({
      id: `invoice-${index + 1}`,
      tenant_id: school.id,
      tenant_name: school.name,
      folio: `EDU-2026-00${index + 1}`,
      status: index === 1 ? "pending" : "paid",
      total: index === 1 ? 899 : 1899,
      due_date: "2026-05-05T00:00:00.000Z",
      paid_at: index === 1 ? null : "2026-04-29T10:00:00.000Z",
      created_at: "2026-04-29T10:00:00.000Z",
    })));
    return {
      success: true,
      data: {
        invoices,
      },
    };
  }

  if (path.endsWith("/super-admin/billing/invoices/generate") && method === "POST") {
    const body = parseBody(options);
    const school = defaultMockSchools.find((item) => item.id === body.tenant_id) || defaultMockSchools[0];
    const invoices = readMockList<any>("mock_enterprise_invoices", []);
    const created = {
      id: `invoice-${Date.now()}`,
      tenant_id: body.tenant_id || school.id,
      tenant_name: school.name,
      folio: `EDU-${Date.now()}`,
      status: "pending",
      total: Number(body.total || 0),
      due_date: body.due_date || "2026-05-05T00:00:00.000Z",
      paid_at: null,
      created_at: nowIso(),
    };
    writeMockList("mock_enterprise_invoices", [created, ...invoices]);
    return { success: true, data: created, message: "Invoice generado en modo demo" };
  }

  const markInvoicePaidMatch = path.match(/\/super-admin\/billing\/invoices\/([^/]+)\/mark-paid$/);
  if (markInvoicePaidMatch && method === "POST") {
    const id = decodeURIComponent(markInvoicePaidMatch[1]);
    const invoices = readMockList<any>("mock_enterprise_invoices", []);
    writeMockList("mock_enterprise_invoices", invoices.map((invoice) => invoice.id === id ? { ...invoice, status: "paid", paid_at: nowIso() } : invoice));
    return { success: true, message: "Invoice marcado como pagado en modo demo" };
  }

  if (path.endsWith("/super-admin/billing/payments/manual") && method === "POST") {
    return { success: true, data: { id: `payment-${Date.now()}` }, message: "Pago manual registrado en modo demo" };
  }

  if (path.endsWith("/super-admin/billing/reminders") && method === "POST") {
    return { success: true, data: { queued: true }, message: "Recordatorios enviados en modo demo" };
  }

  if (path.endsWith("/super-admin/billing/reports/monthly")) {
    const invoices = readMockList<any>("mock_enterprise_invoices", []);
    const invoiceSource = invoices.length > 0 ? invoices : defaultMockSchools.map((school, index) => ({
      id: `invoice-${index + 1}`,
      status: index === 1 ? "pending" : "paid",
      total: index === 1 ? 899 : 1899,
      created_at: "2026-04-29T10:00:00.000Z",
    }));
    const total = invoiceSource.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const paid = invoiceSource.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    return {
      success: true,
      data: {
        reports: [
          { month: "2026-04", invoices: invoiceSource.length, total, paid, pending: total - paid },
          { month: "2026-03", invoices: 3, total: 4697, paid: 4697, pending: 0 },
        ],
      },
    };
  }

  if (path.endsWith("/super-admin/analytics/kpis")) {
    const subscriptions = readMockList("mock_enterprise_subscriptions", enterpriseSubscriptions);
    const mrr = subscriptions.reduce((sum, sub) => sum + Number(sub.price_monthly || 0), 0);
    return { success: true, data: { mrr_mxn: mrr, arr_mxn: mrr * 12, churn_rate: 4.2, active_sessions: 42 } };
  }

  if (path.endsWith("/super-admin/analytics/growth")) {
    return {
      success: true,
      data: {
        growth: ["Nov", "Dic", "Ene", "Feb", "Mar", "Abr"].map((month, index) => ({ month, institutions: 2 + index, users: 80 + index * 42 })),
      },
    };
  }

  if (path.endsWith("/super-admin/analytics/churn-risk")) {
    const schools = readMockList("mock_schools", defaultMockSchools);
    return {
      success: true,
      data: {
        institutions: schools.map((school, index) => ({
          ...school,
          last_activity_at: index === 1 ? "2026-04-19T09:00:00.000Z" : nowIso(),
          active_modules: school.plan === "enterprise" ? 12 : 7,
          open_tickets: index === 1 ? 3 : 0,
          risk_score: index === 1 ? 72 : 18 + index * 9,
        })),
      },
    };
  }

  if (path.endsWith("/super-admin/health/modules")) {
    return {
      success: true,
      data: {
        modules: [
          { id: "health-auth", module_key: "auth", tenant_name: "Global", status: "healthy", severity: "info", error_rate: 0.1, latency_ms: 82, message: "Auth estable", created_at: nowIso() },
          { id: "health-reports", module_key: "reports", tenant_name: "Instituto Tecnologico Don Bosco", status: "degraded", severity: "warning", error_rate: 2.5, latency_ms: 680, message: "Export demo lento", created_at: nowIso() },
        ],
      },
    };
  }

  if (path.endsWith("/super-admin/health/system")) {
    return { success: true, data: { status: "healthy", api_latency_ms: 94, database_status: "connected", redis_status: "connected" } };
  }

  if (path.endsWith("/super-admin/health/events") && method === "POST") {
    return { success: true, data: { id: `health-${Date.now()}` }, message: "Evento de salud registrado en modo demo" };
  }

  if (path.endsWith("/super-admin/logs/audit")) {
    return { success: true, data: { logs: readMockList("mock_enterprise_audit_logs", enterpriseAuditLogs) } };
  }

  if (path.endsWith("/super-admin/logs/errors")) {
    return { success: true, data: { errors: enterpriseAuditLogs.filter((log) => log.severity !== "warning") } };
  }

  if (path.endsWith("/super-admin/logs/activity")) {
    return { success: true, data: { activity: enterpriseAuditLogs } };
  }

  if (path.endsWith("/super-admin/support/tickets")) {
    const tickets = readMockList("mock_support_tickets", [
      { id: "ticket-1", title: "Revision de acceso a reportes", tenant_name: "Instituto Tecnologico Don Bosco", status: "open", priority: "high", module_key: "reports", created_at: "2026-04-29T09:30:00.000Z", resolved_at: null },
      { id: "ticket-2", title: "Ajuste de limite de storage", tenant_name: "Colegio San Miguel", status: "in_progress", priority: "medium", module_key: "storage", created_at: "2026-04-28T16:00:00.000Z", resolved_at: null },
    ]);
    if (method === "POST") {
      const body = parseBody(options);
      const created = { id: `ticket-${Date.now()}`, tenant_name: "EduCore interno", created_at: nowIso(), resolved_at: null, ...body };
      writeMockList("mock_support_tickets", [created, ...tickets]);
      return { success: true, data: created, message: "Ticket creado en modo demo" };
    }
    return { success: true, data: { tickets } };
  }

  if (path.endsWith("/super-admin/storage/usage")) {
    return {
      success: true,
      data: {
        usage: defaultMockSchools.map((school, index) => ({
          id: `storage-${school.id}`,
          tenant_name: school.name,
          used_mb: 1200 + index * 830,
          storage_limit_mb: school.plan === "enterprise" ? 51200 : 10240,
          file_count: 420 + index * 95,
        })),
      },
    };
  }

  if (path.endsWith("/super-admin/storage/archive") && method === "POST") {
    return { success: true, data: { id: `archive-${Date.now()}` }, message: "Archivado demo solicitado" };
  }

  if (path.endsWith("/super-admin/feature-flags")) {
    const flags = readMockList("mock_feature_flags", [
      { id: "flag-1", key: "enterprise_dashboard", name: "Dashboard Enterprise", enabled: true, rollout_percentage: 100, updated_at: nowIso() },
      { id: "flag-2", key: "impersonation_mode", name: "Impersonation Mode", enabled: true, rollout_percentage: 100, updated_at: nowIso() },
      { id: "flag-3", key: "level_extensions", name: "Extensiones por nivel", enabled: false, rollout_percentage: 25, updated_at: nowIso() },
    ]);
    if (method === "POST" || method === "PUT") {
      const body = parseBody(options);
      const created = { id: `flag-${Date.now()}`, updated_at: nowIso(), ...body };
      writeMockList("mock_feature_flags", [created, ...flags]);
      return { success: true, data: created, message: "Feature flag guardado en modo demo" };
    }
    return { success: true, data: { flags } };
  }

  const featureFlagScopeMatch = path.match(/\/super-admin\/feature-flags\/([^/]+)\/scope$/);
  if (featureFlagScopeMatch && method === "PATCH") {
    return { success: true, message: "Scope actualizado en modo demo" };
  }

  if (path.endsWith("/super-admin/backups")) {
    const backups = readMockList("mock_backup_jobs", [
      { id: "backup-1", tenant_name: "Global", type: "full", status: "completed", size_mb: 2840, created_at: "2026-04-29T03:00:00.000Z", completed_at: "2026-04-29T03:08:00.000Z" },
      { id: "backup-2", tenant_name: "Instituto Tecnologico Don Bosco", type: "tenant", status: "completed", size_mb: 920, created_at: "2026-04-28T03:00:00.000Z", completed_at: "2026-04-28T03:04:00.000Z" },
    ]);
    if (method === "POST") {
      const body = parseBody(options);
      const created = { id: `backup-${Date.now()}`, tenant_name: "Global", type: body.type || "full", status: "queued", size_mb: 0, created_at: nowIso(), completed_at: null };
      writeMockList("mock_backup_jobs", [created, ...backups]);
      return { success: true, data: created, message: "Backup solicitado en modo demo" };
    }
    return { success: true, data: { backups } };
  }

  const restoreBackupMatch = path.match(/\/super-admin\/backups\/([^/]+)\/restore$/);
  if (restoreBackupMatch && method === "POST") {
    return { success: true, message: "Restore registrado en modo demo" };
  }

  if (path.endsWith("/super-admin/version")) {
    return {
      success: true,
      data: {
        versions: [
          { id: "version-current", version: "2026.04.29-enterprise", status: "current", changelog: "SuperAdmin enterprise control plane", deployed_at: nowIso() },
          { id: "version-prev", version: "2026.04.28-core", status: "previous", changelog: "Core modular School Admin", deployed_at: "2026-04-28T19:30:00.000Z" },
        ],
      },
    };
  }

  if (path.endsWith("/super-admin/version/deploy") && method === "POST") {
    return { success: true, data: { id: `deploy-${Date.now()}` }, message: "Deploy registrado en modo demo" };
  }

  if (path.endsWith("/super-admin/version/rollback") && method === "POST") {
    return { success: true, data: { id: `rollback-${Date.now()}` }, message: "Rollback registrado en modo demo" };
  }

  if (path.includes("/super-admin/system/")) {
    if (method === "PUT") return { success: true, message: "Configuracion global guardada en modo demo" };
    return { success: true, data: { settings: { maintenance_mode: false, platform_name: "EduCore SaaS", timezone: "America/Mexico_City" } } };
  }

  const databaseTables = [
    { name: "tenants", estimated_rows: defaultMockSchools.length, is_hidden: false, is_protected: false },
    { name: "users", estimated_rows: defaultMockUsers.length, is_hidden: false, is_protected: false },
    { name: "students", estimated_rows: readMockList("mock_school_students", defaultMockStudents).length, is_hidden: false, is_protected: false },
    { name: "parent_student", estimated_rows: 6, is_hidden: false, is_protected: false },
    { name: "school_years", estimated_rows: readMockList("mock_school_years", defaultMockSchoolYears).length, is_hidden: false, is_protected: false },
    { name: "groups", estimated_rows: readMockList("mock_school_groups", mockSchoolGroups).length, is_hidden: false, is_protected: false },
    { name: "subjects", estimated_rows: readMockList("mock_school_subjects", defaultMockSubjects).length, is_hidden: false, is_protected: false },
    { name: "attendance_records", estimated_rows: readMockList("mock_school_attendance", []).length, is_hidden: false, is_protected: false },
    { name: "grade_records", estimated_rows: readMockList("mock_school_grades", []).length, is_hidden: false, is_protected: false },
    { name: "audit_logs", estimated_rows: enterpriseAuditLogs.length, is_hidden: false, is_protected: true },
    { name: "invoices", estimated_rows: defaultMockSchools.length, is_hidden: false, is_protected: false },
  ];

  const databaseRows: Record<string, any[]> = {
    tenants: readMockList("mock_schools", defaultMockSchools),
    users: readMockList("mock_users", defaultMockUsers),
    students: readMockList("mock_school_students", defaultMockStudents),
    parent_student: [
      { id: "ps-1", tenant_id: "school-don-bosco", parent_id: "parent-1", student_id: "student-1", relationship: "mother", is_primary: true },
      { id: "ps-2", tenant_id: "school-don-bosco", parent_id: "parent-2", student_id: "student-2", relationship: "father", is_primary: true },
    ],
    school_years: readMockList("mock_school_years", defaultMockSchoolYears),
    groups: readMockList("mock_school_groups", mockSchoolGroups),
    subjects: readMockList("mock_school_subjects", defaultMockSubjects),
    attendance_records: readMockList("mock_school_attendance", []),
    grade_records: readMockList("mock_school_grades", []),
    audit_logs: enterpriseAuditLogs,
    invoices: defaultMockSchools.map((school, index) => ({
      id: `invoice-${index + 1}`,
      tenant_id: school.id,
      tenant_name: school.name,
      status: index === 1 ? "pending" : "paid",
      total: index === 1 ? 899 : 1899,
      due_date: "2026-05-05T00:00:00.000Z",
      created_at: "2026-04-29T10:00:00.000Z",
    })),
  };

  const databaseSchemas: Record<string, any> = {
    tenants: {
      columns: [
        { name: "id", type: "uuid", nullable: false, is_primary: true, is_protected: true },
        { name: "name", type: "varchar", nullable: false, is_primary: false, is_protected: false },
        { name: "slug", type: "varchar", nullable: false, is_primary: false, is_protected: false },
        { name: "status", type: "varchar", nullable: false, is_primary: false, is_protected: false },
        { name: "plan", type: "varchar", nullable: true, is_primary: false, is_protected: false },
        { name: "logo_url", type: "text", nullable: true, is_primary: false, is_protected: false },
        { name: "created_at", type: "timestamptz", nullable: false, is_primary: false, is_protected: true },
      ],
      relationships: [],
    },
    students: {
      columns: [
        { name: "id", type: "uuid", nullable: false, is_primary: true, is_protected: true },
        { name: "tenant_id", type: "uuid", nullable: false, is_primary: false, is_protected: true },
        { name: "first_name", type: "varchar", nullable: false, is_primary: false, is_protected: false },
        { name: "paternal_last_name", type: "varchar", nullable: false, is_primary: false, is_protected: false },
        { name: "maternal_last_name", type: "varchar", nullable: true, is_primary: false, is_protected: false },
        { name: "birth_day", type: "integer", nullable: true, is_primary: false, is_protected: false },
        { name: "birth_month", type: "integer", nullable: true, is_primary: false, is_protected: false },
        { name: "birth_year", type: "integer", nullable: true, is_primary: false, is_protected: false },
        { name: "curp", type: "varchar", nullable: true, is_primary: false, is_protected: false },
      ],
      relationships: [
        { column: "tenant_id", foreign_table: "tenants", foreign_column: "id" },
      ],
    },
    parent_student: {
      columns: [
        { name: "id", type: "uuid", nullable: false, is_primary: true, is_protected: true },
        { name: "parent_id", type: "uuid", nullable: false, is_primary: false, is_protected: false },
        { name: "student_id", type: "uuid", nullable: false, is_primary: false, is_protected: false },
        { name: "relationship", type: "varchar", nullable: false, is_primary: false, is_protected: false },
      ],
      relationships: [
        { column: "parent_id", foreign_table: "users", foreign_column: "id" },
        { column: "student_id", foreign_table: "students", foreign_column: "id" },
      ],
    },
  };

  const databaseTableMatch = path.match(/\/super-admin\/database\/tables\/([^/]+)(?:\/(schema|rows|structure|soft-delete))?(?:\/([^/]+))?$/);
  if (path.endsWith("/super-admin/database/tables")) {
    if (method === "POST") return { success: false, error: "DDL demo protegido por flag backend" };
    return { success: true, data: { tables: databaseTables } };
  }
  if (databaseTableMatch) {
    const table = decodeURIComponent(databaseTableMatch[1]);
    const action = databaseTableMatch[2];
    const tableRows = databaseRows[table] || [];
    const schema = databaseSchemas[table] || {
      columns: Object.keys(tableRows[0] || { id: "" }).map((key) => ({
        name: key,
        type: key.endsWith("_at") ? "timestamptz" : "text",
        nullable: key !== "id",
        is_primary: key === "id",
        is_protected: ["id", "tenant_id", "created_at", "updated_at"].includes(key),
      })),
      relationships: tableRows[0]?.tenant_id ? [{ column: "tenant_id", foreign_table: "tenants", foreign_column: "id" }] : [],
    };
    if (action === "schema") return { success: true, data: { table, is_protected: table === "audit_logs", ...schema, constraints: [] } };
    if (action === "rows") return { success: true, data: { rows: tableRows.slice(0, 50), page: 1, per_page: 50, total: tableRows.length } };
    if (action === "structure") return { success: false, error: "DDL demo protegido por flag backend" };
    if (action === "soft-delete") return { success: true, message: "Tabla marcada como oculta en modo demo" };
  }

  if (path.endsWith("/super-admin/database/export/full")) {
    return { success: true, data: { generated_at: nowIso(), tables: databaseRows, format: "json-workbook-source" } };
  }

  const databaseExportMatch = path.match(/\/super-admin\/database\/export\/tables\/([^/]+)$/);
  if (databaseExportMatch) {
    const names = decodeURIComponent(databaseExportMatch[1]).split(",");
    const payload = names.reduce<Record<string, any[]>>((acc, name) => {
      acc[name] = databaseRows[name] || [];
      return acc;
    }, {});
    return { success: true, data: { generated_at: nowIso(), tables: payload, format: "json-workbook-source" } };
  }

  if (path.endsWith("/super-admin/database/import/validate") && method === "POST") {
    return {
      success: true,
      data: {
        valid: true,
        warnings: ["Preview demo validado. El commit real debe usar endpoints del modulo correspondiente."],
        required_steps: ["map_columns", "preview", "validate", "commit_with_audit"],
      },
      message: "Importacion validada en modo demo",
    };
  }

  if (path.endsWith("/super-admin/plans")) {
    const plans = readMockList("mock_plans", defaultMockPlans);
    if (method === "POST") {
      const body = parseBody(options);
      const created = {
        id: (body.name || "plan").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `plan-${Date.now()}`,
        created_at: nowIso(),
        ...body,
        modules: JSON.stringify(body.modules || []),
        features: JSON.stringify(body.features || []),
      };
      writeMockList("mock_plans", [created, ...plans]);
      return { success: true, data: created, message: "Plan creado en modo demo" };
    }
    return { success: true, data: { plans } };
  }

  const planMatch = path.match(/\/super-admin\/plans\/([^/]+)(?:\/toggle)?$/);
  if (planMatch) {
    const id = decodeURIComponent(planMatch[1]);
    const plans = readMockList("mock_plans", defaultMockPlans);
    if (path.endsWith("/toggle")) {
      const updated = plans.map((plan) => plan.id === id ? { ...plan, is_active: !plan.is_active } : plan);
      writeMockList("mock_plans", updated);
      return { success: true, message: "Plan actualizado en modo demo" };
    }
    if (method === "PUT") {
      const body = parseBody(options);
      const updatedPlan = {
        ...plans.find((plan) => plan.id === id),
        ...body,
        id,
        modules: JSON.stringify(body.modules || []),
        features: JSON.stringify(body.features || []),
      };
      writeMockList("mock_plans", plans.map((plan) => plan.id === id ? updatedPlan : plan));
      return { success: true, data: updatedPlan, message: "Plan actualizado en modo demo" };
    }
    if (method === "DELETE") {
      writeMockList("mock_plans", plans.filter((plan) => plan.id !== id));
      return { success: true, message: "Plan eliminado en modo demo" };
    }
    return { success: true, data: plans.find((plan) => plan.id === id) || null };
  }

  if (path.endsWith("/super-admin/users")) {
    const users = readMockList("mock_users", defaultMockUsers);
    if (method === "POST") {
      const body = parseBody(options);
      const created = {
        id: `user-${Date.now()}`,
        email: body.email,
        first_name: body.first_name,
        last_name: body.last_name,
        role: "SUPER_ADMIN",
        is_active: body.is_active ?? true,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      writeMockList("mock_users", [created, ...users]);
      return { success: true, data: created, message: "Usuario creado en modo demo" };
    }
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const status = url.searchParams.get("status") || "all";
    const page = Number(url.searchParams.get("page") || "1");
    const perPage = Number(url.searchParams.get("per_page") || "20");
    const filtered = users.filter((user) => {
      const matchesSearch = !search || `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(search);
      const matchesStatus = status === "all" || (status === "active" ? user.is_active : !user.is_active);
      return matchesSearch && matchesStatus;
    });
    const { items, meta } = paginate(filtered, page, perPage);
    return { success: true, data: items, meta };
  }

  const userMatch = path.match(/\/super-admin\/users\/([^/]+)(?:\/toggle)?$/);
  if (userMatch) {
    const id = decodeURIComponent(userMatch[1]);
    const users = readMockList("mock_users", defaultMockUsers);
    if (path.endsWith("/toggle")) {
      writeMockList("mock_users", users.map((user) => user.id === id ? { ...user, is_active: !user.is_active, updated_at: nowIso() } : user));
      return { success: true, message: "Usuario actualizado en modo demo" };
    }
    if (method === "PUT") {
      const body = parseBody(options);
      const updated = users.map((user) => user.id === id ? { ...user, ...body, updated_at: nowIso() } : user);
      writeMockList("mock_users", updated);
      return { success: true, data: updated.find((user) => user.id === id), message: "Usuario actualizado en modo demo" };
    }
    if (method === "DELETE") {
      writeMockList("mock_users", users.map((user) => user.id === id ? { ...user, is_active: false, updated_at: nowIso() } : user));
      return { success: true, message: "Usuario desactivado en modo demo" };
    }
  }

  if (path.endsWith("/super-admin/schools")) {
    const schools = readMockList("mock_schools", defaultMockSchools);
    if (method === "POST") {
      const body = parseBody(options);
      const created = {
        id: `school-${Date.now()}`,
        name: body.name,
        slug: body.slug,
        status: "active",
        plan: body.plan,
        logo_url: body.logo_url || "",
        created_at: nowIso(),
        updated_at: nowIso(),
        total_students: 0,
        total_users: 1,
        total_teachers: 0,
        total_parents: 0,
      };
      const tenantUsers = readMockList("mock_tenant_users", seedTenantUsers());
      const tenantRoles = readMockList("mock_tenant_roles", []);
      const schoolYears = readMockList("mock_school_years", defaultMockSchoolYears);
      const gradeLevels = readMockList("mock_grade_levels", []);
      const subjects = readMockList("mock_school_subjects", defaultMockSubjects);
      const groups = readMockList("mock_school_groups", mockSchoolGroups);
      const currentYear = body.school_year || "2026-2027";
      writeMockList("mock_schools", [created, ...schools]);
      if (typeof window !== "undefined") localStorage.setItem("mock_current_school_id", created.id);
      writeMockList("mock_tenant_users", [
        {
          id: `tenant-admin-${created.id}`,
          tenant_id: created.id,
          email: "admin@educore.mx",
          first_name: "Administrador",
          last_name: "Escuela",
          role: "SCHOOL_ADMIN",
          is_active: true,
          created_at: nowIso(),
          updated_at: nowIso(),
          custom_fields: {},
        },
        ...tenantUsers,
      ]);
      writeMockList("mock_tenant_roles", [
        ...["admin", "teacher", "parent", "student"].map((key) => ({ id: `${created.id}-${key}`, tenant_id: created.id, key, name: key, is_system: true, created_at: nowIso() })),
        ...tenantRoles,
      ]);
      writeMockList("mock_school_years", [
        { id: `year-${created.id}`, tenant_id: created.id, name: currentYear, start_date: "2026-08-01", end_date: "2027-07-31", status: "active", is_current: true, notes: "Ciclo creado automaticamente", group_count: 1, student_count: 0, created_at: nowIso(), updated_at: nowIso() },
        ...schoolYears,
      ]);
      writeMockList("mock_grade_levels", [
        { id: `grade-${created.id}`, tenant_id: created.id, name: (body.levels || ["Primaria"])[0], level: (body.levels || ["primaria"])[0], sort_order: 0, created_at: nowIso(), updated_at: nowIso(), custom_fields: {} },
        ...gradeLevels,
      ]);
      writeMockList("mock_school_subjects", [
        ...["Español", "Matematicas", "Ciencias", "Historia"].map((name, index) => ({ id: `subject-${created.id}-${index}`, tenant_id: created.id, name, code: name.slice(0, 3).toUpperCase(), description: "Materia base creada automaticamente", credits: 1, status: "active", created_at: nowIso(), updated_at: nowIso(), custom_fields: {} })),
        ...subjects,
      ]);
      writeMockList("mock_school_groups", [
        { id: `group-${created.id}`, tenant_id: created.id, grade_level_id: `grade-${created.id}`, school_year_id: `year-${created.id}`, name: "A", grade_name: (body.levels || ["Primaria"])[0], school_year: currentYear, capacity: 30, room: "Aula 1", description: "Grupo base creado automaticamente", status: "active", student_count: 0, teacher_count: 0, subject_count: 4, created_at: nowIso(), updated_at: nowIso(), custom_fields: {} },
        ...groups,
      ]);
      return { success: true, data: { id: created.id, tenant_id: created.id, admin_email: "admin@educore.mx", admin_demo: true }, message: "Escuela creada en modo demo" };
    }
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const status = url.searchParams.get("status") || "";
    const plan = url.searchParams.get("plan") || "";
    const page = Number(url.searchParams.get("page") || "1");
    const perPage = Number(url.searchParams.get("limit") || "12");
    const filtered = schools.filter((school) => {
      const matchesSearch = !search || `${school.name} ${school.slug}`.toLowerCase().includes(search);
      const matchesStatus = !status || school.status === status;
      const matchesPlan = !plan || school.plan === plan;
      return matchesSearch && matchesStatus && matchesPlan;
    });
    const { items, meta } = paginate(filtered, page, perPage);
    return { success: true, data: { schools: items }, meta };
  }

  const schoolMatch = path.match(/\/super-admin\/schools\/([^/]+)(?:\/(status|modules|users|modules\/toggle))?$/);
  if (schoolMatch) {
    const id = decodeURIComponent(schoolMatch[1]);
    const action = schoolMatch[2];
    const schools = readMockList("mock_schools", defaultMockSchools);
    const school = schools.find((item) => item.id === id);

    if (action === "status" && method === "PATCH") {
      const body = parseBody(options);
      writeMockList("mock_schools", schools.map((item) => item.id === id ? { ...item, status: body.status, updated_at: nowIso() } : item));
      return { success: true, message: "Estado actualizado en modo demo" };
    }

    if (action === "modules") {
      const activeKeys = new Set((school?.plan === "enterprise" ? modulesCatalog : modulesCatalog.slice(0, 5)).map((mod) => mod.key));
      return {
        success: true,
        data: {
          modules: modulesCatalog.map((mod) => ({
            ...mod,
            is_active: mod.is_core || activeKeys.has(mod.key),
          })),
        },
      };
    }

    if (action === "modules/toggle" && method === "POST") {
      return { success: true, message: "Modulo actualizado en modo demo" };
    }

    if (action === "users") {
      return {
        success: true,
        data: {
          users: [
            {
              id: `${id}-admin`,
              email: `director@${school?.slug || "escuela"}.mx`,
              first_name: "Director",
              last_name: school?.name || "Escuela",
              role: "SCHOOL_ADMIN",
              is_active: true,
            },
          ],
        },
      };
    }

    return school
      ? { success: true, data: school }
      : { success: false, message: "Escuela no encontrada" };
  }

  return { success: false, message: "Endpoint demo no implementado" };
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (isNgrok()) headers["ngrok-skip-browser-warning"] = "true";

    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers,
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success && data.data?.access_token) {
      localStorage.setItem("access_token", data.data.access_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function logout() {
  try {
    const headers: Record<string, string> = {};
    if (isNgrok()) headers["ngrok-skip-browser-warning"] = "true";

    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers,
    });
  } catch {
    // Ignore errors on logout
  }
  clearAuth();
}

// --- Role-based routing ---

export function getDashboardPath(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "SCHOOL_ADMIN":
      return "/school-admin/dashboard";
    case "TEACHER":
      return "/teacher/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    case "PARENT":
      return "/parent/dashboard";
    default:
      return "/";
  }
}
