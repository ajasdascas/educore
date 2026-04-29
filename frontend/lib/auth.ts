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
    modules: JSON.stringify(["students", "attendance", "grades"]),
    features: JSON.stringify(["Gestion de alumnos", "Asistencia", "Calificaciones", "Soporte por email"]),
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
    modules: JSON.stringify(["students", "attendance", "grades", "reports", "communications"]),
    features: JSON.stringify(["Reportes academicos", "Portal de padres", "Comunicacion escolar", "Soporte prioritario"]),
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
    modules: JSON.stringify(["students", "attendance", "grades", "reports", "communications", "billing", "transport"]),
    features: JSON.stringify(["Alumnos ilimitados", "SLA empresarial", "Integraciones a medida", "Acompanamiento dedicado"]),
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
  { key: "academic_core", name: "Academico Core", description: "Ciclos, materias, grupos y horarios.", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", price_monthly_mxn: 0 },
  { key: "users", name: "Usuarios", description: "Alumnos, padres, docentes y administrativos.", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", price_monthly_mxn: 0 },
  { key: "students", name: "Alumnos", description: "Expedientes, inscripciones y datos academicos.", is_core: true, price_monthly_mxn: 0 },
  { key: "groups", name: "Grupos", description: "Grados, generaciones y asignaciones.", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", price_monthly_mxn: 0 },
  { key: "schedules", name: "Horarios", description: "Agenda semanal por grupo, profesor y materia.", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", price_monthly_mxn: 0 },
  { key: "attendance", name: "Asistencias", description: "Registro diario y reportes de asistencia.", is_core: true, price_monthly_mxn: 0 },
  { key: "grades", name: "Calificaciones", description: "Evaluaciones, boletas y promedios.", is_core: true, price_monthly_mxn: 0 },
  { key: "reports", name: "Reportes", description: "Indicadores academicos y administrativos.", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", price_monthly_mxn: 0 },
  { key: "communications", name: "Comunicaciones", description: "Avisos, mensajes y notificaciones.", is_core: true, is_required: true, enabled: true, source: "core", layer: "core", price_monthly_mxn: 0 },
  { key: "billing", name: "Cobranza", description: "Pagos, adeudos y facturacion escolar.", is_core: false, price_monthly_mxn: 399 },
  { key: "transport", name: "Transporte", description: "Rutas, unidades y seguimiento operativo.", is_core: false, price_monthly_mxn: 349 },
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
  if (url.pathname.includes("/school-admin")) {
    return mockSchoolAdminFetch(endpoint, options);
  }
  return mockSuperAdminFetch(endpoint, options);
}

async function mockSchoolAdminFetch(endpoint: string, options: RequestInit = {}) {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const method = (options.method || "GET").toUpperCase();
  const url = new URL(endpoint, "https://mock.educore.local");
  const path = url.pathname;

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
    const absent = data.filter((item) => item.status === "absent").length;
    const excused = data.filter((item) => item.status === "excused").length;
    return {
      success: true,
      data: {
        group_id: groupID,
        date,
        students: data,
        summary: { present, late, absent, excused, rate: data.length ? Math.round(((present + late + excused) / data.length) * 100) : 0 },
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
      const healthy = studentRecords.filter((record: any) => ["present", "late", "excused"].includes(record.status)).length;
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
    const page = Number(url.searchParams.get("page") || "1");
    const perPage = Number(url.searchParams.get("per_page") || "20");
    const filtered = students.filter((student) => {
      const matchesSearch = !search || `${student.first_name} ${student.last_name} ${student.enrollment_id} ${student.parent_name}`.toLowerCase().includes(search);
      const matchesStatus = !status || status === "all" || student.status === status;
      const matchesGroup = !groupID || groupID === "all" || student.group_id === groupID;
      return matchesSearch && matchesStatus && matchesGroup;
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
      writeMockList("mock_schools", [created, ...schools]);
      return { success: true, data: { id: created.id }, message: "Escuela creada en modo demo" };
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
