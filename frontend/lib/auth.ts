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

const mockSchoolGroups = [
  {
    id: "group-1a",
    name: "1A",
    grade_level_id: "grade-1",
    grade_name: "Primero",
    teacher_id: "teacher-maria-lopez",
    teacher_name: "Maria Lopez",
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
    teacher_id: "teacher-carlos-rivera",
    teacher_name: "Carlos Rivera",
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
    teacher_id: "teacher-ana-martinez",
    teacher_name: "Ana Martinez",
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
    teacher_id: "",
    teacher_name: "",
    student_count: 0,
    max_students: 30,
    room: "D-401",
    schedule: "Lun-Vie 08:00-13:30",
    status: "active",
    description: "Grupo listo para asignacion.",
    created_at: "2026-01-10T09:00:00.000Z",
  },
];

const mockGradeLevels = [
  { id: "grade-1", name: "Primero" },
  { id: "grade-2", name: "Segundo" },
  { id: "grade-3", name: "Tercero" },
  { id: "grade-4", name: "Cuarto" },
  { id: "grade-5", name: "Quinto" },
  { id: "grade-6", name: "Sexto" },
];

const modulesCatalog = [
  { key: "students", name: "Alumnos", description: "Expedientes, inscripciones y datos academicos.", is_core: true, price_monthly_mxn: 0 },
  { key: "attendance", name: "Asistencias", description: "Registro diario y reportes de asistencia.", is_core: true, price_monthly_mxn: 0 },
  { key: "grades", name: "Calificaciones", description: "Evaluaciones, boletas y promedios.", is_core: true, price_monthly_mxn: 0 },
  { key: "reports", name: "Reportes", description: "Indicadores academicos y administrativos.", is_core: false, price_monthly_mxn: 299 },
  { key: "communications", name: "Comunicaciones", description: "Avisos, mensajes y notificaciones.", is_core: false, price_monthly_mxn: 249 },
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

  if (path.endsWith("/school-admin/academic/groups")) {
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    if (method === "POST") {
      const body = parseBody(options);
      const grade = mockGradeLevels.find((item) => item.id === body.grade_level_id);
      const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
      const teacher = teachers.find((item) => item.id === body.teacher_id);
      const created = {
        id: `group-${Date.now()}`,
        name: body.name,
        grade_level_id: body.grade_level_id,
        grade_name: grade?.name || "",
        teacher_id: body.teacher_id || "",
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "",
        student_count: 0,
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

  const groupMatch = path.match(/\/school-admin\/academic\/groups\/([^/]+)$/);
  if (groupMatch) {
    const id = decodeURIComponent(groupMatch[1]);
    const groups = readMockList("mock_school_groups", mockSchoolGroups);
    const group = groups.find((item) => item.id === id);

    if (method === "PUT") {
      const body = parseBody(options);
      const grade = mockGradeLevels.find((item) => item.id === body.grade_level_id);
      const teachers = readMockList("mock_school_teachers", defaultMockTeachers);
      const teacher = teachers.find((item) => item.id === body.teacher_id);
      const updated = groups.map((item) =>
        item.id === id
          ? {
              ...item,
              ...body,
              grade_name: grade?.name ?? item.grade_name,
              teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : item.teacher_name,
              max_students: body.max_students !== undefined ? Number(body.max_students) : item.max_students,
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
            students: readMockList("mock_school_students", defaultMockStudents).filter((student) => student.group_id === id),
            subjects: [],
            recent_activity: [],
          },
        }
      : { success: false, message: "Grupo no encontrado" };
  }

  if (path.endsWith("/school-admin/academic/students")) {
    const students = readMockList("mock_school_students", defaultMockStudents);
    if (method === "POST") {
      const body = parseBody(options);
      const group = mockSchoolGroups.find((item) => item.id === body.group_id);
      const created = {
        id: `student-${Date.now()}`,
        first_name: body.first_name,
        last_name: body.last_name,
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

  const studentMatch = path.match(/\/school-admin\/academic\/students\/([^/]+)$/);
  if (studentMatch) {
    const id = decodeURIComponent(studentMatch[1]);
    const students = readMockList("mock_school_students", defaultMockStudents);
    const student = students.find((item) => item.id === id);

    if (method === "PUT") {
      const body = parseBody(options);
      const group = mockSchoolGroups.find((item) => item.id === body.group_id);
      const updated = students.map((item) =>
        item.id === id
          ? {
              ...item,
              ...body,
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
