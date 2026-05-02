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
DROP TABLE IF EXISTS school_documents;
DROP TABLE IF EXISTS grade_records;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS parent_student;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS grade_levels;
DROP TABLE IF EXISTS school_years;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenant_modules;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS educational_levels_catalog;
DROP TABLE IF EXISTS modules_catalog;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS audit_logs;

SET FOREIGN_KEY_CHECKS = 1;
