-- Seed Super Admin user placeholder.
-- This migration intentionally does not ship a usable production password.
-- Use backend/scripts/seed_hostinger_mysql.go or a secure Postgres seed with an explicit env password.
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'admin@educore.mx', 'disabled-use-secure-seed-script', 'Super', 'Admin', 'SUPER_ADMIN', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@educore.mx');
