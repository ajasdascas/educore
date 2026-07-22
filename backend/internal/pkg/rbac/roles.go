package rbac

import (
	"fmt"
	"sort"
	"strings"
)

const (
	RoleSuperAdmin  = "SUPER_ADMIN"
	RoleSchoolAdmin = "SCHOOL_ADMIN"
	RoleTeacher     = "TEACHER"
	RoleParent      = "PARENT"
	RoleStudent     = "STUDENT"
)

type PermissionDefinition struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type RoleDefinition struct {
	Key                string                 `json:"key"`
	TenantRoleKey      string                 `json:"tenant_role_key"`
	Name               string                 `json:"name"`
	Description        string                 `json:"description"`
	Scope              string                 `json:"scope"`
	DefaultPermissions []string               `json:"default_permissions"`
	AllowedPermissions []PermissionDefinition `json:"allowed_permissions"`
}

var schoolAdminPermissions = []PermissionDefinition{
	{Key: "dashboard:read", Label: "Panel escolar", Description: "Consultar el panel y los indicadores de la escuela."},
	{Key: "modules:read", Label: "Módulos activos", Description: "Consultar los módulos habilitados de la escuela."},
	{Key: "users:*", Label: "Usuarios", Description: "Consultar y administrar usuarios de la escuela."},
	{Key: "academic:*", Label: "Estructura académica", Description: "Administrar ciclos, grupos, materias, horarios, asistencia y calificaciones."},
	{Key: "groups:read", Label: "Consultar grupos", Description: "Consultar grupos y asignaciones."},
	{Key: "groups:write", Label: "Administrar grupos", Description: "Crear y modificar grupos y asignaciones."},
	{Key: "schedule:read", Label: "Consultar horarios", Description: "Consultar horarios escolares."},
	{Key: "schedule:write", Label: "Administrar horarios", Description: "Crear y modificar horarios escolares."},
	{Key: "attendance:read", Label: "Consultar asistencias", Description: "Consultar registros de asistencia."},
	{Key: "attendance:write", Label: "Capturar asistencias", Description: "Crear y corregir registros de asistencia."},
	{Key: "grades:read", Label: "Consultar calificaciones", Description: "Consultar calificaciones y boletas."},
	{Key: "grades:write", Label: "Capturar calificaciones", Description: "Crear y corregir calificaciones."},
	{Key: "documents:read", Label: "Consultar documentos", Description: "Consultar documentos escolares autorizados."},
	{Key: "documents:write", Label: "Administrar documentos", Description: "Crear, verificar y eliminar documentos escolares."},
	{Key: "communications:read", Label: "Consultar comunicaciones", Description: "Consultar avisos y conversaciones."},
	{Key: "communications:write", Label: "Enviar comunicaciones", Description: "Crear avisos y enviar mensajes."},
	{Key: "notifications:read", Label: "Consultar notificaciones", Description: "Consultar notificaciones propias."},
	{Key: "notifications:write", Label: "Gestionar notificaciones", Description: "Marcar y administrar notificaciones propias."},
	{Key: "reports:read", Label: "Reportes", Description: "Consultar y exportar reportes escolares."},
	{Key: "reports:write", Label: "Generar reportes", Description: "Generar, programar y eliminar reportes escolares."},
	{Key: "payments:read", Label: "Consultar pagos", Description: "Consultar cargos, pagos y recibos."},
	{Key: "payments:write", Label: "Administrar pagos", Description: "Registrar y corregir pagos."},
	{Key: "settings:*", Label: "Configuración escolar", Description: "Administrar la configuración de la escuela."},
	{Key: "database:tenant", Label: "Base virtual", Description: "Administrar únicamente la base virtual de su escuela."},
}

