-- EduCore Hostinger MySQL bridge reset
-- Use only on the temporary bridge database before reimporting 001_hostinger_core.sql.
-- This intentionally drops EduCore bridge tables. Do not run against a database with real data.

SET FOREIGN_KEY_CHECKS = 0;

DROP TRIGGER IF EXISTS trg_users_global_key_bi;
DROP TRIGGER IF EXISTS trg_users_global_key_bu;

DROP TABLE IF EXISTS payment_audit_logs;
DROP TABLE IF EXISTS payment_attachments;
DROP TABLE IF EXISTS payment_receipts;
DROP TABLE IF EXISTS student_payments;
DROP TABLE IF EXISTS parent_teacher_audit_logs;
DROP TABLE IF EXISTS module_health_events;
DROP TABLE IF EXISTS system_deploy_events;
DROP TABLE IF EXISTS system_versions;
DROP TABLE IF EXISTS backup_jobs;
DROP TABLE IF EXISTS feature_flag_scopes;
DROP TABLE IF EXISTS feature_flags;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS module_usage_snapshots;
DROP TABLE IF EXISTS storage_usage_snapshots;
DROP TABLE IF EXISTS manual_payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS tenant_database_operation_logs;
DROP TABLE IF EXISTS tenant_custom_rows;
DROP TABLE IF EXISTS tenant_custom_tables;
DROP TABLE IF EXISTS tenant_custom_fields;
DROP TABLE IF EXISTS database_admin_operation_logs;
DROP TABLE IF EXISTS database_admin_table_states;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS report_templates;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS message_attachments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS parent_consents;
DROP TABLE IF EXISTS student_assignments;
DROP TABLE IF EXISTS school_events;
DROP TABLE IF EXISTS parent_messages;
DROP TABLE IF EXISTS parent_conversations;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS school_documents;
DROP TABLE IF EXISTS grade_records;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS import_batches;
DROP TABLE IF EXISTS student_academic_history;
DROP TABLE IF EXISTS parent_student;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS class_schedule_blocks;
DROP TABLE IF EXISTS teacher_profiles;
DROP TABLE IF EXISTS group_subjects;
DROP TABLE IF EXISTS group_teachers;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS grade_levels;
DROP TABLE IF EXISTS school_years;
DROP TABLE IF EXISTS school_settings;
DROP TABLE IF EXISTS tenant_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenant_modules;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS educational_levels_catalog;
DROP TABLE IF EXISTS modules_catalog;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS tenants;

SET FOREIGN_KEY_CHECKS = 1;
