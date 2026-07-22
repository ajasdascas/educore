# Auditoria de preparacion para produccion de EduCore

**Fecha de corte:** 2026-07-21

**Repositorio:** `educore-master`

**Commit base inspeccionado:** `6d139fc` (`codex/production-readiness-audit`)
**Objetivo:** determinar, con evidencia reproducible, si la creacion de escuelas, sus subdominios, los modulos seleccionados, los usuarios globales y los portales por rol estan listos para operacion real.

> Esta auditoria no certifica el estado desplegado. El arbol de trabajo contiene cambios posteriores al commit base y no existe evidencia en este corte de una corrida exitosa completa en produccion. Una interfaz visible, un build exitoso o un registro guardado no equivalen por si solos a una capacidad lista para produccion.

## 1. Resultado ejecutivo

### Dictamen

**NO-GO para liberar la promesa “todos los modulos funcionan y estan listos para produccion”.**

El repositorio contiene un nucleo escolar util y persistente, pero todavia no existe evidencia suficiente para clasificar un modulo completo como `LISTO` bajo el criterio estricto de esta auditoria. Los nueve modulos que el codigo llama `production_ready` son **candidatos parciales** y deben pasar migraciones, pruebas de integracion y humo en el entorno publicado. El resto debe permanecer desactivado mediante el readiness gate.

Bloqueos de liberacion mas importantes:

1. La creacion de una escuela guarda primero la escuela y despues intenta aprovisionar el subdominio individual mediante la API de Hostinger. Faltan credenciales y evidencia de una ejecucion real que confirme DNS, TLS, directorio correcto y carga de assets con `basePath=/educore`.
2. El wildcard observado no resolvia (`NXDOMAIN`) y Hostinger shared hosting no sirve la exportacion actual desde la raiz de un wildcard. El flujo valido en este repositorio es crear **un subdominio individual por escuela**, no depender de `*.onlineu.mx`.
3. Existen rutas de Super Admin capaces de reactivar modulos bloqueados sin aplicar el mismo readiness gate usado por el endpoint legado.
4. Las consultas principales de profesor y alumno usan funciones exclusivas de MySQL (`DATE_FORMAT`, `TIME_FORMAT`, `FIELD`) aunque el entorno documentado de produccion usa PostgreSQL/Neon.
5. Comunicaciones no entrega email, SMS ni push; reportes no genera realmente PDF/XLSX; documentos no usa almacenamiento de objetos; pagos no tiene webhook de conciliacion; restauracion de backups y despliegue/rollback solo registran solicitudes.
6. La recuperacion de contrasena crea un token, pero no envia el enlace por correo.
7. El build de Next.js ignora errores de TypeScript y lint, por lo que no puede usarse como unico control de calidad.
8. En la version publicada observada, los tres puntos de Usuarios Globales no hacian nada. Hay una implementacion candidata en el arbol actual, pero falta probarla, desplegarla y verificarla en vivo.

### Alcance candidato de una primera liberacion controlada

Solo puede considerarse para una liberacion limitada, despues de cumplir todos los criterios de la seccion 12:

- autenticacion basica y RBAC, excluyendo recuperacion por correo;
- usuarios escolares;
- nucleo academico;
- alumnos;
- grupos;
- calificaciones;
- horarios;
- asistencias.

Esto no autoriza a vender ni habilitar portales, comunicaciones, reportes, documentos, pagos u otros modulos bloqueados.

## 2. Definicion de estados

| Estado | Significado obligatorio |
|---|---|
| `LISTO` | Flujo completo, datos reales persistidos, aislamiento por escuela, autorizacion por rol, manejo de errores, pruebas automatizadas relevantes, integraciones externas operativas, observabilidad, rollback y humo exitoso en produccion. |
| `PARCIAL` | Existe una porcion funcional o persistente, pero falta al menos una evidencia o capacidad obligatoria para produccion. No debe anunciarse como terminado. |
| `BLOQUEADO` | Hay un defecto conocido, un no-op, una incompatibilidad, una dependencia externa ausente o una brecha de seguridad que impide liberarlo. Debe permanecer oculto/desactivado. |

## 3. Linea base observada y arquitectura real

### Linea base visible aportada

- La instancia publicada usa `https://onlineu.mx/educore/`.
- `kinder-prueba.onlineu.mx` aparecia como subdominio experimental y no estaba activo en DNS; la evidencia previa fue `NXDOMAIN`/wildcard ausente.
- Hostinger no estaba conectado nativamente con GitHub. El repositorio contiene un despliegue alterno por GitHub Actions y FTP/FTPS/SFTP, pero eso requiere secretos y una corrida exitosa comprobable.
- En Usuarios Globales, el boton de tres puntos visible en produccion no ejecutaba acciones.
- La pantalla publicada advertia que el wildcard y el `basePath /educore` no daban una aplicacion funcional desde la raiz del subdominio.

### Topologia implementada

| Capa | Estado observado | Evidencia |
|---|---|---|
| Frontend | Exportacion estatica de Next.js con `basePath=/educore`, destinada a Hostinger. | `frontend/next.config.mjs`, `frontend/htaccess-subdomain-app-root` |
| Backend | API Go; la documentacion del proyecto situa produccion en Render. | `backend/cmd/server/main.go`, `.env.example`, documentacion de despliegue |
| Base de datos | PostgreSQL/Neon es el objetivo de produccion documentado. | `scripts/schema_postgres_consolidated.sql`, `.env.example` |
| Despliegue web | Workflow separado hacia Hostinger; no depende de la integracion nativa de Hostinger con GitHub. | `.github/workflows/deploy-frontend-hostinger.yml` |
| Dominios escolares | Provision individual mediante API de Hostinger despues de crear la escuela. | `backend/internal/pkg/schooldomain/hostinger.go`, `.github/workflows/provision-domains.yml` |
| Directorio esperado | La aplicacion central se despliega bajo `/educore/`; cada subdominio debe apuntar al directorio correcto de esa exportacion. | configuracion de despliegue y reglas `.htaccess` |

