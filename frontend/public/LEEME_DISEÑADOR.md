# Guía para el Diseñador — EduCore

Hola. Este archivo explica qué necesitas saber para hacer cambios
visuales en la aplicación sin necesidad de saber programar.

## ¿Qué puedes cambiar tú?

### 1. Colores de toda la app
Abre el archivo: `styles/design-tokens.css` (en desarrollo) o revisa el `tailwind.config.ts`.
Cambia los valores hexadecimales (#...) de las variables.
Los comentarios en ese archivo explican qué controla cada variable.

### 2. Logo de EduCore
Reemplaza los archivos en: `public/images/logos/`
- `educore-logo.svg` → Logo sobre fondo blanco
- `educore-logo-white.svg` → Logo sobre fondo azul oscuro (sidebar)
Mantén el mismo nombre de archivo y el sistema lo carga automáticamente.

### 3. Imagen de fondo del login
Reemplaza el archivo: `public/images/backgrounds/login-bg.jpg`
Mismo nombre, misma extensión (.jpg). Tamaño recomendado: 1920x1080px.

### 4. Ilustraciones de "sin datos"
Cuando una sección no tiene información aún, muestra una imagen.
Reemplaza los archivos en: `public/images/illustrations/`
- `empty-state-students.svg` → Cuando no hay alumnos
- `empty-state-grades.svg` → Cuando no hay calificaciones
- `empty-state-attendance.svg` → Cuando no hay asistencias

### 5. Fuente de la aplicación
Abre: `styles/design-tokens.css` (o el global.css)
Busca la variable `--font-main` y cambia el nombre de la fuente.
Avisa a Giovanni para que la importe desde Google Fonts.

## ¿Qué NO debes cambiar?
- Archivos `.tsx`, `.go`, `.ts` (son código)
- Archivos en carpetas `modules/`, `internal/`, `api/`
- El archivo `tailwind.config.ts` (solo si tienes experiencia)

## ¿Cómo ver tus cambios en tiempo real?
El servidor de desarrollo está corriendo en: http://localhost:3000
Cada vez que guardas un archivo, el navegador se actualiza solo.
