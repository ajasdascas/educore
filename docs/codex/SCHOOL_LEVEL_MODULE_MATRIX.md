# School Level Module Matrix

Fecha: 06-05-2026  
Objetivo: comparar modulos esperados por nivel escolar y separar modulos comunes, opcionales, administrativos y financieros.

## Estado Actual De Producto

Los niveles activos detectados en el repo son `preescolar`, `kinder` y `primaria`.  
`Bebes / guarderia` se documenta como matriz QA objetivo/producto porque Giovanni lo solicito para planeacion, aunque no este activo en `ACTIVE_EDUCATION_LEVELS`.

## Matriz Comparativa Principal

| Modulo / Capacidad | Bebes / guarderia | Preescolar | Kinder | Primaria |
|---|---|---|---|---|
| Daily logs | Requerido | Opcional | Opcional | No aplica |
| Comidas | Requerido | Opcional | Opcional | No aplica |
| Siestas | Requerido | Opcional | No aplica | No aplica |
| Panales | Requerido | No aplica | No aplica | No aplica |
| Salud | Requerido | Requerido | Requerido | Opcional |
| Incidentes | Requerido | Requerido | Requerido | Requerido |
| Autorizados a recoger | Requerido | Requerido | Requerido | Requerido |
| Evidencias/fotos | Requerido | Requerido | Requerido | Opcional |
| Comunicacion familiar | Requerido | Requerido | Requerido | Requerido |
| Asistencia | Requerido | Requerido | Requerido | Requerido |
| Observaciones | Requerido | Requerido | Requerido | Opcional |
| Desarrollo socioemocional | Requerido | Requerido | Requerido | Opcional |
| Actividades | Requerido | Requerido | Requerido | Opcional |
| Boleta cualitativa | No aplica | Requerido | Requerido | Opcional |
| Areas de desarrollo | Opcional | Requerido | Requerido | No aplica |
| Evaluacion cualitativa | Opcional | Requerido | Requerido | Opcional |
| Observaciones docentes | Requerido | Requerido | Requerido | Requerido |
| Reportes a padres | Requerido | Requerido | Requerido | Requerido |
| Materias | No aplica | Opcional | Opcional | Requerido |
| Tareas | No aplica | Opcional | Opcional | Requerido |
| Examenes | No aplica | No aplica | Opcional | Requerido |
| Calificaciones numericas | No aplica | No aplica | Opcional | Requerido |
| Promedios | No aplica | No aplica | Opcional | Requerido |
| Boletas academicas | No aplica | Opcional cualitativo | Opcional cualitativo | Requerido |

## Modulos Comunes

Estos deben existir en cualquier escuela activa:

| Modulo | Alcance QA |
|---|---|
| Auth + RBAC | Login, logout, role mismatch, rutas protegidas |
| Tenant isolation | Todas las queries y pantallas filtran por tenant real |
| Usuarios | SCHOOL_ADMIN, TEACHER, PARENT y STUDENT segun aplique |
| Alumnos | Matricula, expediente base, estado activo/inactivo |
| Grupos | Asignacion de alumnos y profesores |
| Horarios | Bloques por grupo/profesor/materia o actividad |
| Asistencia | Registro diario o por clase segun configuracion |
| Documentos | Expediente digital/fisico y evidencias |
| Reportes | Resumen operativo y academico |
| Comunicaciones | Mensajes por rol, grupo o familia |
| Portales | School Admin, Teacher, Parent y Student cuando haya usuarios |

## Modulos Por Nivel

| Nivel | Modulos por nivel esperados | Validacion QA |
|---|---|---|
| Bebes / guarderia | daily logs, comidas, siestas, panales, salud, incidentes, autorizados, evidencias, comunicacion | No mostrar calificaciones numericas; flujo centrado en cuidado diario |
| Preescolar | asistencia, observaciones, desarrollo socioemocional, actividades, evidencias, boleta cualitativa | Evaluacion cualitativa y reportes a padres sin promedios numericos obligatorios |
| Kinder | asistencia, areas de desarrollo, evaluacion cualitativa, observaciones docentes, actividades, reportes a padres | Validar areas de desarrollo y evidencia docente |
| Primaria | materias, tareas, examenes, calificaciones numericas, promedios, boletas academicas, asistencia, reportes | Validar captura numerica, promedio y PDF de boleta |

## Modulos Opcionales

| Modulo | Cuando activarlo | QA requerido |
|---|---|---|
| Pagos | Plan premium/enterprise o escuela con cobranza activa | UI visible solo con modulo, backend protege con `RequireModule("payments")` |
| Report cards | Escuelas que emiten boletas desde EduCore | PDF descarga, datos correctos y periodo correcto |
| Documentos avanzados | Escuelas con expediente digital | Upload, preview, verificacion y limite de tamano |
| Comunicaciones avanzadas | Escuelas con comunicacion masiva | Destinatarios por rol/grupo, programacion y estados |
| Analytics | Plan con reportes ejecutivos | Datos agregados sin exponer otro tenant |
| QR access / credenciales | Enterprise futuro | No debe aparecer como funcional si no esta listo |

## Modulos Administrativos

| Modulo | Rol principal | Restriccion |
|---|---|---|
| Super Admin schools | SUPER_ADMIN | Solo plataforma global |
| Planes y billing SaaS | SUPER_ADMIN | No visible para School Admin |
| Feature flags / modules catalog | SUPER_ADMIN | Cambios auditados |
| Database admin global | SUPER_ADMIN | No exponer secretos ni tablas sensibles sin control |
| School settings | SCHOOL_ADMIN | Solo tenant propio |
| School database explorer | SCHOOL_ADMIN | Solo tablas y filas permitidas del tenant |
| Audit logs | SUPER_ADMIN y vistas acotadas | Sin datos sensibles innecesarios |

## Modulos Financieros

| Modulo | Alcance | QA |
|---|---|---|
| Billing SaaS | Cobranza de EduCore a escuelas | SUPER_ADMIN solamente, invoices y pagos manuales |
| Pagos escolares | Cargos de alumnos/familias | SCHOOL_ADMIN crea cargos, PARENT consulta/paga |
| Recibos | Comprobante de pago | Folio, monto, alumno, fecha y metodo correctos |
| Stripe checkout | Si `EDUCORE_STRIPE_ENABLED` y `STRIPE_SECRET_KEY` estan activos | Monto calculado en backend; frontend nunca manda monto libre |
| Export financiero | CSV/Excel o reporte | Solo datos del tenant y rango seleccionado |

## Criterios De Aceptacion Por Nivel

| Nivel | Aceptacion |
|---|---|
| Bebes / guarderia | La planeacion QA queda lista; no se debe marcar como produccion activa hasta que exista soporte en catalogo y UI |
| Preescolar | Crear escuela activa con modulos esperados, registrar alumnos, asistencia, observaciones/evidencias y reporte cualitativo |
| Kinder | Igual a preescolar, con areas de desarrollo y reportes a padres claros |
| Primaria | Crear escuela activa, materias, grupos, tareas/examenes si estan disponibles, calificaciones numericas, promedio y boleta PDF |
