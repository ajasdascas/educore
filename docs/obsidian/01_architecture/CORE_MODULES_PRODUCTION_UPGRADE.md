# EduCore Core Modules Production Upgrade

**Fecha:** 29-04-2026  
**Zona horaria:** America/Mexico_City  
**Estado:** Activo  

## Regla principal

EduCore se concentra solo en 4 modulos Core hasta que esten 100% completos, integrados y listos para produccion:

1. **AUTH + TENANT + RBAC**
2. **USERS**
3. **ACADEMIC CORE**
4. **GRADING SYSTEM**

No se deben crear modulos tenant-facing adicionales hasta cerrar estos 4. Billing y Database Admin viven dentro del **SuperAdmin Control Plane** como herramientas internas de operacion SaaS, no como modulos contratables por escuelas.

## Database Schema

### Control Plane

- `database_admin_table_states`: metadata para ocultar/soft-delete tablas desde SuperAdmin sin ejecutar `DROP TABLE`.
- `database_admin_operation_logs`: bitacora especializada de operaciones de Database Admin; las acciones criticas tambien se registran en `audit_logs`.
- `subscriptions`, `invoices`, `manual_payments`: cobranza interna de instituciones desde SuperAdmin.

### Academic Core

- `school_years`: ciclos escolares actuales y anteriores.
- `students`: expediente real con `first_name`, `paternal_last_name`, `maternal_last_name`, fecha separada por dia/mes/ano, CURP opcional, genero, direccion y telefono segun migraciones actuales/extendidas.
- `parent_student`: relacion padre/tutor con alumno.
- `student_academic_history`: historial por ciclo con grupo, calificaciones, asistencia y observaciones.
- `groups`, `subjects`, `group_students`, `group_teachers`, `class_schedule_blocks`: estructura academica por ciclo, grupo, materia y profesor.
- `attendance_records`, `grade_records`: fuente de verdad para asistencia y calificaciones.

## Services And API Endpoints

### SuperAdmin Database Admin

- `GET /api/v1/super-admin/database/tables`: lista tablas publicas, conteo estimado, estado oculto y proteccion.
- `GET /api/v1/super-admin/database/tables/:table/schema`: columnas, tipos, constraints y relaciones.
- `GET /api/v1/super-admin/database/tables/:table/rows`: filas paginadas para inspeccion.
- `POST /api/v1/super-admin/database/tables/:table/rows`: insercion auditada en tablas no protegidas.
- `PUT /api/v1/super-admin/database/tables/:table/rows/:id`: edicion auditada de columnas permitidas.
- `DELETE /api/v1/super-admin/database/tables/:table/rows/:id`: soft delete si existe `deleted_at` o `is_active`.
- `POST /api/v1/super-admin/database/tables`: crear tabla solo con `EDUCORE_ENABLE_DB_ADMIN_DDL=true`.
- `PUT /api/v1/super-admin/database/tables/:table/structure`: add/drop/rename/change type solo con flag DDL.
- `PATCH /api/v1/super-admin/database/tables/:table/soft-delete`: oculta tabla en metadata; no borra fisicamente.
- `GET /api/v1/super-admin/database/export/full`: snapshot JSON listo para Excel, una hoja por tabla.
- `GET /api/v1/super-admin/database/export/tables/:tables`: snapshot de tablas seleccionadas.
- `POST /api/v1/super-admin/database/import/validate`: validacion previa; el commit real debe ir al endpoint del modulo dueno.

### SuperAdmin Billing And Collection

- `GET /api/v1/super-admin/billing/subscriptions`: estado de suscripcion por institucion.
- `GET /api/v1/super-admin/billing/invoices`: invoices, pendientes, pagados e historial.
- `POST /api/v1/super-admin/billing/invoices/generate`: genera invoice mensual para una escuela.
- `POST /api/v1/super-admin/billing/invoices/:id/mark-paid`: marca invoice como pagado con auditoria.
- `POST /api/v1/super-admin/billing/payments/manual`: registra pago manual.
- `POST /api/v1/super-admin/billing/reminders`: encola recordatorios de cobranza.
- `GET /api/v1/super-admin/billing/reports/monthly`: reporte mensual descargable.

### Excel Import/Export

- Export en frontend usa `xlsx`: cada tabla se convierte en una hoja, conserva IDs y encabezados.
- Import en frontend lee `.xlsx/.xls/.csv`, detecta columnas, muestra preview y manda validacion.
- Bulk student import sigue siendo el flujo canonico para alumnos: `/api/v1/school-admin/academic/imports/students/commit`.
- Import historico debe mapear ciclo escolar, grupo, observaciones, asistencia y calificaciones antes del commit.

## Validation And Safety

- Tablas protegidas: `audit_logs`, `sessions`, refresh/reset tokens, metadata de Database Admin y migraciones.
- `tenant_id`, `id`, `created_at`, `updated_at` no se editan inline desde Database Admin.
- DDL real esta apagado por defecto; requiere `EDUCORE_ENABLE_DB_ADMIN_DDL=true`.
- Toda accion de escritura se audita con `database.row.*`, `database.table.*` o `database.export`.
- Soft delete es preferido; si una tabla no tiene `deleted_at` ni `is_active`, se rechaza eliminacion.
- Importaciones masivas siempre siguen: map columns -> preview -> validate -> commit with audit.

## UI Components Structure

- `frontend/app/super-admin/database/page.tsx`: panel operativo para tablas, schema, rows, Excel export e import preview.
- `frontend/app/super-admin/billing/page.tsx`: cobranza de instituciones, invoices, pagos, recordatorios y reportes Excel.
- `frontend/app/school-admin/students/page.tsx`: expediente real, padres vinculados e import Excel de alumnos.
- `frontend/app/school-admin/academic/page.tsx`: ciclos, materias, grupos y asignaciones.
- `frontend/app/school-admin/grades/page.tsx`: calificaciones numericas, cualitativas y periodos.

#architecture #security #backend #frontend #super_admin #database #billing
