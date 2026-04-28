# EduCore — SaaS de Administración Escolar
**Instrucciones maestras para cualquier agente IA (Claude Code, Claude.ai, Antigravity, Cursor, Codex, Gemini CLI).** 
Este archivo se lee en CADA arranque de sesión. No lo sobrescribas sin avisarle al usuario.

---

## 1. Identidad del proyecto

**Nombre:** EduCore  
**Dueño:** Giovanni (Ingeniería Mecatrónica TSU, México — Jiutepec, Morelos)  
**Objetivo:** SaaS B2B completo de administración escolar multi-tenant con roles jerárquicos (SuperAdmin → SchoolAdmin → Teacher → Parent). Manejo de escuelas, alumnos, profesores, calificaciones, asistencias, reportes y comunicación entre actores educativos.  
**Modelo de negocio:** Suscripción mensual por escuela con módulos escalables (Basic/Premium/Enterprise)  
**Mercado objetivo:** Escuelas privadas pequeñas y medianas en LATAM (50-500 alumnos)  
**Perfil técnico:** Giovanni tiene bases sólidas en electrónica, programación y sistemas, con enfoque en backend robusto y frontend responsivo de nivel profesional.

---

## 2. Principio rector — "Excelencia en SaaS B2B"

Giovanni está construyendo un sistema de clase empresarial que compita con plataformas internacionales. La prioridad es **robustez, seguridad y experiencia de usuario** superior.

### Reglas innegociables:
- **Multi-tenancy hermético:** RLS en PostgreSQL, sin filtrar tenant_id en aplicación
- **Seguridad primero:** Autenticación JWT, autorización RBAC, audit logs completos
- **Performance:** Sub-200ms response time, optimizaciones de DB, caching inteligente  
- **Escalabilidad:** Arquitectura que soporte 1000+ escuelas sin refactoring mayor
- **UX profesional:** Interfaces que inspiren confianza, responsive perfecto, accesibilidad WCAG
- **Zero downtime:** Migraciones sin interrupciones, deploys blue/green, monitoring proactivo

---

## 3. Arquitectura del sistema

