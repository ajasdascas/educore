# Contexto Actual — EduCore SaaS
**Fecha:** 28-04-2026

## 🚀 Estado del Proyecto
Estamos en la **Fase 2: Manager Maestro (Super Admin)**. Se ha establecido la base para la gestión comercial del SaaS.

### ✅ Logros Recientes
- **Infraestructura de Planes:** Base de datos y API para planes de suscripción (Básico, Profesional, Enterprise) completadas.
- **Frontend Super Admin:** Dashboard funcional y módulo de "Planes" integrado con el backend real.
- **Módulo de Escuelas (Super Admin):** 
    - Implementación de la vista de detalle de escuela (`/super-admin/schools/[id]`) con gestión de módulos y estados.
    - Filtros avanzados (búsqueda, estado, plan) y paginación real implementados en el listado de escuelas.
    - Validación de plan y slug en la creación de escuelas (Backend).
- **Módulo de Usuarios Globales (Super Admin):** ✅ **COMPLETADO**
    - CRUD completo para administradores de la plataforma con API real.
    - Backend: `/backend/internal/modules/super_admin/users.go` con todos los endpoints.
    - Frontend: `/frontend/app/super-admin/users/page.tsx` + `UserFormModal.tsx`.
    - Funcionalidades: crear, editar, listar, filtrar, paginar, toggle status, soft delete.

### 🛑 Pendientes Críticos (Lo que falta por hacer)
1. **Backend: Middleware de Cuotas:**
    - Hacer cumplir los límites de alumnos/profesores según el plan (diseño pendiente).
2. **Módulo de Escuelas (School Admin):**
    - Iniciar con el dashboard del director de escuela.
3. **Verificación final Super Admin:**
    - Confirmar que todas las secciones del dashboard usan datos reales (no mock).

## 🛠️ Stack y Configuración
- **Backend:** Go (Fiber) + PostgreSQL + Redis (Railway).
- **Frontend:** Next.js 14 (Static Export).
- **Despliegue:** FTP Sync a `onlineu.mx/educore`.

## Avance 29-04-2026
- **School Admin > Profesores:** completado con listado, filtros, crear, editar, detalle, activar/pausar, mock demo para produccion estatica y backend alineado al schema real.
- **School Admin > Estudiantes:** completado con listado, filtros, matricula, edicion, detalle, activar/pausar y eliminacion con confirmacion.
- **School Admin > Grupos:** completado con listado, busqueda, crear, editar, detalle, activar/pausar y eliminacion con confirmacion.
- **School Admin > Horarios:** completado con agenda semanal, filtros por grupo/dia/estado, crear, editar, detalle, activar/pausar, eliminacion con confirmacion y deteccion de cruces por grupo.
- **School Admin > Reportes:** completado con metricas, historial, filtros, generar reporte, detalle ejecutivo, descarga demo, reprocesar y eliminacion con confirmacion.
- **Correccion backend critica:** rutas de School Admin ya no duplican `/api/v1/school-admin`.
- **Verificacion:** `go test ./...`, `next build` y pruebas headless de Profesores, Estudiantes, Grupos, Horarios y Reportes OK.
- **Siguiente submodulo:** School Admin > Comunicaciones. No avanzar a Configuracion hasta que Comunicaciones quede 100% funcional.

#module #architecture #super_admin #school_admin