var teacherPermissions = []PermissionDefinition{
	{Key: "dashboard:read", Label: "Panel docente", Description: "Consultar el panel docente."},
	{Key: "groups:read", Label: "Grupos asignados", Description: "Consultar sus grupos y alumnos asignados."},
	{Key: "schedule:read", Label: "Horario", Description: "Consultar su horario docente."},
	{Key: "attendance:read", Label: "Consultar asistencias", Description: "Consultar asistencia de sus grupos."},
	{Key: "attendance:write", Label: "Capturar asistencias", Description: "Capturar asistencia de sus grupos."},
	{Key: "grades:read", Label: "Consultar calificaciones", Description: "Consultar calificaciones de sus grupos."},
	{Key: "grades:write", Label: "Capturar calificaciones", Description: "Capturar calificaciones de sus grupos."},
	{Key: "communications:read", Label: "Consultar comunicaciones", Description: "Consultar avisos y conversaciones escolares."},
	{Key: "communications:write", Label: "Enviar comunicaciones", Description: "Enviar mensajes dentro de sus grupos."},
	{Key: "notifications:read", Label: "Consultar notificaciones", Description: "Consultar notificaciones propias."},
	{Key: "notifications:write", Label: "Gestionar notificaciones", Description: "Marcar notificaciones propias."},
	{Key: "reports:read", Label: "Reportes docentes", Description: "Consultar reportes de sus grupos."},
	{Key: "reports:write", Label: "Generar reportes", Description: "Generar y exportar reportes de sus grupos."},
}

var parentPermissions = []PermissionDefinition{
	{Key: "dashboard:read", Label: "Panel familiar", Description: "Consultar el resumen familiar."},
	{Key: "children:read", Label: "Información de hijos", Description: "Consultar únicamente información de sus hijos vinculados."},
	{Key: "grades:read", Label: "Calificaciones", Description: "Consultar calificaciones de sus hijos vinculados."},
	{Key: "attendance:read", Label: "Asistencia", Description: "Consultar asistencia de sus hijos vinculados."},
	{Key: "schedule:read", Label: "Horarios", Description: "Consultar horarios de sus hijos vinculados."},
	{Key: "assignments:read", Label: "Tareas", Description: "Consultar tareas de sus hijos vinculados."},
	{Key: "payments:read", Label: "Pagos", Description: "Consultar cargos y recibos de sus hijos vinculados."},
	{Key: "messages:read", Label: "Consultar mensajes", Description: "Consultar conversaciones escolares propias."},
	{Key: "messages:write", Label: "Enviar mensajes", Description: "Enviar mensajes a personal autorizado."},
	{Key: "notifications:read", Label: "Consultar notificaciones", Description: "Consultar notificaciones propias."},
	{Key: "notifications:write", Label: "Gestionar notificaciones", Description: "Marcar notificaciones propias."},
	{Key: "events:read", Label: "Eventos", Description: "Consultar eventos escolares."},
	{Key: "documents:read", Label: "Documentos", Description: "Consultar documentos autorizados de sus hijos."},
	{Key: "consents:read", Label: "Consultar consentimientos", Description: "Consultar consentimientos de sus hijos vinculados."},
	{Key: "consents:write", Label: "Responder consentimientos", Description: "Responder consentimientos de sus hijos vinculados."},
	{Key: "reports:read", Label: "Reportes", Description: "Consultar el resumen escolar familiar."},
	{Key: "profile:read", Label: "Consultar perfil", Description: "Consultar su perfil de tutor."},
	{Key: "profile:write", Label: "Actualizar perfil", Description: "Actualizar su perfil y contraseña."},
}