Para la cuenta Hostinger indicada, el directorio comunicado es:

```text
/home/u550473909/domains/onlineu.mx/public_html
```

La implementacion debe resolver de forma explicita si el document root del subdominio apunta a `public_html/educore` o si se crea una regla equivalente. No debe asumirse que apuntar solo a `public_html` funcionara.

## 4. Flujo de creacion de escuela y subdominio

### Lo que existe

1. El backend crea el tenant, su administrador inicial, roles, configuracion academica y modulos permitidos dentro de una transaccion.
2. Despues del commit intenta `ProvisionSchoolDomain` con el slug de la escuela.
3. El proveedor Hostinger puede registrar estado como no configurado, pendiente, listo o error, y permite reintento administrativo.
4. Hay pruebas unitarias/estaticas del cliente y scripts de comprobacion.

### Por que sigue `BLOQUEADO`

- No existe evidencia en este corte de una llamada exitosa con `HOSTINGER_API_TOKEN` real.
- No se comprobo que `slug.onlineu.mx` resuelva, emita certificado TLS valido y entregue la misma aplicacion sin assets 404.
- La operacion no es atomica: la escuela puede quedar creada aunque falle el proveedor DNS/hosting. Es necesario un estado recuperable y visible, reintento idempotente y alerta operacional.
- El slug debe impedir colisiones, nombres reservados, caracteres invalidos y apropiacion de un dominio de otra escuela.
- Una escuela no puede marcarse “lista” hasta comprobar aislamiento de tenant en todas las rutas de sus roles.

### Contrato obligatorio

`POST crear escuela -> tenant confirmado -> job de dominio idempotente -> DNS -> TLS -> HTTP 200 -> assets 200 -> logins por rol -> estado READY`.

Si cualquier paso falla, la escuela debe quedar `DOMAIN_PENDING` o `DOMAIN_FAILED`, no “Activa/operativa”, con un reintento seguro y auditado. La API nunca debe devolver ni registrar el token de Hostinger.

## 5. Matriz exhaustiva del catalogo modular

El gate SQL declara como candidatos solo `auth`, `users`, `academic_core`, `grading`, `students`, `groups`, `grades`, `schedules` y `attendance`. Evidencia principal: `frontend/lib/modules/registry.ts` y `backend/migrations/020_production_module_readiness_gate.sql`.

