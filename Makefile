# EduCore — Makefile
# Uso: make [comando]

.PHONY: help dev stop logs migrate seed test build save

# ──────────────────────────────────────────
help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ──────────────────────────────────────────
# DESARROLLO
# ──────────────────────────────────────────
dev: ## Levanta todo el stack de desarrollo
	@echo "🚀 Iniciando EduCore..."
	docker-compose up -d
	@echo "⏳ Esperando PostgreSQL..."
	@sleep 2
	@make migrate
	@echo "🟢 Iniciando backend Go..."
	cd backend && go run ./cmd/server/main.go &
	@echo "🟢 Iniciando frontend Next.js..."
	cd frontend && npm run dev &
	@echo ""
	@echo "✅ EduCore corriendo:"
	@echo "   Frontend → http://localhost:3000"
	@echo "   Backend  → http://localhost:8080"
	@echo "   API Docs → http://localhost:8080/swagger"

stop: ## Detiene todos los servicios
	docker-compose down
	pkill -f "go run" || true
	pkill -f "next dev" || true

logs: ## Ver logs en tiempo real
	docker-compose logs -f

# ──────────────────────────────────────────
# BASE DE DATOS
# ──────────────────────────────────────────
migrate: ## Corre migraciones pendientes
	@echo "🗄️  Corriendo migraciones..."
	./scripts/migrate.sh up

migrate-down: ## Revierte la última migración
	./scripts/migrate.sh down

seed: ## Inserta datos de prueba
	./scripts/seed.sh

db: ## Abre psql directamente
	docker-compose exec postgres psql -U educore -d educore_dev

# ──────────────────────────────────────────
# TESTS
# ──────────────────────────────────────────
test: ## Corre unit tests del backend
	cd backend && go test ./... -v -short

test-integration: ## Corre integration tests (necesita DB)
	cd backend && go test ./... -v -run Integration

test-fe: ## Corre tests del frontend
	cd frontend && npm test

test-all: test test-fe ## Corre todos los tests

# ──────────────────────────────────────────
# BUILD
# ──────────────────────────────────────────
build: ## Build de producción
	@echo "🏗️ Building backend..."
	cd backend && CGO_ENABLED=0 GOOS=linux go build -o bin/server ./cmd/server/main.go
	@echo "🏗️ Building frontend..."
	cd frontend && npm run build

# ──────────────────────────────────────────
# CALIDAD
# ──────────────────────────────────────────
lint: ## Linting de todo el proyecto
	cd backend && golangci-lint run ./...
	cd frontend && npm run lint

fmt: ## Formatea el código
	cd backend && gofmt -w .
	cd frontend && npm run format

# ──────────────────────────────────────────
# GIT / OBSIDIAN
# ──────────────────────────────────────────
save: ## Commit + push automático con Obsidian sync
	@read -p "Descripción del cambio: " msg; \
	./scripts/auto-commit.sh "$$msg"

save-quick: ## Commit rápido sin descripción manual
	./scripts/auto-commit.sh

# ──────────────────────────────────────────
# SETUP INICIAL
# ──────────────────────────────────────────
setup: ## Configuración inicial del proyecto
	@echo "🔧 Configurando EduCore..."
	cp .env.example .env
	docker-compose up -d
	@sleep 3
	cd backend && go mod download
	cd frontend && npm install
	@make migrate
	@make seed
	@echo ""
	@echo "✅ Setup completo. Corre 'make dev' para iniciar."
