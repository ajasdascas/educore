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

#module #architecture #super_admin