| Clave | Estado | Funcionalidad encontrada | Motivo / requisito de produccion |
|---|---|---|---|
| `auth` | `PARCIAL` | Login, JWT/RBAC, cambio de contrasena y token de recuperacion. | El reset no envia correo (`TODO` de proveedor). Agregar envio, expiracion/uso unico probado, rate limit, revocacion y E2E. |
| `users` | `PARCIAL` | CRUD y roles escolares con persistencia y alcance tenant. | Completar pruebas de permisos negativos, concurrencia, baja/reactivacion e identidad unica; humo publicado. |
| `academic_core` | `PARCIAL` | Ciclos, materias y estructura academica persistente. | El grupo `/academic` general esta vacio; validar todas las variantes por nivel y migraciones reales. |
| `grading` | `PARCIAL` | Escalas, captura y calculos de calificacion. | Requiere pruebas de reglas, redondeo, periodos cerrados, permisos y datos de produccion. |
| `students` | `PARCIAL` | CRUD/importacion y vinculacion inicial de acceso. | Probar importacion atomica, duplicados, ciclo de baja, privacidad y aislamiento. |
| `groups` | `PARCIAL` | CRUD y relaciones escuela-profesor-alumno. | Probar restricciones, cambios de ciclo, asignaciones masivas e aislamiento. |
| `grades` | `PARCIAL` | Captura masiva, finales e historial/boleta de datos. | No confundir con exportacion PDF de boletas, que esta bloqueada; falta E2E de cierre y auditoria. |
| `schedules` | `PARCIAL` | CRUD de horarios y modulo seleccionable. | Probar colisiones, zonas horarias, calendario, permisos y seleccion/desactivacion real. |
| `attendance` | `PARCIAL` | Pase masivo, historial y resumen mensual. | Probar idempotencia, correcciones auditadas, fechas/zonas horarias y carga real. |
| `documents` | `BLOQUEADO` | CRUD de metadatos; el frontend convierte archivos a Data URL. | No hay almacenamiento de objetos, antivirus, URLs firmadas, limites ni retencion. No guardar archivos reales como base64 en la BD. |
| `report_cards` | `BLOQUEADO` | Datos de boleta y registro de supuesto documento. | `PersistAsDocument` crea metadatos `.pdf` sin archivo PDF/blob/URL real. Generar, almacenar, firmar y descargar el PDF real. |
| `reports` | `BLOQUEADO` | Historial persistente y serializacion JSON/CSV parcial. | PDF/XLSX terminan como CSV; filtros/errores son incompletos y hay datos sinteticos. Corregir calculos y exportadores; agregar pruebas de exactitud. |
| `communications` | `BLOQUEADO` | CRUD de comunicados escolares y marca `sent`. | No resuelve destinatarios ni entrega email/SMS/push; programar solo guarda fecha. Implementar outbox, workers, proveedor, reintentos y estados por destinatario. |
| `communication` | `BLOQUEADO` | Alias historico del anterior. | Mismo bloqueo; unificar clave y migrar datos para evitar autorizacion inconsistente. |
| `payments` | `BLOQUEADO` | Cargos/pagos manuales; creacion opcional de sesion Stripe. | No existe webhook Stripe ni conciliacion/firma/idempotencia. Completar lifecycle, reembolsos y auditoria antes de dinero real. |
| `payments_basic` | `BLOQUEADO` | Clave historica. | No tiene contrato completo independiente; consolidar con `payments` y mantener desactivado. |
| `parent_portal` | `BLOQUEADO` | Consultas de hijos, mensajes, consentimientos y cuenta parcialmente persistentes. | Gate desactivado, sin E2E y dependiente de documentos/pagos/comunicaciones bloqueados. Probar acceso padre-hijo y minimizar datos. |
| `teacher_portal` | `BLOQUEADO` | Clases, asistencia, calificaciones y mensajes. | Repositorio usa SQL MySQL incompatible con PostgreSQL. Reescribir consultas y probar contra PostgreSQL real. |
| `analytics` | `BLOQUEADO` | Agregados de Super Admin y algunos indicadores. | Como modulo tenant esta bloqueado; definir metricas reales, exactitud, ventanas de tiempo y autorizacion antes de habilitarlo. |
| `database_admin` | `BLOQUEADO` | Explorador/CRUD tecnico disponible. | El acceso escolar aparece sin `RequireModule`; alto riesgo de exposicion. Aplicar gate, allowlist estricta, solo lectura por defecto y pruebas de seguridad. |
| `qr_access` | `BLOQUEADO` | Clave/catalogo historico. | Sin flujo completo, persistencia, autorizacion, revocacion ni pruebas. |
| `credentials` | `BLOQUEADO` | Clave/catalogo historico. | Sin emision/verificacion/revocacion completa ni pruebas. |
| `workshops` | `BLOQUEADO` | Clave/catalogo historico. | Sin contrato completo de rutas, persistencia, permisos y pruebas. |
| `portal_school_admin` | `BLOQUEADO` | Existe dashboard interno de administrador. | La clave modular esta bloqueada y no tiene contrato independiente; separar navegacion de habilitacion comercial y probar E2E. |
| `portal_parents` | `BLOQUEADO` | Alias historico de portal de padres. | Gate bloqueado; consolidar con `parent_portal` y completar sus requisitos. |
| `portal_teachers` | `BLOQUEADO` | Alias historico de portal docente. | Gate bloqueado e incompatibilidad SQL. |
| `portal_students` | `BLOQUEADO` | Portal alumno y vinculacion `students.user_id`. | Consultas usan SQL MySQL y silencian algunos errores como listas vacias; corregir y probar en PostgreSQL. |
| `daily_logs` | `BLOQUEADO` | Clave por nivel infantil. | Sin contrato completo de CRUD, permisos, auditoria y pruebas. |
| `meals` | `BLOQUEADO` | Clave por nivel infantil. | Sin flujo completo y probado de datos reales. |
| `naps` | `BLOQUEADO` | Clave por nivel infantil. | Sin flujo completo y probado de datos reales. |
| `diapers` | `BLOQUEADO` | Clave por nivel infantil. | Sin flujo completo y probado de datos reales. |
| `mood` | `BLOQUEADO` | Clave por nivel infantil. | Sin flujo completo y probado de datos reales. |
| `health_checks` | `BLOQUEADO` | Clave por nivel infantil. | Datos sensibles de salud sin contrato completo, controles, consentimiento ni pruebas. |
| `incidents` | `BLOQUEADO` | Clave por nivel. | Sin workflow completo, notificacion, acuse, auditoria y pruebas. |
| `pickup_authorizations` | `BLOQUEADO` | Clave por nivel. | Funcion de seguridad fisica sin verificacion de identidad, vigencia, revocacion ni pruebas. |
| `milestones` | `BLOQUEADO` | Clave por nivel infantil. | Sin contrato completo y probado. |
| `photos_evidence` | `BLOQUEADO` | Clave por nivel. | Falta storage, consentimiento, privacidad, retencion, moderacion y acceso firmado. |
| `qualitative_assessments` | `BLOQUEADO` | Clave por nivel. | Sin modelo/flujo completo ni pruebas. |
| `development_areas` | `BLOQUEADO` | Clave por nivel. | Sin modelo/flujo completo ni pruebas. |
| `observations` | `BLOQUEADO` | Clave por nivel. | Sin modelo/flujo completo ni pruebas. |
| `activities` | `BLOQUEADO` | Clave por nivel. | Sin modelo/flujo completo ni pruebas. |
| `behavior_notes` | `BLOQUEADO` | Clave por nivel. | Datos sensibles sin contrato, privacidad, auditoria y pruebas. |
| `preschool_report_cards` | `BLOQUEADO` | Clave por nivel. | Depende de generacion real de boleta/documento, actualmente ausente. |
| `subjects` | `BLOQUEADO` | El CRUD de materias existe dentro de `academic_core`. | La clave modular separada esta bloqueada; no habilitarla/venderla hasta tener gate, dependencia y pruebas propios. |
| `assignments` | `BLOQUEADO` | Clave academica futura. | Sin entrega/calificacion/archivos/notificaciones completos y probados. |
| `exams` | `BLOQUEADO` | Clave academica futura. | Sin banco, aplicacion, seguridad, calificacion y pruebas completas. |

