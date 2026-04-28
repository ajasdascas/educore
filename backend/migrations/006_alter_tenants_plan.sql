-- Migration: 006_alter_tenants_plan.sql

-- Eliminar el constraint CHECK de la columna plan
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;

-- Cambiar la columna plan a UUID y establecer la referencia
-- Como ya hay datos con 'starter', etc., primero creamos una nueva columna, migramos y eliminamos la vieja, o simplemente cambiamos el tipo.
-- Para simplificar y mantener la integridad, vamos a cambiarla a VARCHAR(100) para permitir IDs o nombres,
-- pero idealmente debería ser un UUID.
-- Vamos a permitir cualquier texto por ahora para no romper los mocks existentes.
ALTER TABLE tenants ALTER COLUMN plan TYPE VARCHAR(100);