```
~/educore/                           ← repo git (GitHub público)
├── CLAUDE.md                        ← este archivo (contexto global)
├── CLAUDE.local.md                  ← overrides personales (gitignored)
├── README.md                        ← documentación pública
├── .claude/
│   ├── settings.json                ← permisos + MCP config (commit)
│   ├── settings.local.json          ← permisos personales (gitignored)
│   ├── commands/                    ← slash commands manuales
│   │   ├── migrate-db.md            ← /migrate-db (migraciones seguras)
│   │   ├── test-suite.md            ← /test-suite (ejecutar tests)
│   │   ├── deploy-staging.md        ← /deploy-staging (deploy automático)
│   │   ├── audit-security.md        ← /audit-security (revisión de seguridad)
│   │   ├── generate-docs.md         ← /generate-docs (documentación API)
│   │   └── performance-check.md     ← /performance-check (métricas perf)
│   ├── rules/                       ← reglas modulares
│   │   ├── api-conventions.md       ← estándares de API REST
│   │   ├── code-style.md            ← convenciones Go/TS/SQL
│   │   ├── testing.md               ← estrategia de testing
│   │   ├── security-checklist.md    ← checklist de seguridad
│   │   └── db-migrations.md         ← procedimientos de migración
│   ├── skills/                      ← workflows auto-invocados
│   │   ├── registry.json            ← 🔑 Registro maestro de skills
│   │   ├── backend-architect/       ← diseño y refactor backend
│   │   ├── frontend-ux-master/      ← UI/UX y optimización FE
│   │   ├── database-optimizer/      ← queries, índices, performance DB
│   │   ├── security-auditor/        ← auditoría de vulnerabilidades
│   │   ├── test-engineer/           ← generación y ejecución de tests
│   │   ├── api-designer/            ← diseño de APIs RESTful
│   │   ├── deployment-manager/      ← CI/CD y deployment automation
│   │   ├── grill-me/                ← 🔥 presión crítica a ideas
│   │   ├── humanizalo/              ← 🗣️ humanizar texto AI
│   │   ├── fact-checker/            ← 🔍 verificación de hechos
│   │   ├── mcp-builder/             ← 🔌 construir servidores MCP
│   │   └── prompt-master/           ← ✍️ ingeniería de prompts
│   ├── agents/                      ← subagentes con contexto aislado
│   │   ├── system-architect.md      ← arquitecto senior, diseña módulos
│   │   ├── security-expert.md       ← experto en seguridad B2B
│   │   ├── db-specialist.md         ← especialista en PostgreSQL
│   │   ├── ux-researcher.md         ← investigador de UX educativo
│   │   └── obsidian-scribe.md       ← escribe a la bóveda Obsidian
│   ├── antigravity/                 ← 🌌 sistema de sincronización con Antigravity
│   │   ├── ANTIGRAVITY_SYSTEM_PROMPT.md  ← system prompt vivo de Antigravity
│   │   └── sync_log.json            ← log de sincronizaciones
│   ├── hooks/                       ← automatizaciones post-instalación
│   │   └── on_skill_install.sh      ← se ejecuta al instalar cualquier skill
│   └── mcp.json                     ← conectores MCP del proyecto
├── docs/obsidian/                   ← bóveda Obsidian (MEMORIA del agente)
│   ├── 00_index.md
│   ├── 01_architecture/
│   │   ├── backend-modules.md
│   │   ├── database-schema.md
│   │   ├── api-design.md
│   │   └── security-model.md
│   ├── 02_development/
│   │   ├── coding-standards.md
│   │   ├── testing-strategy.md
│   │   └── deployment-process.md
│   ├── 03_progress/
│   │   ├── CONTEXTO_ACTUAL.md       ← estado actual del proyecto
│   │   ├── CAMBIOS_RECIENTES.md     ← changelog detallado
│   │   └── DECISIONES_TECNICAS.md   ← decisiones arquitectónicas
│   ├── 04_modules/                  ← documentación por módulo
│   │   ├── auth/
│   │   ├── tenants/
│   │   ├── schools/
│   │   ├── students/
│   │   └── reports/
│   ├── 05_ui_ux/                    ← diseño y experiencia
│   │   ├── design-system.md
│   │   ├── responsive-guidelines.md
│   │   └── accessibility.md
│   └── _claude/                     ← output generado por Claude
│       ├── memory.md                ← estado persistente entre sesiones
│       └── decisions-log.md         ← log de decisiones
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── events/                  ← Bus de eventos
│   │   ├── middleware/
│   │   ├── modules/                 ← Módulos independientes
│   │   └── pkg/                     ← Utilidades compartidas
│   ├── migrations/
│   └── scripts/
├── frontend/
│   ├── app/                         ← App Router Next.js 14
│   ├── components/
│   │   ├── ui/                      ← shadcn/ui components
│   │   └── modules/                 ← Lógica por módulo
│   ├── lib/
│   └── types/
├── scripts/                         ← automatización y deploy
│   ├── setup.sh
│   ├── migrate.sh
│   ├── test.sh
│   ├── deploy-staging.sh
│   └── deploy-prod.sh
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Convenciones de color (sistema de archivos)
🟢 **Verde** = commit a git (compartible): CLAUDE.md, settings.json, commands/, rules/, skills/, agents/  
🟡 **Naranja** = gitignored (personal): CLAUDE.local.md, settings.local.json, .env, datos sensibles  
🟣 **Morado** = auto-invocado (skills/)  
🌸 **Rosa** = subagente aislado (agents/)  
🔵 **Azul** = documentación viva (docs/obsidian/)

---

## 4. Stack tecnológico

### IDEs y agentes (cualquiera funciona, elegir según contexto)

| Herramienta | Cuándo usar | Modelo | Costo |
|-------------|-------------|--------|-------|
| Claude Code | Trabajo serio, refactors, lectura de docs | Sonnet 4.6 / Opus 4.7 | Pro $20/mes |
| Google Antigravity | Tareas agénticas largas, multi-agente | Gemini 3 Pro + Claude Sonnet | Free tier |
| Cursor | Edición rápida con autocompletado | Claude / GPT / Gemini | $20/mes |
| Gemini CLI | Consultas puntuales, análisis masivo de código | Gemini 2.5 Pro | Free |
| Claude.ai web | Conversación casual, planning, brainstorming | Opus 4.7 | Pro |

**Regla de economización:** Usar Antigravity con Gemini para tareas simples, reservar Claude Opus para arquitectura compleja y decisiones críticas.

### Memoria persistente (OBLIGATORIO)
La bóveda Obsidian en `docs/obsidian/` ES la memoria del agente. Reglas:

- Cada sesión empieza leyendo `docs/obsidian/03_progress/CONTEXTO_ACTUAL.md`
- Cada sesión termina escribiendo un resumen a `docs/obsidian/_claude/memory.md` (append, nunca sobrescribir)
- Cada decisión arquitectónica se registra en `docs/obsidian/_claude/decisions-log.md` con fecha, razón, impacto
- Cada módulo tiene su propia documentación en `docs/obsidian/04_modules/[MODULE]/`
- Usar wikilinks `[[Auth Module]]`, `[[Database Schema]]` para el grafo de conocimiento
- Tags obligatorios: `#module`, `#architecture`, `#security`, `#performance`, `#frontend`, `#backend`

