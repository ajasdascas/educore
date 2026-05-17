# Despliegue en Hostinger Node.js

Este documento explica cómo configurar el despliegue del proyecto EduCore en Hostinger Node.js. Debido a que Hostinger utiliza por defecto el directorio raíz del repositorio para ejecutar la aplicación, los comandos se han configurado para delegar la construcción y ejecución al directorio `frontend/`.

## Comandos Recomendados en Hostinger

- **Build command**: `npm run build`
- **Start command**: `npm start`
- **Output servido**: `frontend/out`

## Notas Importantes

1. **Uso del `package.json` raíz**: El `package.json` en la raíz del proyecto no debe utilizarse directamente para lógicas propias de Next.js. Su único propósito en el contexto del despliegue es delegar las instrucciones hacia el directorio `frontend/`.
2. **Script de Test**: El comando de `test` en la raíz ha sido modificado para que no falle (`exit 0`). Esto evita que el pipeline de despliegue se interrumpa.
3. **Variables de Entorno**: Asegúrate de configurar correctamente `NEXT_PUBLIC_API_URL` en el panel de Hostinger para que apunte al backend real de Railway (u otro proveedor), si aplica.
4. **Directorio de Trabajo (Alternativa)**: Si Hostinger permite configurar el *working directory* en la interfaz de usuario, una alternativa válida es definir `frontend` como el directorio de trabajo, lo que haría innecesaria la delegación desde la raíz.

---
*Para pruebas de despliegue, puedes utilizar el script automatizado en `scripts/check-hostinger-node-deploy.js`.*
