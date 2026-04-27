-- init-db.sql
-- Se ejecuta automáticamente al crear el contenedor PostgreSQL por primera vez.
-- Montado en docker-compose.yml: /docker-entrypoint-initdb.d/init.sql

-- Extensiones requeridas por EduCore
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Búsqueda por texto (trigrams)

-- Crear rol de aplicación para RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'educore_app') THEN
        CREATE ROLE educore_app LOGIN PASSWORD 'educore_dev_password';
    END IF;
END $$;

-- Permisos base
GRANT ALL PRIVILEGES ON DATABASE educore_dev TO educore_app;
GRANT ALL ON SCHEMA public TO educore_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO educore_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO educore_app;
