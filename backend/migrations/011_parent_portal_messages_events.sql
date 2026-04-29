-- Migration: 011_parent_portal_messages_events.sql
-- Completa el Portal de Padres con mensajes, eventos, tareas y columnas
-- compatibles para perfil/notificaciones sin borrar datos existentes.

ALTER TABLE parent_student
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

UPDATE parent_student ps
SET tenant_id = s.tenant_id
FROM students s
WHERE ps.student_id = s.id
  AND ps.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_parent_student_tenant ON parent_student(tenant_id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low','normal','medium','high','urgent')),
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS related_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS action_url TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE notifications
SET message = COALESCE(message, body),
    is_read = COALESCE(is_read, read_at IS NOT NULL),
    metadata = COALESCE(NULLIF(metadata, '{}'::jsonb), data, '{}'::jsonb)
WHERE message IS NULL
   OR metadata = '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(related_student_id);

CREATE TABLE IF NOT EXISTS parent_conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject       VARCHAR(200) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','closed','archived')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_conversations_parent ON parent_conversations(parent_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_conversations_recipient ON parent_conversations(recipient_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_conversations_tenant ON parent_conversations(tenant_id);

ALTER TABLE parent_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_conversations_tenant_iso ON parent_conversations;
CREATE POLICY parent_conversations_tenant_iso ON parent_conversations
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS parent_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id     UUID NOT NULL REFERENCES parent_conversations(id) ON DELETE CASCADE,
    sender_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject             VARCHAR(200) NOT NULL,
    content             TEXT NOT NULL,
    priority            VARCHAR(20) NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','medium','high','urgent')),
    parent_message_id   UUID REFERENCES parent_messages(id) ON DELETE SET NULL,
    has_attachments     BOOLEAN NOT NULL DEFAULT false,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_messages_conversation ON parent_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_messages_user ON parent_messages(recipient_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_messages_tenant ON parent_messages(tenant_id);

ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_messages_tenant_iso ON parent_messages;
CREATE POLICY parent_messages_tenant_iso ON parent_messages
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS school_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    type          VARCHAR(50) NOT NULL DEFAULT 'event',
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    start_time    TIME,
    end_time      TIME,
    location      VARCHAR(255),
    is_all_day    BOOLEAN NOT NULL DEFAULT false,
    is_recurring  BOOLEAN NOT NULL DEFAULT false,
    student_id    UUID REFERENCES students(id) ON DELETE SET NULL,
    group_id      UUID REFERENCES groups(id) ON DELETE SET NULL,
    category      VARCHAR(50) NOT NULL DEFAULT 'school',
    priority      VARCHAR(20) NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','medium','high','urgent')),
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT school_events_dates_check CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_school_events_tenant_date ON school_events(tenant_id, start_date);
CREATE INDEX IF NOT EXISTS idx_school_events_student ON school_events(student_id);
CREATE INDEX IF NOT EXISTS idx_school_events_group ON school_events(group_id);

ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_events_tenant_iso ON school_events;
CREATE POLICY school_events_tenant_iso ON school_events
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS student_assignments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
    group_id      UUID REFERENCES groups(id) ON DELETE SET NULL,
    subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    type          VARCHAR(50) NOT NULL DEFAULT 'homework',
    due_date      DATE NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','submitted','graded','overdue','cancelled')),
    grade         NUMERIC(5,2),
    max_grade     NUMERIC(5,2) NOT NULL DEFAULT 100,
    priority      VARCHAR(20) NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','medium','high','urgent')),
    submitted_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_assignments_tenant ON student_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_assignments_student ON student_assignments(student_id, due_date);
CREATE INDEX IF NOT EXISTS idx_student_assignments_group ON student_assignments(group_id, due_date);

ALTER TABLE student_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_assignments_tenant_iso ON student_assignments;
CREATE POLICY student_assignments_tenant_iso ON student_assignments
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

DROP TRIGGER IF EXISTS update_parent_conversations_updated_at ON parent_conversations;
CREATE TRIGGER update_parent_conversations_updated_at
    BEFORE UPDATE ON parent_conversations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_school_events_updated_at ON school_events;
CREATE TRIGGER update_school_events_updated_at
    BEFORE UPDATE ON school_events
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_assignments_updated_at ON student_assignments;
CREATE TRIGGER update_student_assignments_updated_at
    BEFORE UPDATE ON student_assignments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