**Regla:** la seleccion de una escuela debe ser la interseccion de catalogo activo, plan, nivel educativo y allowlist de produccion. Una fila bloqueada nunca debe aparecer como seleccionable ni reactivarse por otra API.

## 6. Matriz de Super Admin

| Pantalla/ruta | Estado | Evidencia funcional | Brecha obligatoria |
|---|---|---|---|
| Dashboard | `PARCIAL` | Agregados de BD en `/dashboard/overview`. | Validar exactitud, errores de dependencias y humo publicado. |
| Modulos | `BLOQUEADO` | Catalogo y asignacion persistentes. | `PUT /modules`, `PATCH /modules/:key/global` y `PATCH /schools/:id/modules/:key` pueden omitir el gate aplicado al toggle legado. Centralizar la politica y probar todos los endpoints. |
| Billing | `BLOQUEADO` | Suscripciones, facturas y pagos manuales persistentes. | Sin procesador/conciliacion completa; recordatorios solo se registran/encolan. |
| Analytics | `PARCIAL` | Consultas agregadas reales. | Definir calidad de datos, autorizacion, periodos y pruebas de calculo. |
| Health Monitor | `PARCIAL` | Lee eventos de salud. | Parte del estado se reporta como `operational`/DB OK sin ping real. Agregar probes y alertas. |
| Database Admin | `PARCIAL` | CRUD/import/export administrativo. | Alto riesgo; faltan pruebas negativas, limites, auditoria completa, backup previo y allowlists estrictas. |
| Auditoria | `PARCIAL` | Consulta logs persistidos. | Garantizar cobertura de todas las mutaciones sensibles, inmutabilidad, retencion y exportacion. |
| Soporte | `PARCIAL` | CRUD de tickets persistente. | Completar SLA, asignacion, notificaciones y pruebas del contexto de soporte. |
| Storage | `BLOQUEADO` | Muestra snapshots/cuota. | Archivar solo registra `job_registered_only`; no existe proveedor real de objetos/archivo. |
| Feature Flags | `PARCIAL` | CRUD persistente. | Demostrar consumo consistente en backend/frontend, cache/invalidation y auditoria. |
| Backups | `BLOQUEADO` | Puede iniciar `pg_dump` y registrar estado. | Restore solo queda `restore_requested`; falta storage durable, cifrado, prueba periodica y restauracion real. |
| Versioning | `BLOQUEADO` | Historial/eventos persistentes. | Deploy y rollback solo quedan en cola; no hay ejecutor ni verificacion/rollback real. |
| Planes | `PARCIAL` | CRUD de planes y paquetes. | Validar que ningun plan incluya claves bloqueadas y cerrar los endpoints alternos de activacion. |
| Escuelas | `BLOQUEADO` | Transaccion de tenant/admin/configuracion; intento de dominio posterior. | Subdominio no probado en vivo y modulos no son seguros mientras exista bypass del gate. |
| Usuarios Globales | `PARCIAL` | Implementacion candidata de menu, filtros, alta/edicion, roles/permisos, estado y reset; backend persiste y audita. | La version publicada observada tenia tres puntos no-op. Ejecutar pruebas, revisar RBAC/tenant, desplegar y verificar en vivo. |
| Configuracion | `PARCIAL` | Ajustes de plataforma persistentes. | No presentar Stripe/Twilio/SendGrid como activos sin proveedores y smoke real; proteger secretos. |
| Notificaciones | `PARCIAL` | Vista/estado basico persistente. | Falta modelo robusto por destinatario y entrega externa. |
| Seguridad | `PARCIAL` | Revocacion de sesiones y ajustes. | Completar MFA, rate limits, eventos, pruebas de sesion y respuesta a incidentes si son parte de la oferta. |
| Perfil | `PARCIAL` | Edicion de nombre persistente. | Pruebas de validacion, concurrencia y auditoria. |
| Laboratorio | `PARCIAL` | Diagnostico y resolucion de escuela/contexto. | Debe ser solo soporte autorizado; probar que no cambia tenant ni eleva privilegios. |

### Usuarios Globales: contrato solicitado

La tabla debe mostrar y filtrar **todos** los usuarios autorizados, no solo Super Admin:

- filtro por escuela, rol, estado y busqueda por nombre/email;
- roles soportados: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `PARENT`, `STUDENT`;
- alta manual con escuela obligatoria para roles tenant y sin escuela para Super Admin;
- edicion de datos, rol, escuela, estado y permisos dentro de una allowlist;
- reset de contrasena seguro, sin mostrar contrasenas existentes;
- impedir que un operador se quite su ultimo acceso Super Admin o elimine el ultimo Super Admin activo;
- toda mutacion con actor, objetivo, escuela, antes/despues, fecha e IP en auditoria;
- paginacion y filtros en servidor, aislamiento tenant y pruebas 403 para cada rol no autorizado.

La implementacion candidata esta en `frontend/app/super-admin/users/page.tsx` y `backend/internal/modules/super_admin/global_users.go`. No se promueve a `LISTO` hasta validar el flujo publicado.

Las migraciones candidatas `backend/migrations/021_global_user_management_rbac.sql` y `backend/migrations_mysql/012_global_user_management_rbac.sql` agregan unicidad para `students.user_id`. Antes de aplicarlas en una base existente debe ejecutarse un preflight de duplicados y definirse su correccion; una restriccion correcta puede hacer fallar la migracion si ya hay vinculaciones inconsistentes.