---

## 5. MCPs a instalar (en .claude/mcp.json)

### Tier 1 — Esenciales (instalar ya)
```json
{
  "mcpServers": {
    "postgres": {
      "command": "uvx",
      "args": ["postgres-mcp"],
      "env": { "DATABASE_URL": "${DATABASE_URL}" }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${HOME}/educore"
      ]
    },
    "obsidian": {
      "command": "npx",
      "args": ["-y", "obsidian-mcp-server"],
      "env": { "OBSIDIAN_VAULT_PATH": "${OBSIDIAN_VAULT_PATH}" }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    },
    "docker": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "mcp/docker"]
    },
    "redis": {
      "command": "uvx",
      "args": ["redis-mcp"],
      "env": { "REDIS_URL": "${REDIS_URL}" }
    }
  }
}
```

### Tier 2 — Complementarios (cuando lo básico funcione)
- **testing-mcp** — ejecución de tests automatizados
- **monitoring-mcp** — métricas de performance y health checks
- **deployment-mcp** — automatización de deploys
- **security-scanner-mcp** — escaneo de vulnerabilidades

### API keys a obtener (gratis o esenciales)
- **GitHub Personal Access Token** — scope `repo` para el repo privado
- **Vercel/Railway Token** — para deploys automáticos
- **Resend API Key** — para emails transaccionales
- **OpenRouter** (opcional) — API unificada si quiere usar múltiples modelos

---

## 6. Skills (en .claude/skills/)

### 6.1 backend-architect/SKILL.md
Diseño y refactoring de la arquitectura backend. Clean Architecture, patrones GoF, performance optimization, security patterns.

### 6.2 frontend-ux-master/SKILL.md 
UI/UX de clase mundial. Responsive design, accesibilidad, performance web, Design System con shadcn/ui.

### 6.3 database-optimizer/SKILL.md
**SKILL CRÍTICA.** Optimización de queries, diseño de índices, RLS policies, migration strategies, performance tuning PostgreSQL.

### 6.4 security-auditor/SKILL.md
Auditoría de vulnerabilidades: SQL injection, XSS, CSRF, weak authentication, privilege escalation, data leaks.

### 6.5 test-engineer/SKILL.md
Estrategia completa de testing: unit tests (Go), integration tests, E2E (Playwright), load testing, security testing.

### 6.6 api-designer/SKILL.md
Diseño de APIs RESTful consistentes, OpenAPI specs, rate limiting, versioning, error handling standardizado.

### 6.7 deployment-manager/SKILL.md
CI/CD pipelines, Docker optimization, zero-downtime deployments, rollback strategies, monitoring y alerting.

### 6.8 grill-me/SKILL.md 🔥
```yaml
---
name: grill-me
description: Activa cuando el usuario quiera que sus ideas sean desafiadas. En contexto EduCore, activa automáticamente cuando se presente una propuesta arquitectónica o decisión técnica que pueda tener impactos críticos.
---

# Grill-Me

## Propósito
Someter ideas técnicas, decisiones arquitectónicas o propuestas de features a interrogación crítica intensa. Detectar puntos débiles ANTES de implementar.

## Procedimiento
1. Analizar la propuesta completamente
2. Identificar los 5 riesgos técnicos más críticos
3. Cuestionar escalabilidad, seguridad, mantenibilidad
4. Proponer escenarios de fallo con probabilidad
5. Sugerir alternativas más robustas
6. Veredicto: Proceder / Modificar / Rediseñar

## En contexto SaaS B2B
Agregar siempre: ¿Cómo escala a 1000+ tenants? ¿Qué pasa si un tenant malicioso ataca? ¿El diseño soporta compliance (GDPR, COPPA)?
```

