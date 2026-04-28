-- Migration: 005_subscription_plans.sql
-- Description: Crea la tabla de planes de suscripción para gestionar los planes (Básico, Pro, etc.)

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    price_annual DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    max_students INT NOT NULL DEFAULT 0, -- 0 = Ilimitado
    max_teachers INT NOT NULL DEFAULT 0, -- 0 = Ilimitado
    modules JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista de module_keys (ej. ["parent_portal", "reports"])
    features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista de bullets de texto para mostrar en frontend
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Seed de planes iniciales por defecto
INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, max_students, max_teachers, modules, features, is_active, is_featured)
VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'Básico', 
    'Plan ideal para escuelas pequeñas o de un solo nivel.', 
    999.00, 
    9990.00, 
    100, 
    10, 
    '["academic_management", "attendance", "grades", "communications"]'::jsonb, 
    '["Hasta 100 alumnos", "Gestión académica básica", "Control de asistencia", "Boletas de calificaciones", "Comunicados generales"]'::jsonb,
    true, 
    false
) ON CONFLICT DO NOTHING;

INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, max_students, max_teachers, modules, features, is_active, is_featured)
VALUES 
(
    '00000000-0000-0000-0000-000000000002',
    'Profesional', 
    'Nuestro plan más popular para colegios con requerimientos completos.', 
    2499.00, 
    24990.00, 
    500, 
    50, 
    '["academic_management", "attendance", "grades", "communications", "parent_portal", "reports"]'::jsonb, 
    '["Hasta 500 alumnos", "Todo lo del plan Básico", "Portal para Padres de Familia", "Reportes y estadísticas", "Soporte prioritario"]'::jsonb,
    true, 
    true
) ON CONFLICT DO NOTHING;

INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, max_students, max_teachers, modules, features, is_active, is_featured)
VALUES 
(
    '00000000-0000-0000-0000-000000000003',
    'Enterprise', 
    'Para colegios grandes con múltiples campus o necesidades avanzadas.', 
    5999.00, 
    59990.00, 
    0, 
    0, 
    '["academic_management", "attendance", "grades", "communications", "parent_portal", "reports", "payments", "access_control"]'::jsonb, 
    '["Alumnos ilimitados", "Profesores ilimitados", "Todo lo del plan Profesional", "Módulo de pagos en línea", "Control de acceso", "Soporte 24/7"]'::jsonb,
    true, 
    false
) ON CONFLICT DO NOTHING;