## 7. Matriz de Administracion Escolar

| Pantalla/ruta | Estado | Funcionalidad | Brecha obligatoria |
|---|---|---|---|
| Dashboard | `PARCIAL` | Estadisticas tenant desde API. | Exactitud, estados vacios/errores y humo por escuela. |
| Academico | `PARCIAL` | Ciclos, materias y estructura dentro del handler escolar. | El grupo `/academic` general del servidor es placeholder; consolidar contrato y probar por nivel. |
| Estudiantes | `PARCIAL` | CRUD, importacion y acceso portal. | Casos masivos, duplicados, privacidad, baja y E2E. |
| Profesores | `PARCIAL` | CRUD, asignaciones y acceso portal. | Ciclo de invitacion/reset, reasignacion, baja y E2E. |
| Grupos | `PARCIAL` | CRUD y vinculaciones. | Integridad/concurrencia, periodos y pruebas negativas. |
| Horarios | `PARCIAL` | CRUD protegido por `RequireModule("schedules")`. | Colisiones, zona horaria, seleccion/desactivacion y E2E. |
| Asistencias | `PARCIAL` | Captura masiva, historial y mensual, protegida por modulo. | Idempotencia, correcciones auditadas, carga y E2E. |
| Calificaciones | `PARCIAL` | Captura masiva, finales e historial, protegida por modulo. | Reglas/cierres/redondeo/permisos y E2E. |
| Notificaciones | `PARCIAL` | Endpoints escolares reales. | No esta gated por modulo; definir si es core y completar entrega/estado por usuario. |
| Perfil | `PARCIAL` | Cuenta/perfil basico. | Pruebas y definicion de campos editables. |
| Seguridad | `PARCIAL` | Cambio de contrasena real. | Alertas de login y switches de seguridad son estado local en la UI compartida; persistir o quitar. |
| Configuracion | `PARCIAL` | Parte de ajustes escolares persiste. | Varios switches de la UI compartida solo viven en React; no afirmar “guardado” sin API. |
| Comunicaciones | `BLOQUEADO` | CRUD escolar persistente. | Sin entrega/programador real; detalle en seccion 9. |
| Reportes | `BLOQUEADO` | Historial y exportacion parcial. | Datos sinteticos/errores omitidos y formatos falsos; detalle en seccion 10. |
| Documentos | `BLOQUEADO` | Metadatos y Data URL en BD. | Requiere object storage y seguridad de archivos. |
| Boletas | `BLOQUEADO` | Datos academicos disponibles. | No existe PDF real almacenado/descargable. |
| Pagos | `BLOQUEADO` | Registros manuales y sesion opcional Stripe. | Sin webhook/conciliacion/reembolsos seguros. |
| Base de datos | `BLOQUEADO` | Explorador tecnico visible. | La ruta no aplica `RequireModule("database_admin")` aunque el catalogo la bloquea. Ocultar y cerrar backend antes de liberar. |

El backend escolar solo permite mediante `RequireModule` los modulos `academic_core`, `schedules`, `attendance` y `grading`. Documentos, boletas, pagos, comunicaciones y reportes devuelven 503 aunque otra tabla intente habilitarlos. Este fail-closed es correcto y debe mantenerse hasta completar cada contrato.

## 8. Matriz de portales por rol

`frontend/app/school-portal/PortalRedirect.tsx` solo resuelve el rol y redirige a paneles existentes; no constituye por si mismo un portal probado.

| Portal | Estado | Lo que existe | Bloqueo/requisito |
|---|---|---|---|
| Director/Coordinador | `PARCIAL` | Reutiliza Administracion Escolar y contexto de soporte. | Depende del nucleo parcial; probar aislamiento, todos los modulos habilitados y soporte sin alterar JWT. |
| Profesor | `BLOQUEADO` | Clases, asistencia, calificaciones, mensajes y notificaciones. | Consultas en `backend/internal/modules/teacher/repository.go` usan funciones MySQL incompatibles con PostgreSQL; dashboard contiene indicadores aproximados/estaticos. |
| Padre de familia | `BLOQUEADO` | Hijos, calificaciones, asistencia, mensajes, consentimientos y cuenta. | Gate desactivado, sin E2E y dependencias bloqueadas; verificar cada relacion padre-hijo antes de cualquier lectura/mutacion. |
| Alumno | `BLOQUEADO` | Dashboard, calificaciones, asistencia, horario, materias y cuenta vinculada. | `backend/internal/modules/student/repository.go` usa SQL MySQL y en varios casos transforma errores en listas vacias; mensajes recientes del dashboard son hardcodeados vacios. |

El backend registra grupos por rol en `backend/cmd/server/main.go`, pero profesor/alumno no aplican un readiness gate modular adicional. Antes de activar un portal debe exigirse tanto el rol como la habilitacion segura del portal para la escuela.

## 9. Auditoria detallada de Comunicaciones

### Implementacion escolar

- CRUD real y tenant-scoped en `school_communications`.
- Eliminar es soft delete.
- “Enviar” cambia `status='sent'` y `sent_at`.
- Programar guarda una fecha.
- Los contadores de entrega permanecen en cero.
- No hay resolucion/materializacion de destinatarios, outbox, worker, proveedor, reintento, rebote, baja ni estado por destinatario.
- La UI dice “Modo demo con persistencia local”, aunque usa API; el texto es incorrecto y ofrece canales email/push/SMS que no existen.

### Implementacion independiente `/api/v1/communications`

