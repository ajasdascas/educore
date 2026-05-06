# Manual Production Smoke Tests

Fecha: 06-05-2026  
Entorno objetivo: `https://onlineu.mx/educore/` con backend Railway y MySQL Hostinger.

## Preparacion

Antes de iniciar:

- Tener credenciales QA para `SUPER_ADMIN`.
- Tener al menos una escuela QA o crear una nueva durante el smoke.
- Tener emails QA para school admin, profesor, padre y estudiante.
- Confirmar si el modulo `payments` esta activo para la escuela.
- Confirmar si `backend/migrations_mysql/006_student_portal_user_id.sql` ya fue aplicado para portal STUDENT.
- Usar navegador en modo incognito o limpiar `localStorage` entre roles.

## 1. Login Super Admin

1. Abrir `https://onlineu.mx/educore/login/`.
2. Ingresar credenciales `SUPER_ADMIN`.
3. Confirmar redireccion a `/super-admin/dashboard`.
4. Abrir `/super-admin/schools`.

Aceptacion:

- Dashboard carga sin errores visuales.
- No hay pantalla sin CSS.
- El usuario ve opciones del Manager Maestro, no portal escolar.

## 2. Crear Escuela

1. Desde `/super-admin/schools`, abrir crear escuela.
2. Capturar nombre, slug unico, plan y nivel (`preescolar`, `kinder` o `primaria`).
3. Crear escuela.
4. Abrir detalle de la escuela.

Aceptacion:

- La escuela aparece en listado.
- Slug se conserva.
- Admin inicial queda disponible segun el flujo actual.
- No hay error 500.

## 3. Verificar Modulos Por Nivel

1. En detalle de escuela, revisar modulos activos.
2. Confirmar modulos core: `auth`, `users`, `academic_core`, `grading`.
3. Confirmar modulos del nivel.

Aceptacion:

- Preescolar/Kinder: asistencia, documentos, reportes y comunicaciones activos; calificaciones numericas no obligatorias.
- Primaria: `grades`/grading visible para calificaciones y boletas.
- Modulos desactivados no aparecen en navegacion o muestran bloqueo.

## 4. Entrar A School Admin En Modo Soporte

1. Desde detalle o `/super-admin/lab`, seleccionar escuela.
2. Entrar a un modulo `/school-admin/*` en soporte.
3. Confirmar banner de soporte.
4. Salir del modo soporte.

Aceptacion:

- SUPER_ADMIN no cambia de JWT.
- Sin escuela seleccionada, `/school-admin/*` no opera silenciosamente.
- Banner muestra contexto y permite salir.

## 5. Crear Profesor

1. Login como School Admin o soporte.
2. Abrir `/school-admin/teachers`.
3. Crear profesor con email QA.
4. Guardar y abrir detalle.

Aceptacion:

- Profesor aparece activo.
- Se crea usuario `TEACHER`.
- No duplica email dentro del tenant.

## 6. Crear Padre

1. Abrir `/school-admin/students`.
2. Crear o editar alumno.
3. Vincular padre/tutor con email QA.

Aceptacion:

- Padre queda vinculado al alumno.
- Usuario `PARENT` puede entrar al portal.
- Padre no ve alumnos no vinculados.

## 7. Crear Alumno

1. En `/school-admin/students`, crear alumno con datos completos.
2. Asignar grupo/nivel.
3. Guardar y abrir detalle.

Aceptacion:

- Matricula/enrollment queda visible.
- Alumno aparece en grupo correcto.
- No aparece en otra escuela.

## 8. Crear Acceso Teacher

1. Abrir `/login?slug=SLUG&role=teacher`.
2. Entrar con credenciales del profesor.
3. Confirmar `/teacher/dashboard`.

Aceptacion:

- Teacher ve clases, asistencia, calificaciones y mensajes.
- Teacher no abre `/school-admin/*`.

## 9. Crear Acceso Parent

1. Abrir `/login?slug=SLUG&role=parent`.
2. Entrar con credenciales del padre.
3. Confirmar `/parent/dashboard`.

Aceptacion:

