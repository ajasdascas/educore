# 🚀 Setup de Deploy Automático

## 🔧 Configuración de GitHub Secrets

Para que el deploy automático funcione, necesitas configurar la contraseña FTP como secret en GitHub:

### Paso 1: Ir a GitHub
1. Ve a tu repositorio: https://github.com/ajasdascas/educore
2. Clic en **Settings** (Configuración)
3. En la barra lateral izquierda, clic en **Secrets and variables** → **Actions**

### Paso 2: Crear el Secret
1. Clic en **New repository secret**
2. **Name**: `FTP_PASSWORD`
3. **Secret**: `Peju751015`
4. Clic en **Add secret**

## ⚡ Cómo funciona el deploy automático

### 🎯 Trigger (Disparador)
- **Automático**: Cada vez que hagas `git push` a la rama `master`
- **Manual**: Desde GitHub → Actions → "🚀 Deploy EduCore to Production" → "Run workflow"

### 📋 Proceso automático
1. ✅ GitHub detecta el push
2. 🏗️ Instala Node.js y dependencias
3. 📦 Hace build de producción (`npm run build`)
4. 🚀 Sube archivos vía FTP a `/domains/educore/next/`
5. ✅ Notifica si fue exitoso o falló

### 📱 Notificaciones
- **Éxito**: ✅ Recibirás email de GitHub
- **Error**: ❌ Recibirás email con detalles del fallo
- **Progreso**: Puedes ver en tiempo real en GitHub → Actions

## 🎯 URLs después del deploy
- **Producción**: https://onlineu.mx/educore/super-admin/dashboard/
- **GitHub Actions**: https://github.com/ajasdascas/educore/actions

## ⚠️ Importante
- El primer deploy puede tomar 5-10 minutos
- Los siguientes serán más rápidos (2-3 minutos)
- Si hay errores, revisa en GitHub Actions

## 🔧 Testing del deploy
1. Haz cualquier cambio pequeño en el código
2. `git add .` → `git commit -m "test deploy"` → `git push`
3. Ve a GitHub Actions para ver el progreso
4. En ~5 minutos estará en producción