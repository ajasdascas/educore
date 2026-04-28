-- COMBINED MIGRATION FOR RAILWAY POSTGRES
-- Copy and paste this into the Railway Postgres "Query" tab

-- 1. Initial Tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    invitation_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Catalog & Settings
CREATE TABLE IF NOT EXISTS modules_catalog (
  key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_core BOOLEAN DEFAULT FALSE,
  price_monthly_mxn DECIMAL(10,2) DEFAULT 0
);

INSERT INTO modules_catalog (key, name, is_core, price_monthly_mxn) VALUES
  ('academic_core', 'Académico Básico', TRUE, 0),
  ('parent_portal', 'Portal de Padres', TRUE, 0),
  ('teacher_portal', 'Portal de Profesores', TRUE, 0),
  ('communication', 'Mensajería y Comunicación', TRUE, 0),
  ('payments_basic', 'Pagos y Colegiaturas', TRUE, 0)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  school_year VARCHAR(20),
  periods JSONB DEFAULT '[]',
  grading_scale JSONB DEFAULT '{"min":0,"max":10,"passing":6}',
  primary_color VARCHAR(7) DEFAULT '#1A3C6E',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Infrastructure Tables
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Seed Super Admin (Password: admin123)
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'admin@educore.mx', '$2a$10$MJsfnrvcdfz1LtAsrYyiYeKhFbK/LdUbGuKMhfEu0rxfaKjzpVMV.', 'Super', 'Admin', 'SUPER_ADMIN', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@educore.mx');
