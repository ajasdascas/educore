# Migration 018 — Hostinger Import Guide

## NO importar estos archivos (obsoletos/incompatibles)

- `018_kinder_preschool_data_tables.sql` — usa ENUM, falla en MariaDB
- `018_kinder_preschool_data_tables.hostinger_fixed.sql` — usa DEFAULT (UUID()) y columna `portion` (palabra reservada)

## Importar ahora

### Opcion segura (recomendada para phpMyAdmin)

Importar uno por uno en este orden:

1. `backend/migrations_mysql/018_hostinger_parts/01_kinder_daily_logs.sql`
2. `backend/migrations_mysql/018_hostinger_parts/02_kinder_meals.sql`
3. `backend/migrations_mysql/018_hostinger_parts/03_kinder_naps.sql`
4. `backend/migrations_mysql/018_hostinger_parts/04_kinder_diapers.sql`
5. `backend/migrations_mysql/018_hostinger_parts/05_kinder_mood.sql`
6. `backend/migrations_mysql/018_hostinger_parts/06_kinder_incidents.sql`
7. `backend/migrations_mysql/018_hostinger_parts/07_kinder_pickup_authorizations.sql`
8. `backend/migrations_mysql/018_hostinger_parts/08_preschool_qualitative_assessments.sql`
9. `backend/migrations_mysql/018_hostinger_parts/09_preschool_development_areas.sql`
10. `backend/migrations_mysql/018_hostinger_parts/10_preschool_observations.sql`
11. `backend/migrations_mysql/018_hostinger_parts/11_preschool_evidence.sql`

### Opcion rapida (si phpMyAdmin acepta multi-statement)

- `backend/migrations_mysql/018_kinder_preschool_data_tables.hostinger_v2.sql`

## IMPORTANTE: Si ya importaste el fixed anterior

Algunas tablas pudieron crearse parcialmente. Antes de importar v2:

```sql
-- Ver que tablas ya existen
SHOW TABLES LIKE 'kinder_%';
SHOW TABLES LIKE 'preschool_%';
SHOW TABLES LIKE 'pickup_%';

-- Si kinder_daily_logs ya existe (fue la primera tabla, probablemente se creo)
-- Si kinder_meals existe PERO con columna 'portion', eliminarla:
DROP TABLE IF EXISTS kinder_meals;

-- Luego importar solo la parte 02_kinder_meals.sql
```

Si la importacion anterior dijo "10 consultas ejecutadas" pero fallo en kinder_meals, significa que kinder_daily_logs SI se creo. Las tablas posteriores (naps, diapers, etc.) NO se crearon.

Plan de accion:
1. Verificar: `SHOW CREATE TABLE kinder_daily_logs;` — si existe, ya la tienes
2. Hacer DROP de kinder_meals si tiene la columna vieja `portion`
3. Importar las parts 02 a 11 una por una

## Validacion post-importacion

```sql
-- Verificar tablas creadas
SHOW TABLES LIKE 'kinder_%';
SHOW TABLES LIKE 'preschool_%';
SHOW TABLES LIKE 'pickup_%';

-- Verificar estructura de kinder_meals (debe tener meal_portion, NO portion)
SHOW CREATE TABLE kinder_meals;

-- Debe mostrar:
-- meal_portion VARCHAR(40) NOT NULL DEFAULT 'full'
-- meal_note VARCHAR(300) NULL
-- NO debe mostrar: portion, food_note

-- Contar tablas (deben ser 11 en total)
SELECT COUNT(*) FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN (
  'kinder_daily_logs', 'kinder_meals', 'kinder_naps',
  'kinder_diapers', 'kinder_mood', 'kinder_incidents',
  'pickup_authorizations', 'preschool_qualitative_assessments',
  'preschool_development_areas', 'preschool_observations', 'preschool_evidence'
);
-- Resultado esperado: 11
```

## Cambios de columnas vs version anterior

| Tabla | Columna vieja | Columna nueva |
|-------|--------------|---------------|
| kinder_meals | portion | meal_portion |
| kinder_meals | food_note | meal_note |

## Que se elimino en v2 vs fixed

- DEFAULT (UUID()) — el backend genera UUIDs desde Go
- FOREIGN KEY constraints — se validan desde aplicacion
- Ningun ENUM, JSON, CHECK constraint
- Ninguna columna con nombre reservado de MariaDB