- Parent ve solo hijos vinculados.
- Puede consultar asistencia, calificaciones, documentos, pagos y mensajes si aplican.
- Parent no abre `/school-admin/*`.

## 10. Crear Acceso Student

1. Confirmar que `students.user_id` existe en Hostinger.
2. Crear cuenta de portal del alumno desde School Admin.
3. Abrir `/login?slug=SLUG&role=student`.
4. Entrar con credenciales del alumno.

Aceptacion:

- Student llega a `/student/dashboard`.
- Ve solo sus calificaciones, asistencia y horario.
- Si falta `students.user_id`, registrar como bloqueo de migracion, no como bug de frontend.

## 11. Probar Role Mismatch

1. Abrir `/login?slug=SLUG&role=teacher`.
2. Intentar entrar con credenciales SCHOOL_ADMIN.
3. Repetir con PARENT en portal STUDENT si hay usuario.

Aceptacion:

- Backend responde 403 `ROLE_MISMATCH`.
- Frontend muestra mensaje claro.
- No se guarda token ni redirige al dashboard equivocado.

## 12. Probar Matricula

1. Crear alumno nuevo o editar uno existente.
2. Capturar datos personales, grupo y tutores.
3. Guardar y buscar por nombre/matricula.

Aceptacion:

- Alumno aparece en listado y detalle.
- Padres quedan vinculados.
- No se pierde el grupo.

## 13. Probar Asistencias

1. Abrir `/school-admin/attendance`.
2. Seleccionar grupo y fecha.
3. Marcar presentes/ausentes/retardos y guardar.
4. Revisar desde Parent o Student.

Aceptacion:

- Bulk save responde OK.
- Resumen se actualiza.
- Parent/Student ven solo su registro.

## 14. Probar Calificaciones

1. Abrir `/school-admin/grades`.
2. Seleccionar grupo y materia.
3. Capturar calificaciones.
4. Revisar desde Teacher, Parent y Student.

Aceptacion:

- Promedios son coherentes.
- Calificaciones se mantienen al recargar.
- Roles de consulta no pueden editar.

## 15. Probar Boletas PDF

1. Abrir `/school-admin/report-cards`.
2. Seleccionar alumno y periodo.
3. Generar boleta.
4. Descargar PDF.

Aceptacion:

- PDF incluye alumno, grupo, periodo, calificaciones y asistencia.
- No muestra datos de otro alumno.
- Archivo abre correctamente.

## 16. Probar Documentos

1. Abrir `/school-admin/documents`.
2. Subir documento pequeno de prueba.
3. Ver preview, marcar verificado y eliminar.
4. Consultar desde Parent si aplica.

Aceptacion:

- Documento queda ligado al alumno correcto.
- Preview funciona.
- Eliminacion es soft delete.

## 17. Probar Comunicaciones

1. Abrir `/school-admin/communications`.
2. Crear borrador por rol o grupo.
3. Enviar o programar.
4. Revisar listado/stats.

Aceptacion:

- No hay 500.
- Destinatarios son correctos.
- El mensaje no llega a tenants ajenos.

## 18. Probar Reportes

1. Abrir `/school-admin/reports`.
2. Generar reporte de asistencia o academico.
3. Abrir detalle y exportar.

Aceptacion:

- Reporte se genera con datos reales o vacio controlado.
- Export no rompe.
- Filtros funcionan.

## 19. Probar Pagos Si El Modulo Esta Activo

1. Confirmar modulo `payments` activo.
2. Abrir `/school-admin/payments`.
3. Crear cargo para alumno.
4. Registrar pago manual.
5. Abrir recibo.
6. Revisar `/parent/payments`.

Aceptacion:

- Cargos y pagos quedan en tenant correcto.
- Parent ve solo pagos propios.
- Si Stripe esta activo, monto sale del backend, no del frontend.

## Cierre Del Smoke

Registrar:

- Fecha y hora Mexico.
- Branch/commit desplegado.
- Escuela/slug usada.
- Roles probados.
- Modulos activos.
- Fallos con captura, ruta, usuario y accion.
