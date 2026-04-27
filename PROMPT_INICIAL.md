# ══════════════════════════════════════════════════════════
# 🚀 PROMPT INICIAL — PEGAR ESTO PRIMERO EN CUALQUIER EDITOR
# Compatible con: Cursor / Windsurf / Claude Code / Copilot
# ══════════════════════════════════════════════════════════

Eres el Tech Lead del proyecto **EduCore**, un SaaS multi-tenant de 
administración escolar para México y LATAM.

## TU PRIMERA TAREA

Crea la estructura completa del proyecto en el directorio actual.

### PASOS EN ORDEN:

**1. Crea la estructura de carpetas del agente IA:**

**Linux/macOS (bash):**
```bash
mkdir -p .claude/{commands,rules,skills/{ui-components,go-fiber,database},agents}
mkdir -p docs/obsidian/{MODULOS,DB}
mkdir -p scripts
```

**Windows (PowerShell):**
```powershell
'commands','rules','skills\ui-components','skills\go-fiber','skills\database','agents' | ForEach-Object { New-Item -ItemType Directory -Force -Path ".claude\$_" }
'MODULOS','DB' | ForEach-Object { New-Item -ItemType Directory -Force -Path "docs\obsidian\$_" }
New-Item -ItemType Directory -Force -Path "scripts"
```

**2. Copia estos archivos desde el repositorio de configuración:**
- `CLAUDE.md` → raíz del proyecto
- `CLAUDE.local.md` → raíz (y agrégalo a .gitignore)
- `.claude/settings.json`
- `.claude/commands/*.md` (new-module, review, fix-issue, deploy)
- `.claude/rules/*.md` (code-style, api-conventions, testing)
- `.claude/skills/ui-components/SKILL.md`
- `.claude/skills/go-fiber/SKILL.md`
- `.claude/skills/database/SKILL.md`
- `.claude/agents/*.md` (security-auditor, code-reviewer)
- `docs/obsidian/CONTEXTO_ACTUAL.md`
- `Makefile`
- `docker-compose.yml`
- `.env.example`
- `scripts/auto-commit.sh`

**3. Inicializa el backend Go:**
```bash
mkdir -p backend/cmd/server
mkdir -p backend/internal/{config,middleware,modules,pkg/{database,redis,jwt,response}}
mkdir -p backend/migrations backend/sqlc
cd backend && go mod init educore
go get github.com/gofiber/fiber/v2
go get github.com/jackc/pgx/v5
go get github.com/go-redis/redis/v9
go get github.com/golang-jwt/jwt/v5
go get github.com/go-playground/validator/v10
go get github.com/joho/godotenv
go get golang.org/x/crypto
go get github.com/google/uuid
go get github.com/resend/resend-go/v2
```

**4. Inicializa el frontend Next.js:**
```bash
cd ..
npx create-next-app@14 frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd frontend
npx shadcn@latest init
npm install framer-motion @tremor/react @tanstack/react-query zustand react-hook-form zod
```

**5. Crea el .gitignore:**
```
# Secrets
.env
CLAUDE.local.md
.claude/settings.local.json

# Go
backend/bin/
backend/tmp/
*.test

# Node
frontend/node_modules/
frontend/.next/
frontend/out/

# OS
.DS_Store
*.log
```

**6. Inicializa Git:**
```bash
git init
git add -A
git commit -m "chore: initial project setup — EduCore SaaS Escolar"
```

**7. Levanta la infraestructura local:**
```bash
cp .env.example .env
docker-compose up -d
# Espera 5 segundos y verifica
sleep 5 && docker-compose ps
```

**8. Confirma que todo está listo mostrando:**
- ✅ Estructura de carpetas creada
- ✅ Dependencias Go instaladas  
- ✅ Dependencias npm instaladas
- ✅ Docker corriendo (PostgreSQL + Redis)
- ✅ Git inicializado con primer commit

---

## DESPUÉS DEL SETUP — PRIMER MÓDULO

Una vez confirmado el setup, ejecuta el comando:
```
/new-module tenants "Motor multi-tenant — gestión de escuelas"
```

Y sigue con el protocolo de memoria:
1. Lee `docs/obsidian/CONTEXTO_ACTUAL.md`
2. Actualiza el estado cuando termines
3. Ejecuta `./scripts/auto-commit.sh "feat: scaffold módulo tenants"`
