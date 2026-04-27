# Regla: Estilo de Código EduCore
# Se aplica automáticamente a TODO el código generado

## GO — CONVENCIONES

### Naming
```go
// ✅ Correcto
type TenantService struct { ... }
func (s *TenantService) GetBySlug(ctx context.Context, slug string) (*Tenant, error)
var ErrTenantNotFound = errors.New("tenant not found")

// ❌ Incorrecto  
type tenantService struct { ... }
func GetTenant(slug string) Tenant
```

### Manejo de errores
```go
// ✅ Siempre wrappear con contexto
if err != nil {
    return nil, fmt.Errorf("TenantService.GetBySlug: %w", err)
}

// ❌ Nunca ignorar
tenant, _ := svc.GetBySlug(ctx, slug)
```

### Handlers Fiber
```go
// ✅ Respuesta estándar
func (h *Handler) GetTenant(c *fiber.Ctx) error {
    tenant, err := h.svc.Get(c.Context(), c.Params("id"))
    if err != nil {
        return response.Error(c, fiber.StatusNotFound, err)
    }
    return response.Success(c, tenant)
}
```

### Structs con validación
```go
type CreateStudentRequest struct {
    FirstName string `json:"first_name" validate:"required,min=2,max=100"`
    LastName  string `json:"last_name"  validate:"required,min=2,max=100"`
    BirthDate string `json:"birth_date" validate:"required,datetime=2006-01-02"`
}
```

## TYPESCRIPT / NEXT.JS — CONVENCIONES

### Tipos explícitos
```typescript
// ✅ Correcto
interface Student {
  id: string
  firstName: string
  lastName: string
  groupId: string
}

// ❌ Incorrecto
const student: any = ...
```

### Server Components por defecto
```typescript
// ✅ Correcto — sin 'use client' cuando no hay interactividad
async function StudentsPage() {
  const students = await getStudents()
  return <StudentTable students={students} />
}

// ❌ No uses 'use client' innecesariamente
'use client'
function StudentsPage() { ... }
```

### Formularios con Zod
```typescript
// ✅ Siempre Zod + React Hook Form
const schema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
})

type FormData = z.infer<typeof schema>
```

### Fetching con TanStack Query
```typescript
// ✅ En componentes cliente
function useStudents(groupId: string) {
  return useQuery({
    queryKey: ['students', groupId],
    queryFn: () => studentsApi.getByGroup(groupId),
  })
}
```

## SQL — CONVENCIONES

```sql
-- ✅ Siempre snake_case para tablas y columnas
-- ✅ Siempre incluir tenant_id, created_at, updated_at
-- ✅ Siempre índice en tenant_id
-- ✅ Siempre RLS policy

CREATE TABLE attendance_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    student_id  UUID NOT NULL REFERENCES students(id),
    date        DATE NOT NULL,
    status      VARCHAR(10) NOT NULL CHECK (status IN ('present','absent','late','excused')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_tenant ON attendance_records(tenant_id);
CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_tenant_iso ON attendance_records
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```