### 6.9 humanizalo/SKILL.md 🗣️
Transformar documentación técnica y specs en lenguaje accesible para stakeholders no técnicos.

### 6.10 mcp-builder/SKILL.md 🔌
Construir servidores MCP específicos para EduCore: integraciones con sistemas escolares, APIs de calificaciones, etc.

---

## 7. Sistema de Skills Registry y Sincronización con Antigravity

### 7.1 Registry de Skills
```bash
# Verificar estado
cat ~/.claude/projects/educore/.claude/skills/registry.json

# Si no existe, crear con script:
python3 - << 'PYEOF'
import json, datetime, os

registry = {
  "version": "1.0", 
  "project": "EduCore",
  "created_at": datetime.datetime.now().isoformat(),
  "skills": {
    "backend-architect":   {"status": "active", "version": "1.0"},
    "frontend-ux-master":  {"status": "active", "version": "1.0"},
    "database-optimizer":  {"status": "active", "version": "1.0"},
    "security-auditor":    {"status": "active", "version": "1.0"},
    "test-engineer":       {"status": "active", "version": "1.0"},
    "api-designer":        {"status": "active", "version": "1.0"},
    "deployment-manager":  {"status": "active", "version": "1.0"},
    "grill-me":           {"status": "active", "version": "1.0"},
    "humanizalo":         {"status": "active", "version": "1.0"},
    "mcp-builder":        {"status": "active", "version": "1.0"}
  }
}

path = os.path.expanduser("~/educore/.claude/skills/registry.json")
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w', encoding='utf-8') as f:
    json.dump(registry, f, indent=2, ensure_ascii=False)
print(f"✅ Registry creado — {len(registry['skills'])} skills activas")
PYEOF
```

---

## 8. Slash commands (en .claude/commands/)

### /migrate-db
Ejecuta migraciones de DB de manera segura con backups automáticos y rollback plan.

### /test-suite  
Ejecuta suite completa de tests: unit → integration → E2E, con reporte de coverage.

### /deploy-staging
Deploy automático a staging con health checks y smoke tests.

### /audit-security
Auditoría completa de seguridad: deps vulnerables, SQL injection, XSS, auth bypasses.

### /generate-docs
Genera documentación API automática con OpenAPI + ejemplos + Postman collection.

### /performance-check
Análisis de performance: DB slow queries, frontend Core Web Vitals, memory leaks.

---

## 9. Agentes (en .claude/agents/)

### system-architect.md
**Contexto aislado.** Rol: arquitecto senior de sistemas. Diseña módulos, APIs, esquemas de DB. Sin acceso al código actual para evitar sesgo.

### security-expert.md  
**Contexto aislado.** Rol: security consultant B2B. Audita arquitectura, identifica vectores de ataque, sugiere controles.

### db-specialist.md
**Contexto aislado.** Rol: DBA senior PostgreSQL. Optimiza queries, diseña índices, RLS policies, estrategias de sharding.

### ux-researcher.md
**Contexto aislado.** Rol: UX researcher especializado en EdTech. Analiza flujos de usuarios educativos, sugiere mejoras de usabilidad.

---

## 10. Flujos de desarrollo

### Flujo de feature nueva (ejemplo: módulo de asistencias)
1. **Planning** → Antigravity con `system-architect` diseña la arquitectura
2. **Security review** → `security-expert` audita el diseño  
3. **Implementation** → Claude Code con skills `backend-architect` + `frontend-ux-master`
4. **Testing** → `test-engineer` genera tests completos
5. **Documentation** → `humanizalo` genera docs para usuarios finales
6. **Deploy** → `deployment-manager` ejecuta deploy seguro

