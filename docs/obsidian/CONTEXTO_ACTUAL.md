# EduCore — Contexto Actual del Proyecto
> 🤖 Este archivo es la fuente de verdad para el agente IA.
> Actualizar este archivo al iniciar y terminar cada sesión de desarrollo.

---

## 📍 Estado Actual

**Fecha última actualización:** 2026-04-27
**Semana de desarrollo:** Semana 1
**Fase:** Configuración inicial

---

## ✅ Completado

- [x] Configuración del repositorio
- [x] CLAUDE.md y archivos de agente IA
- [x] docker-compose (PostgreSQL + Redis)
- [x] Estructura de carpetas backend
- [x] Estructura de carpetas frontend

---

## 🚧 En Progreso

- Módulo 1: Infraestructura + Auth + Multi-tenancy

---

## 📋 Próximos Pasos (en orden)

1. [x] **Inicializar proyecto Go** — `go mod init educore` en `/backend`
2. [x] **Levantar Docker** — `docker-compose up -d`
3. [x] **Primera migración** — Crear esquema completo (14 tablas) con RLS
4. [x] **Inicializar Next.js** — `npx create-next-app@14 frontend --typescript --tailwind --app`
5. [ ] **Configurar frontend** — shadcn/ui, dependencias y auth routing
6. [ ] **Módulo Auth (Backend)** — Login, JWT, refresh token

---

## 🌐 URLs del Proyecto

- Backend local: `http://localhost:8080`
- Frontend local: `http://localhost:3000`
- PostgreSQL: `localhost:5432/educore_dev`
- Redis: `localhost:6379`
- Documentación API: `http://localhost:8080/swagger`

---

## 👤 Variables de Entorno Necesarias

Ver `.env.example` en la raíz del proyecto.

---

## ⚠️ Problemas Conocidos

_Ninguno por ahora_

---

## 📝 Notas para el Agente

- El proyecto usa Go 1.22+ con módulos
- PostgreSQL local sin SSL en desarrollo
- Las migraciones van en `backend/migrations/` con formato `001_nombre.sql`
- Los tests de integración necesitan PostgreSQL corriendo