var studentPermissions = []PermissionDefinition{
	{Key: "dashboard:read", Label: "Panel estudiantil", Description: "Consultar su resumen académico."},
	{Key: "profile:read", Label: "Perfil", Description: "Consultar su propio perfil académico."},
	{Key: "profile:write", Label: "Preferencias", Description: "Actualizar sus preferencias de comunicación."},
	{Key: "grades:read", Label: "Calificaciones", Description: "Consultar únicamente sus calificaciones."},
	{Key: "attendance:read", Label: "Asistencia", Description: "Consultar únicamente su asistencia."},
	{Key: "schedule:read", Label: "Horario", Description: "Consultar su horario."},
	{Key: "assignments:read", Label: "Tareas", Description: "Consultar sus tareas asignadas."},
	{Key: "messages:read", Label: "Comunicaciones", Description: "Consultar avisos dirigidos al alumno."},
	{Key: "notifications:read", Label: "Consultar notificaciones", Description: "Consultar notificaciones propias."},
	{Key: "notifications:write", Label: "Gestionar notificaciones", Description: "Marcar notificaciones propias."},
	{Key: "documents:read", Label: "Documentos", Description: "Consultar sus documentos autorizados."},
}

var definitions = map[string]RoleDefinition{
	RoleSuperAdmin: {
		Key: RoleSuperAdmin, Name: "Super Admin", Scope: "global",
		Description:        "Control total del Manager Maestro; no pertenece a una escuela.",
		DefaultPermissions: []string{"platform:*"},
		AllowedPermissions: []PermissionDefinition{{Key: "platform:*", Label: "Plataforma", Description: "Control total del Manager Maestro."}},
	},
	RoleSchoolAdmin: {
		Key: RoleSchoolAdmin, TenantRoleKey: "admin", Name: "Director / Administrador", Scope: "tenant",
		Description:        "Administración operativa de una escuela.",
		DefaultPermissions: permissionKeys(schoolAdminPermissions), AllowedPermissions: schoolAdminPermissions,
	},
	RoleTeacher: {
		Key: RoleTeacher, TenantRoleKey: "teacher", Name: "Profesor", Scope: "tenant",
		Description:        "Gestión docente limitada a grupos y alumnos asignados.",
		DefaultPermissions: permissionKeys(teacherPermissions), AllowedPermissions: teacherPermissions,
	},
	RoleParent: {
		Key: RoleParent, TenantRoleKey: "parent", Name: "Padre / Tutor", Scope: "tenant",
		Description:        "Consulta de estudiantes vinculados y comunicación escolar.",
		DefaultPermissions: permissionKeys(parentPermissions), AllowedPermissions: parentPermissions,
	},
	RoleStudent: {
		Key: RoleStudent, TenantRoleKey: "student", Name: "Estudiante", Scope: "tenant",
		Description:        "Consulta de su propia información académica.",
		DefaultPermissions: permissionKeys(studentPermissions), AllowedPermissions: studentPermissions,
	},
}

func NormalizeRole(role string) string {
	return strings.ToUpper(strings.TrimSpace(role))
}

func Definition(role string) (RoleDefinition, bool) {
	definition, ok := definitions[NormalizeRole(role)]
	return cloneDefinition(definition), ok
}

func Definitions() []RoleDefinition {
	order := []string{RoleSuperAdmin, RoleSchoolAdmin, RoleTeacher, RoleParent, RoleStudent}
	result := make([]RoleDefinition, 0, len(order))
	for _, role := range order {
		definition, _ := Definition(role)
		result = append(result, definition)
	}
	return result
}

func ValidateScope(role, tenantID string) error {
	definition, ok := Definition(role)
	if !ok {
		return fmt.Errorf("rol no permitido")
	}
	tenantID = strings.TrimSpace(tenantID)
	if definition.Scope == "global" && tenantID != "" {
		return fmt.Errorf("SUPER_ADMIN debe ser global y no puede pertenecer a una escuela")
	}
	if definition.Scope == "tenant" && tenantID == "" {
		return fmt.Errorf("el rol %s requiere una escuela", definition.Key)
	}
	return nil
}

