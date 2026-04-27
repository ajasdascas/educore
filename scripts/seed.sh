#!/bin/bash
# scripts/seed.sh
# Inserta datos de prueba en la BD de desarrollo
# Uso: ./scripts/seed.sh

set -e

DB_URL="${DATABASE_URL:-postgres://educore:educore_dev_password@localhost:5432/educore_dev?sslmode=disable}"

echo "🌱 Insertando datos de prueba..."

psql "$DB_URL" <<'SQL'

-- ═══════════════════════════════════════
-- SUPER ADMIN
-- ═══════════════════════════════════════
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    NULL,
    COALESCE(current_setting('app.super_admin_email', true), 'admin@educore.mx'),
    -- bcrypt hash de "cambiar_en_produccion"
    '$2a$12$LJ3mFGv5U3Y9GHKI7b6IOe3Z6VIPwFqKm4r1bDdZqQ4M5yx2Jz.pq',
    'Super',
    'Admin',
    'SUPER_ADMIN',
    true,
    NOW()
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- ═══════════════════════════════════════
-- TENANT DE PRUEBA
-- ═══════════════════════════════════════
INSERT INTO tenants (id, slug, name, status, plan)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'colegio-demo',
    'Colegio Demo',
    'active',
    'pro'
) ON CONFLICT (slug) DO NOTHING;

-- Feature flags para el tenant
INSERT INTO tenant_modules (tenant_id, module_key, is_active) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'attendance', true),
    ('b0000000-0000-0000-0000-000000000001', 'grades', true),
    ('b0000000-0000-0000-0000-000000000001', 'notifications', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════
-- SCHOOL ADMIN DEL TENANT DE PRUEBA
-- ═══════════════════════════════════════
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'director@colegio-demo.educore.mx',
    '$2a$12$LJ3mFGv5U3Y9GHKI7b6IOe3Z6VIPwFqKm4r1bDdZqQ4M5yx2Jz.pq',
    'María',
    'González',
    'SCHOOL_ADMIN',
    true,
    NOW()
) ON CONFLICT (tenant_id, email) DO NOTHING;

SQL

echo "✅ Datos de prueba insertados"
echo "   Super Admin: admin@educore.mx / cambiar_en_produccion"
echo "   School Admin: director@colegio-demo.educore.mx / cambiar_en_produccion"