- Crear/listar puede intentar persistir, pero varias acciones son solo `EventBus`: eliminar, marcar todos leidos, preferencias, envio masivo y actualizaciones de estado.
- Estadisticas y actividad reciente contienen valores sinteticos.
- El grupo requiere autenticacion, pero no restringe roles en `backend/cmd/server/main.go`.
- Las tablas `conversations`, `messages` y `announcements` usadas por ese repositorio no aparecen en `scripts/schema_postgres_consolidated.sql`.

### Dictamen

`BLOQUEADO`. No se debe habilitar `communication` ni `communications`. Para liberar se requiere outbox transaccional, destinatarios tenant-scoped, workers, proveedor de email/SMS/push, plantillas, preferencias reales, consentimiento, unsubscribe, rate limits, reintentos idempotentes, DLQ, webhooks de entrega/rebote y pruebas contra sandbox de cada proveedor.

## 10. Auditoria detallada de Reportes y Boletas

### Reportes escolares

- El historial, consulta y borrado se persisten.
- La generacion omite algunos errores SQL y no aplica de forma confiable todos los filtros.
- Algunos valores/insights son sinteticos o hardcodeados.
- Financiero y comportamiento no estan realmente calculados.
- Solicitar PDF o Excel cae en una respuesta CSV; solo JSON/CSV tienen serializacion parcial real.

### Implementacion independiente `/api/v1/reports`

- Crear un reporte registra un trabajo `pending` y publica un evento; no existe worker comprobado que lo termine.
- Borrar, plantillas, exportar y programar son principalmente eventos/no-op.
- El ID de exportacion es artificial y descargar redirige a una URL que no representa un archivo generado.
- Hay valores financieros hardcodeados.
- Las tablas `reports` y `report_templates` de esta implementacion no estan en el esquema PostgreSQL consolidado.

### Boletas

El flujo puede crear metadatos que dicen PDF, pero no produce ni almacena el archivo. Eso no es una boleta descargable real.

### Dictamen

`BLOQUEADO`. Se requiere una fuente de datos exacta, consultas que fallen visiblemente, jobs durables, PDF/XLSX reales, almacenamiento con checksum y URL firmada, control por tenant/rol, zona horaria/locale, pruebas golden y conciliacion de totales contra SQL.

## 11. Dependencias externas y riesgos transversales

| Dependencia/control | Estado | Bloqueo de produccion |
|---|---|---|
| Hostinger API/DNS/TLS | `BLOQUEADO` | Faltan credenciales verificadas y prueba real de alta, propagacion, TLS, document root y borrado/reintento seguro. |
| Despliegue GitHub -> Hostinger | `PARCIAL` | Existe workflow alterno, pero la conexion nativa no existe y falta evidencia de run exitoso + postcheck publico. |
| PostgreSQL/Neon | `BLOQUEADO` para portales afectados | SQL MySQL en profesor/alumno; tablas de communications/reports ausentes. |
| Object storage | `BLOQUEADO` | Variables S3 de ejemplo sin cliente/PutObject real; archivos en Data URL/metadata. |
| Stripe | `BLOQUEADO` | Checkout opcional sin webhook firmado, idempotencia y conciliacion. |
| Email/Resend | `BLOQUEADO` | Variables/TODO, sin sender; reset de contrasena no llega. |
| SMS/Twilio | `BLOQUEADO` | No hay adaptador/worker/estado de entrega real. |
| Push/Web Push | `BLOQUEADO` | No hay suscripciones, claves, worker ni receipts reales. |
| PDF/XLSX | `BLOQUEADO` | Respuesta CSV o metadatos sin archivo. |
| Backups/restore | `BLOQUEADO` | Dump parcial; restauracion sin ejecutor ni simulacro. |
| Deploy/rollback | `BLOQUEADO` | Versioning registra solicitudes sin ejecutarlas. |
| Observabilidad | `PARCIAL` | Health parcialmente sintetico; faltan probes, metricas, alertas y runbooks. |

### Brechas de seguridad/control que son release blockers

1. **Bypass del gate:** todas las mutaciones de catalogo/tenant/plan deben llamar una unica politica server-side; nunca confiar en la UI.
2. **Database Admin escolar:** el enlace y rutas deben quedar cerrados mientras `database_admin` esta bloqueado.
3. **Comunicaciones generales:** restringir roles y tenant; hoy el grupo general solo exige usuario autenticado.
4. **Errores ocultos:** no devolver `[]` o datos sinteticos cuando falla SQL; propagar error con correlation ID.
5. **Build permisivo:** `frontend/next.config.mjs` usa `ignoreBuildErrors` y omite lint. CI debe ejecutar TypeScript y lint por separado y bloquear la publicacion.
6. **Secretos:** Hostinger, DB, Stripe y proveedores solo en secret stores; sanitizar logs y rotar cualquier valor expuesto.
7. **Aislamiento tenant:** toda consulta y mutacion debe filtrar por `tenant_id`, con pruebas cruzadas A/B y 403/404 indistinguible cuando corresponda.

## 12. Criterios de aceptacion para promover a `LISTO`

### Para cualquier modulo

- [ ] Ruta frontend sin botones no-op, datos sinteticos ni copy que prometa un proveedor inexistente.
- [ ] Contrato backend completo: crear, leer, editar, eliminar/cancelar segun aplique, validacion y errores coherentes.
- [ ] Persistencia real con migracion PostgreSQL aplicada, indices, constraints y rollback documentado.
- [ ] RBAC y aislamiento por `tenant_id` probados con casos permitidos y denegados.
- [ ] Readiness gate aplicado en **todos** los endpoints de catalogo, plan y tenant.
- [ ] Pruebas unitarias, integracion PostgreSQL y E2E del navegador; ninguna depende solo de buscar strings.
- [ ] Telemetria, logs sin secretos/PII, metricas, alertas y runbook.
- [ ] Estados vacio/cargando/error/reintento accesibles y responsivos.
- [ ] Backup/recuperacion y politica de retencion para datos del modulo.
- [ ] Humo exitoso en el dominio publicado y evidencia adjunta al release.

