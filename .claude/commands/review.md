# Comando: /review
# Uso: /review [archivo o carpeta]
# Ejemplo: /review backend/internal/modules/auth/

Revisa el código indicado siguiendo estos criterios específicos para EduCore:

## CHECKLIST DE REVISIÓN

### 🔒 Seguridad Multi-Tenant
- [ ] ¿Todas las queries filtran por `tenant_id`?
- [ ] ¿El middleware de tenant se aplica a todas las rutas protegidas?
- [ ] ¿Las políticas RLS están activas en las tablas nuevas?
- [ ] ¿El JWT payload incluye `tenant_id` y `role`?
- [ ] ¿Los endpoints validan que el recurso pertenece al tenant del usuario?

### 🏗️ Arquitectura
- [ ] ¿Los handlers no contienen lógica de negocio?
- [ ] ¿Los services no contienen queries SQL directas?
- [ ] ¿Los repositories no conocen de Fiber (framework)?
- [ ] ¿Se inyectan dependencias (no instanciar dentro)?

### 🐹 Go / Fiber
- [ ] ¿Se manejan todos los errores (no `_` en errores críticos)?
- [ ] ¿Se usa `context.Context` correctamente?
- [ ] ¿Las goroutines tienen timeout o cancelación?
- [ ] ¿Se cierran los recursos (defer close)?
- [ ] ¿Los structs tienen tags de validación (`validate:"required"`)?

### ⚛️ Next.js / TypeScript
- [ ] ¿Los Server Components no usan hooks de cliente?
- [ ] ¿Los formularios usan React Hook Form + Zod?
- [ ] ¿El fetching usa TanStack Query en cliente?
- [ ] ¿No hay `any` en TypeScript?
- [ ] ¿Los componentes tienen tipos explícitos en props?

### 🎨 UI/UX
- [ ] ¿Hay loading states en operaciones async?
- [ ] ¿Hay manejo de errores visible para el usuario?
- [ ] ¿El diseño es mobile-first?
- [ ] ¿Los formularios tienen validación en tiempo real?

### 📝 Calidad
- [ ] ¿Las funciones tienen menos de 50 líneas?
- [ ] ¿Los nombres son descriptivos (no `x`, `tmp`, `data`)?
- [ ] ¿Hay comentarios en lógica compleja?

## FORMATO DE REPORTE

Responde con:
```
## Revisión: [archivo/carpeta]

### ✅ Bien
- [Lista de cosas correctas]

### ⚠️ Mejorar
- [Lista con sugerencia de mejora]

### 🔴 Crítico (debe corregirse)
- [Lista de problemas graves con solución propuesta]

### 📊 Score: [X/10]
```