### Flujo diario típico
- **09:00 MX** — Revisar `CONTEXTO_ACTUAL.md`, planificar el día
- **Durante desarrollo** — Skills se auto-invocan según el contexto del trabajo
- **16:00 MX** — `/performance-check` antes de commits importantes  
- **18:00 MX** — Actualizar `CAMBIOS_RECIENTES.md` con progress del día
- **Viernes** — `/audit-security` + revisión semanal en Obsidian

---

## 11. Reglas de comportamiento del agente (hard-coded)

### El agente DEBE:
- **Hablar en español** con Giovanni. Usar terminología técnica en inglés sin traducir (middleware, endpoint, cache)
- **Tutear y ser directo.** Sin intros largas o cierres robóticos
- **Fechas explícitas** (DD-MM-YYYY) y zona horaria México cuando aplique
- **Nunca inventar datos.** Si no hay información, decir "no disponible" y explicar cómo obtenerla
- **Proponer alternativas** cuando rechace algo (no dejar sin siguiente paso)
- **Registrar todo** en la bóveda Obsidian. Si no está documentado, no existe
- **Verificar registry.json** al iniciar, **leer memory.md** para continuidad
- **Ejecutar hook de sincronización** automáticamente al instalar skills

### El agente NUNCA DEBE:
- **Ejecutar comandos destructivos** sin confirmación explícita (DROP TABLE, rm -rf)
- **Hacer cambios de schema** sin migración formal
- **Comprometer seguridad** por conveniencia (hardcodear credenciales, omitir validaciones)
- **Omitir tests** en features críticas de seguridad o multi-tenancy  
- **Trabajar sin documentar** el contexto en Obsidian
- **Borrar skills** sin marcarlas como deprecated primero

---

## 12. Módulos MVP (roadmap actualizado)

| # | Módulo | Estado | Prioridad | Estimación |
|---|--------|--------|-----------|------------|
| 1 | **Infraestructura + Auth + Multi-tenancy** | ✅ Completado | 🔴 Crítico | — |
| 2 | **Manager Maestro (Super Admin)** | 🔨 En progreso | 🔴 Crítico | 2 semanas |
| 3 | **Manager Escuela + Núcleo Académico** | ⬜ Pendiente | 🔴 Crítico | 3 semanas |
| 4 | **Portal de Padres** | ⬜ Pendiente | 🟠 Alto | 2 semanas |
| 5 | **Reportes y Analytics** | ⬜ Pendiente | 🟠 Alto | 1 semana |
| 6 | **Comunicaciones (Email/SMS)** | ⬜ Pendiente | 🟡 Medio | 1 semana |

---

## 13. Archivos que deben existir desde hoy

### Crear inmediatamente (el agente puede generar):
- `docs/obsidian/_claude/memory.md` — memoria persistente del proyecto
- `docs/obsidian/_claude/decisions-log.md` — log de decisiones arquitectónicas
- `docs/obsidian/03_progress/CONTEXTO_ACTUAL.md` — estado actual detallado
- `docs/obsidian/03_progress/CAMBIOS_RECIENTES.md` — changelog estructurado  
- `docs/obsidian/03_progress/DECISIONES_TECNICAS.md` — decisiones inmutables
- `.claude/skills/registry.json` — registro de skills activas
- `.claude/antigravity/ANTIGRAVITY_SYSTEM_PROMPT.md` — sincronización con Antigravity
- `.claude/hooks/on_skill_install.sh` — hook de instalación de skills
- `.env.example` — todas las variables documentadas

---

## 14. Disclaimer y principios finales

⚠️ **Este es un sistema de desarrollo profesional.** Giovanni está construyendo un SaaS de clase empresarial que debe competir con soluciones internacionales. Toda decisión técnica debe evaluarse bajo los criterios de **escalabilidad, seguridad, mantenibilidad y experiencia de usuario**.

**Última actualización:** 2026-04-27  
**Mantenedor:** Giovanni + agentes IA colaborativos  
**Licencia:** Propietario  
**Skills activas:** backend-architect, frontend-ux-master, database-optimizer, security-auditor, test-engineer, api-designer, deployment-manager, grill-me, humanizalo, mcp-builder (10 total)  
**Estado del proyecto:** Fase 2 - Manager Maestro en desarrollo