### Para una escuela nueva y su subdominio

- [ ] Nombre -> slug canonico, unico, estable, con lista de reservados y validacion DNS.
- [ ] Transaccion crea tenant/admin/configuracion sin contrasenas conocidas o compartidas.
- [ ] Solo se asignan modulos de la allowlist de produccion.
- [ ] Job Hostinger idempotente con estado, reintentos, timeout y auditoria.
- [ ] `nslookup slug.onlineu.mx` resuelve al destino esperado.
- [ ] `https://slug.onlineu.mx/` tiene TLS valido y responde; `/educore/` y todos los chunks/assets responden 200 sin contenido mixto.
- [ ] Login y navegacion de director, profesor, padre y alumno se prueban solo para portales liberados.
- [ ] Una cuenta de escuela A no puede leer/escribir datos de escuela B, aun alterando IDs/headers.
- [ ] Desactivar/eliminar escuela define claramente que ocurre con DNS, sesiones, datos y recuperacion.

### Para Usuarios Globales

- [ ] Los tres puntos abren un menu accesible por teclado y mouse en cada fila.
- [ ] Ver/editar/cambiar estado/reset funcionan, muestran confirmacion y refrescan datos desde servidor.
- [ ] Filtros de escuela/rol/estado y busqueda se combinan con paginacion server-side.
- [ ] Alta manual valida rol-escuela y nunca permite permisos fuera de allowlist.
- [ ] Previene eliminar/desactivar el ultimo Super Admin.
- [ ] Cada mutacion queda auditada y los roles no autorizados reciben 403.

### Para modulos con proveedor externo

- [ ] Sandbox y produccion separados; secretos nunca llegan al frontend.
- [ ] Webhooks firmados, idempotentes, reintentables y con proteccion anti-replay.
- [ ] Estado local se reconcilia con el proveedor; no basta con “queued” o “sent”.
- [ ] Fallos, timeouts, cuotas y degradacion se prueban; existe DLQ/reproceso.
- [ ] Costos, privacidad, consentimiento, terminos y retencion estan aprobados.

## 13. Pruebas reproducibles

Ejecutar desde la raiz del repositorio. Guardar stdout, commit SHA, fecha, variables **sin valores secretos** y URL objetivo como evidencia del release.

### Calidad y pruebas locales obligatorias

```powershell
git rev-parse HEAD
git status --short

Set-Location backend
go test ./...

Set-Location ..
node scripts/check-production-module-readiness.js
node scripts/check-support-role-portals.js
node --test scripts/provision-school-domain.test.js scripts/check-school-grading-scale-backfill.test.js

Set-Location frontend
npx tsc --noEmit
npm run lint
npm run test:global-users
npm run build
```

Un `npm run build` verde no reemplaza `npx tsc --noEmit` ni lint por la configuracion permisiva de Next.js.

### Resultado ejecutado en este corte

Estas ejecuciones se hicieron el 2026-07-21 sobre el arbol de trabajo compartido. No son una certificacion del commit base ni del despliegue publico, pero si son evidencia del estado que debe corregirse antes de liberar.

| Comando | Resultado | Evidencia relevante |
|---|---|---|
| `go test ./...` | **FALLO** | `backend/internal/modules/school_admin/service.go:485-490` referencia `firstNonEmpty`, que no esta definido; por ello no compilan `school_admin` ni `cmd/server`. |
| `node scripts/check-production-module-readiness.js` | PASS | 72 validaciones estaticas, 0 fallos. Confirma paginas/gates declarados, no comportamiento completo en BD. |
| `node scripts/check-support-role-portals.js` | PASS | 56 validaciones estaticas, 0 fallos. Confirma marcadores de contexto/rol, no el recorrido real. |
| Tests de provision de dominio y backfill de escala | PASS | 7 pruebas, 0 fallos; usan dobles/fixtures, no la API Hostinger real. |
| `npx tsc --noEmit --incremental false` | PASS | TypeScript no reporto errores en esta ejecucion. |
| `npm run lint` | **FALLO** | Errores en landing, Super Admin, Administracion Escolar y portales: `any`, imports/variables sin uso, hooks, HTML sin escapar y uso invalido de hooks, entre otros. |
| `npm run test:global-users` | PASS | 3 pruebas de politica de contrasena, 0 fallos. No cubre menu, filtros, CRUD, RBAC ni integracion con BD. |
| `npm run build` | NO EJECUTADO | No aporta un gate valido mientras backend y lint fallan; ademas genera artefactos fuera del unico documento autorizado por esta auditoria. |
| Pruebas Hostinger/proveedores/publicas | NO EJECUTADAS | Requieren secretos, entorno y autoridad de despliegue; no se deben simular ni dar por aprobadas. |

En consecuencia, el gate local ya esta rojo aun antes de probar DNS, proveedores o produccion.

### Chequeos estaticos/funcionales adicionales por area

