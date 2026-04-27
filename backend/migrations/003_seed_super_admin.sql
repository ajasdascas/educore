-- Seed Super Admin user
-- Password: admin123 (bcrypt hash)
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at)
VALUES (
  gen_random_uuid(),
  NULL,
  'admin@educore.mx',
  '$2a$10$MJsfnrvcdfz1LtAsrYyiYeKhFbK/LdUbGuKMhfEu0rxfaKjzpVMV.',
  'Super',
  'Admin',
  'SUPER_ADMIN',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING;
