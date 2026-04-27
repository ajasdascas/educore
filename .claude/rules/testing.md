# Regla: Testing EduCore

## ESTRATEGIA DE TESTS

### Backend (Go)
- **Unit tests**: services con mocks de repository
- **Integration tests**: endpoints con BD de test real
- **NO** testear handlers sin integration test

### Frontend (Next.js)
- **Unit tests**: utilidades, hooks, validaciones Zod
- **Component tests**: formularios con React Testing Library
- **E2E**: flujos críticos con Playwright (opcional en MVP)

---

## BACKEND — PATRONES DE TEST

### Unit test de Service
```go
// backend/internal/modules/tenants/service_test.go
package tenants_test

import (
    "context"
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

type MockRepository struct {
    mock.Mock
}

func (m *MockRepository) FindBySlug(ctx context.Context, slug string) (*Tenant, error) {
    args := m.Called(ctx, slug)
    return args.Get(0).(*Tenant), args.Error(1)
}

func TestTenantService_GetBySlug_Success(t *testing.T) {
    mockRepo := new(MockRepository)
    svc := NewService(mockRepo)
    
    expected := &Tenant{ID: "uuid-1", Slug: "colegio-la-paz"}
    mockRepo.On("FindBySlug", mock.Anything, "colegio-la-paz").Return(expected, nil)
    
    result, err := svc.GetBySlug(context.Background(), "colegio-la-paz")
    
    assert.NoError(t, err)
    assert.Equal(t, expected.Slug, result.Slug)
    mockRepo.AssertExpectations(t)
}
```

### Integration test de Handler
```go
// backend/internal/modules/auth/handler_test.go
func TestLogin_Success(t *testing.T) {
    app := SetupTestApp(t) // levanta Fiber con BD de test
    
    body := `{"email":"admin@test.com","password":"password123"}`
    req := httptest.NewRequest("POST", "/api/v1/auth/login", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    
    resp, _ := app.Test(req)
    
    assert.Equal(t, 200, resp.StatusCode)
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    assert.NotEmpty(t, result["data"].(map[string]interface{})["access_token"])
}
```

---

## FRONTEND — PATRONES DE TEST

### Test de validación Zod
```typescript
// components/modules/students/__tests__/student-form.test.ts
import { studentSchema } from '../student-form'

describe('studentSchema', () => {
  it('validates required fields', () => {
    const result = studentSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('firstName')
  })
})
```

### Test de componente
```typescript
import { render, screen, userEvent } from '@testing-library/react'
import { AttendanceGrid } from '../attendance-grid'

it('marks student as absent on click', async () => {
  const onChangeMock = jest.fn()
  render(<AttendanceGrid students={mockStudents} onChange={onChangeMock} />)
  
  await userEvent.click(screen.getByTestId('student-1-absent'))
  
  expect(onChangeMock).toHaveBeenCalledWith('student-1', 'absent')
})
```

---

## COMANDOS

```bash
# Backend
make test              # Unit tests
make test-integration  # Integration tests (requiere PostgreSQL local)
make test-coverage     # Coverage report

# Frontend
npm test               # Jest
npm run test:e2e       # Playwright
```