func NormalizePermissions(role string, requested []string) ([]string, error) {
	definition, ok := Definition(role)
	if !ok || definition.Scope != "tenant" {
		return nil, fmt.Errorf("los permisos del rol no son editables")
	}
	allowed := make(map[string]bool, len(definition.AllowedPermissions))
	order := make(map[string]int, len(definition.AllowedPermissions))
	for index, permission := range definition.AllowedPermissions {
		allowed[permission.Key] = true
		order[permission.Key] = index
	}
	seen := map[string]bool{}
	result := make([]string, 0, len(requested))
	for _, raw := range requested {
		permission := strings.ToLower(strings.TrimSpace(raw))
		if permission == "" || seen[permission] {
			continue
		}
		if !allowed[permission] {
			return nil, fmt.Errorf("permiso no permitido para %s: %s", definition.Key, permission)
		}
		seen[permission] = true
		result = append(result, permission)
	}
	sort.SliceStable(result, func(i, j int) bool { return order[result[i]] < order[result[j]] })
	return result, nil
}

// ResolvePermissions returns the stored tenant-role policy exactly after
// validation. Legacy expansion belongs in a one-time migration; inferring it
// here would make an intentionally saved legacy-shaped subset impossible to
// revoke.
func ResolvePermissions(role string, stored []string, tenantRoleExists bool) []string {
	definition, ok := Definition(role)
	if !ok {
		return []string{}
	}
	if definition.Scope == "global" {
		return append([]string(nil), definition.DefaultPermissions...)
	}
	if !tenantRoleExists {
		return append([]string(nil), definition.DefaultPermissions...)
	}
	normalized, err := NormalizePermissions(role, stored)
	if err != nil {
		return []string{}
	}
	return normalized
}

func Allows(granted []string, required ...string) bool {
	for _, candidate := range required {
		candidate = strings.ToLower(candidate)
		parts := strings.SplitN(candidate, ":", 2)
		allowed := false
		for _, raw := range granted {
			permission := strings.ToLower(strings.TrimSpace(raw))
			if permission == candidate || permission == "platform:*" {
				allowed = true
				break
			}
			if len(parts) == 2 && permission == parts[0]+":*" {
				allowed = true
				break
			}
			// A write permission necessarily permits reading the same resource.
			if len(parts) == 2 && parts[1] == "read" && permission == parts[0]+":write" {
				allowed = true
				break
			}
		}
		if !allowed {
			return false
		}
	}
	return len(required) > 0
}

