-- Seed Super Admin user
-- Password: admin123 (bcrypt hash)
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'admin@educore.mx', '$2a$10$MJsfnrvcdfz1LtAsrYyiYeKhFbK/LdUbGuKMhfEu0rxfaKjzpVMV.', 'Super', 'Admin', 'SUPER_ADMIN', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@educore.mx');