```powershell
node scripts/check-auth-routing.js
node scripts/check-school-provisioning.js
node scripts/check-school-domain.js
node scripts/check-school-routing.js
node scripts/check-school-portals.js
node scripts/check-role-portal-login.js
node scripts/check-support-context-live.js
node scripts/check-student-api.js
node scripts/check-student-schema.js
node scripts/check-student-portal-submodules.js
node scripts/check-communications-module.js
node scripts/check-reports-generation.js
node scripts/check-report-cards-export.js
node scripts/check-school-reports-table.js
```

Estos scripts son evidencia auxiliar. Los que solo validan marcadores/strings no sustituyen una prueba contra PostgreSQL, proveedores y navegador reales.

### Prueba PostgreSQL obligatoria

1. Crear una base efimera PostgreSQL de la misma version que produccion.
2. Aplicar desde cero `scripts/schema_postgres_consolidated.sql` y todas las migraciones posteriores, incluida `020_production_module_readiness_gate.sql`.
3. Arrancar backend con esa base.
4. Crear dos escuelas A/B y usuarios de los cinco roles.
5. Ejecutar todos los endpoints de profesor y alumno. Cualquier error por `DATE_FORMAT`, `TIME_FORMAT` o `FIELD` bloquea el release.
6. Intentar acceso cruzado A/B con IDs validos; toda lectura/mutacion debe fallar.
7. Verificar que ningun endpoint alterno activa una clave fuera de la allowlist.

### Prueba real de subdominio Hostinger

Usar una escuela desechable y secretos en el entorno, nunca en la linea de comandos ni en el log.

```powershell
Resolve-DnsName escuela-auditoria.onlineu.mx
curl.exe -I https://escuela-auditoria.onlineu.mx/
curl.exe -I https://escuela-auditoria.onlineu.mx/educore/
```

Ademas:

1. Crear la escuela desde Super Admin y capturar el correlation/job ID.
2. Comprobar en Hostinger el subdominio individual, document root y certificado.
3. Abrir con navegador limpio, comprobar HTML, JS, CSS, fuentes y API sin 404/CORS.
4. Reintentar el mismo job y confirmar que no crea duplicados.
5. Simular fallo del proveedor y confirmar `DOMAIN_FAILED`, alerta y reintento.
6. Eliminar la escuela desechable siguiendo el procedimiento de rollback aprobado; no hacerlo automaticamente desde esta auditoria.

### Pruebas E2E minimas de Usuarios Globales

1. Super Admin abre menu de cada fila con mouse y teclado.
2. Filtra por cada escuela y rol; compara conteos contra SQL.
3. Crea un usuario por rol con escuela correcta; valida invitacion/reset sin exponer password.
4. Edita rol/permisos/estado y vuelve a iniciar sesion para confirmar enforcement.
5. Intenta las mismas APIs como SCHOOL_ADMIN, TEACHER, PARENT y STUDENT; espera 403.
6. Intenta desactivar el ultimo Super Admin; espera rechazo.
7. Revisa el audit log antes/despues de cada operacion.

### Pruebas externas antes de habilitar cada modulo

- **Email:** mensaje real a un buzón controlado, enlace de reset de un solo uso, expiracion, rebote y supresion.
- **SMS/push:** opt-in, entrega, fallo, reintento, opt-out y receipt.
- **Stripe:** checkout sandbox, webhook firmado duplicado, pago fallido/exitoso, refund y conciliacion.
- **Storage:** upload/download firmado, archivo malicioso, tamano limite, borrado/retencion y restauracion.
- **Reportes/boletas:** PDF/XLSX abren correctamente y sus totales coinciden con SQL.
- **Backups:** restauracion completa en entorno aislado y medicion de RPO/RTO.

## 14. Gate final de liberacion

La liberacion solo puede cambiar a `GO` cuando:

1. no haya ningun `BLOQUEADO` visible o activable en produccion;
2. todos los endpoints de activacion respeten la misma allowlist server-side;
3. las pruebas de la seccion 13 pasen en un commit limpio;
4. exista una corrida exitosa del workflow de despliegue y postcheck publico;
5. una escuela desechable complete dominio, TLS, assets, API y aislamiento;
6. el responsable de producto acepte por escrito el alcance limitado y no publicite modulos fuera de el;
7. exista rollback probado para frontend, backend, migraciones y DNS.

Hasta entonces, la interfaz debe mostrar claramente los modulos bloqueados como “Proximamente/no disponible”, sin botones que aparenten funcionar, y las escuelas nuevas no deben figurar como operativas si su dominio o sus flujos esenciales siguen pendientes.

## 15. Evidencia principal revisada

- `frontend/lib/modules/registry.ts`
- `frontend/next.config.mjs`
- `frontend/app/super-admin/layout.tsx`
- `frontend/app/super-admin/users/page.tsx`
- `frontend/app/school-admin/layout.tsx`
- `frontend/app/school-portal/PortalRedirect.tsx`
- `frontend/components/modules/account/AccountPages.tsx`
- `backend/cmd/server/main.go`
- `backend/internal/modules/super_admin/handler.go`
- `backend/internal/modules/super_admin/enterprise.go`
- `backend/internal/modules/super_admin/global_users.go`
- `backend/internal/modules/school_admin/handler.go`
- `backend/internal/modules/school_admin/service.go`
- `backend/internal/modules/teacher/repository.go`
- `backend/internal/modules/student/repository.go`
- `backend/internal/modules/auth/handler.go`
- `backend/internal/pkg/schooldomain/hostinger.go`
- `backend/migrations/020_production_module_readiness_gate.sql`
- `scripts/schema_postgres_consolidated.sql`
- `.github/workflows/deploy-frontend-hostinger.yml`
- `.github/workflows/provision-domains.yml`
