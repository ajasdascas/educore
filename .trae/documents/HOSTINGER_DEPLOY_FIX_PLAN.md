# Plan de Solución para Despliegue en Hostinger Node.js

## Resumen
El objetivo de este plan es corregir el error de despliegue en Hostinger Node.js provocado porque Hostinger lee el `package.json` de la raíz del repositorio en lugar del que se encuentra en la carpeta `frontend/`. El script `test` actual en la raíz falla con un `exit 1`, lo que interrumpe la construcción. 

Se delegarán los comandos de build y start al directorio `frontend/` desde la raíz para mantener la compatibilidad con el entorno de Hostinger sin alterar la lógica de Next.js.

## Análisis del Estado Actual
- **Raíz (`/workspace/package.json`)**: Contiene un script `test` que hace `exit 1` y no tiene scripts de `build` ni `start`. Tiene una dependencia existente (`basic-ftp`).
- **Frontend (`/workspace/frontend/package.json`)**: Contiene el comando `"build": "next build"`.
- **Configuración de Next.js (`/workspace/frontend/next.config.mjs`)**: Contiene `output: "export"` cuando el entorno es de producción.
- **Ramas y flujo**: El trabajo se realizará sobre la rama `claude/overnight-platform-foundation` sin realizar merge a `master` y respetando el flujo de despliegue existente.

## Cambios Propuestos

### 1. Actualizar `package.json` raíz
**Archivo**: `/workspace/package.json`
- **Qué hacer**:
  - Reemplazar el bloque `scripts` actual por:
    ```json
    "scripts": {
      "build": "npm ci --prefix frontend && npm run build --prefix frontend",
      "start": "serve frontend/out -l ${PORT:-3000}",
      "test": "echo \"No tests configured for root package\" && exit 0"
    }
    ```
  - Agregar la dependencia `serve` (`"^14.2.4"`) al bloque `dependencies`, conservando `basic-ftp`.
- **Por qué**: Para permitir que Hostinger ejecute los procesos de compilación y ejecución de la aplicación desde la raíz del repositorio pero aplicados al código que vive en `frontend/`.

### 2. Confirmar configuraciones del Frontend (Solo verificación)
**Archivos**: 
- `/workspace/frontend/package.json`
- `/workspace/frontend/next.config.mjs`
- **Qué hacer**: Asegurarse de que el script `build` se mantenga como `"next build"` y que el output mantenga el modo de exportación estática (`output: "export"`).

### 3. Crear documentación sobre el despliegue
**Archivo**: `/workspace/docs/HOSTINGER_NODE_DEPLOY.md`
- **Qué hacer**: Crear un documento Markdown que explique los comandos recomendados en Hostinger:
  - **Build command recomendado**: `npm run build`
  - **Start command recomendado**: `npm start`
  - **Output servido**: `frontend/out`
  - **Notas adicionales**:
    - El `package.json` raíz delega a `frontend`.
    - No usar la raíz para la lógica directa de Next.js.
    - El `test` raíz no debe fallar.
    - Configurar variables de entorno como `NEXT_PUBLIC_API_URL`.
    - Sugerir como alternativa configurar el "working directory" en Hostinger (apuntando a `frontend`) si es posible.
- **Por qué**: Para servir como guía técnica para cualquier administrador o desarrollador que modifique el despliegue.

### 4. Crear script de QA
**Archivo**: `/workspace/scripts/check-hostinger-node-deploy.js`
- **Qué hacer**: Escribir un script de Node.js que realice las siguientes aserciones y termine con un mensaje de éxito o un error descriptivo:
  - Verificar la existencia de `package.json` raíz.
  - Verificar que existen los scripts `build` y `start` en la raíz.
  - Verificar que el script `test` en la raíz no contenga `exit 1`.
  - Verificar la existencia de `frontend/package.json` y de su comando de build.
  - Verificar que `next.config.mjs` tiene configurado el `output: "export"`.
  - Verificar que `serve` esté en las `dependencies` de la raíz.
  - Ejecutar una simulación del build (`npm run build` desde raíz, o al menos el de `frontend`) para confirmar que se genere `frontend/out/index.html`.
- **Por qué**: Automatizar la validación de la configuración sin tener que probarla mediante ensayo y error en el entorno de producción.

## Suposiciones y Decisiones
- Se asume que Hostinger tiene preinstalado Node.js y ejecutará `npm install` (o leerá las dependencias) a nivel raíz. Por tanto, `serve` debe estar en la raíz.
- Se asume que el comando de build delegará la instalación limpia en la subcarpeta (`npm ci --prefix frontend`) asegurando consistencia.
- Se mantendrá el condicional `...(isProd && { output: "export" })` en `next.config.mjs` porque es válido durante un build productivo en Hostinger.

## Pasos de Verificación y Ejecución
1. Ejecutar el script QA con `node scripts/check-hostinger-node-deploy.js`.
2. Ejecutar `npm run test` en la raíz (debe retornar exit 0).
3. Ejecutar la compilación del frontend (`cd frontend && npm run build` o mediante `npm run build` en la raíz si es factible por tiempo) para comprobar que el resultado en `frontend/out` se genere.
4. Generar el commit con los archivos actualizados (`package.json`, `package-lock.json`, `docs/HOSTINGER_NODE_DEPLOY.md`, `scripts/check-hostinger-node-deploy.js`).
5. Realizar el `git push origin claude/overnight-platform-foundation`.
6. Generar el reporte final indicando la causa raíz, cambios aplicados y resultados.