// RequiredForRequest returns the exact permission required by a tenant route.
// Known tenant route families fail closed when a new endpoint has not been
// classified, preventing a role gate from silently bypassing granular RBAC.
func RequiredForRequest(role, method, path string) []string {
	role = NormalizeRole(role)
	path = strings.TrimSuffix(strings.ToLower(path), "/")
	write := strings.ToUpper(method) != "GET" && strings.ToUpper(method) != "HEAD" && strings.ToUpper(method) != "OPTIONS"
	action := "read"
	if write {
		action = "write"
	}

	if strings.Contains(path, "/communications/") || strings.HasSuffix(path, "/communications") {
		permission := communicationPermission(role, action, method, path)
		return []string{permission}
	}
	if strings.Contains(path, "/messages") || strings.Contains(path, "/conversations") {
		if role == RoleParent {
			return []string{"messages:" + action}
		}
		if role == RoleStudent {
			return []string{"messages:" + action}
		}
		return []string{"communications:" + action}
	}
	if strings.Contains(path, "/notifications") {
		return []string{"notifications:" + action}
	}
	if role == RoleParent && strings.Contains(path, "/parent/children/") && strings.HasSuffix(path, "/report-card") {
		return []string{"children:read", "grades:read"}
	}
	if strings.Contains(path, "/school-admin/attendance") || strings.Contains(path, "/teacher/attendance") || strings.Contains(path, "/parent/children/") && strings.HasSuffix(path, "/attendance") || strings.HasPrefix(path, "/api/v1/student/attendance") {
		return []string{"attendance:" + action}
	}
	if strings.Contains(path, "/reports") {
		if strings.Contains(path, "/financial") {
			return []string{"payments:read"}
		}
		return []string{"reports:" + action}
	}
	if strings.Contains(path, "/database") {
		return []string{"database:tenant"}
	}
	if strings.Contains(path, "/payments") {
		if role == RoleParent {
			return []string{"payments:read"}
		}
		return []string{"payments:" + action}
	}
	if strings.Contains(path, "/attendance") {
		return []string{"attendance:" + action}
	}
	if strings.Contains(path, "/grades") || strings.Contains(path, "/report-cards") {
		return []string{"grades:" + action}
	}
	if strings.Contains(path, "/schedule") {
		return []string{"schedule:" + action}
	}
	if strings.Contains(path, "/assignments") {
		return []string{"assignments:read"}
	}
	if strings.Contains(path, "/documents") {
		return []string{"documents:" + action}
	}
	if strings.Contains(path, "/consents") {
		return []string{"consents:" + action}
	}
	if strings.Contains(path, "/profile") || strings.HasSuffix(path, "/password") {
		return []string{"profile:" + action}
	}
	if strings.Contains(path, "/events") || strings.Contains(path, "/calendar") {
		return []string{"events:read"}
	}
	if strings.Contains(path, "/groups") || strings.Contains(path, "/classes") {
		return []string{"groups:" + action}
	}
	if strings.Contains(path, "/students") || strings.Contains(path, "/teachers") {
		if role == RoleSchoolAdmin {
			return []string{"users:" + action}
		}
		if role == RoleParent {
			return []string{"children:read"}
		}
		if role == RoleTeacher {
			return []string{"groups:read"}
		}
	}
	if strings.Contains(path, "/academic") {
		return []string{"academic:" + action}
	}
	if strings.Contains(path, "/settings") || strings.Contains(path, "/security") {
		if role == RoleSchoolAdmin {
			return []string{"settings:" + action}
		}
	}
	if strings.Contains(path, "/modules/enabled") {
		return []string{"modules:read"}
	}
	if strings.Contains(path, "/dashboard") || strings.HasSuffix(path, "/stats") {
		return []string{"dashboard:read"}
	}
	if strings.Contains(path, "/parent/children") && role == RoleParent {
		return []string{"children:read"}
	}
	if isTenantRoute(path) {
		return []string{"route:unmapped"}
	}
	return nil
}

func communicationPermission(role, action, method, path string) string {
	if strings.Contains(path, "/messages") || strings.Contains(path, "/conversations") {
		if strings.Contains(path, "/bulk/") {
			return "communications:" + action
		}
		if role == RoleParent || role == RoleStudent {
			return "messages:" + action
		}
		return "communications:" + action
	}
	if strings.Contains(path, "/notifications") {
		if strings.EqualFold(method, "POST") {
			return "communications:write"
		}
		return "notifications:" + action
	}
	if strings.Contains(path, "/announcements") {
		if !strings.EqualFold(method, "GET") && !strings.EqualFold(method, "HEAD") {
			return "communications:write"
		}
		if role == RoleParent || role == RoleStudent {
			return "events:read"
		}
		return "communications:read"
	}
	if strings.Contains(path, "/preferences") {
		if role == RoleParent || role == RoleStudent {
			return "profile:" + action
		}
		return "communications:" + action
	}
	return "communications:" + action
}

func isTenantRoute(path string) bool {
	for _, prefix := range []string{
		"/api/v1/school-admin", "/api/v1/teacher", "/api/v1/parent",
		"/api/v1/student", "/api/v1/reports", "/api/v1/communications", "/api/v1/academic",
	} {
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return true
		}
	}
	return false
}

func cloneDefinition(definition RoleDefinition) RoleDefinition {
	definition.DefaultPermissions = append([]string(nil), definition.DefaultPermissions...)
	definition.AllowedPermissions = append([]PermissionDefinition(nil), definition.AllowedPermissions...)
	return definition
}

func permissionKeys(definitions []PermissionDefinition) []string {
	keys := make([]string, 0, len(definitions))
	for _, definition := range definitions {
		keys = append(keys, definition.Key)
	}
	return keys
}
