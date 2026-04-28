# 🚀 Deploy EduCore a Producción

## 📋 Resumen
- ✅ **Localhost**: `http://localhost:3000` → Backend: `localhost:8083`
- 🎯 **Producción**: `https://onlineu.mx` → Backend: `https://api.onlineu.mx`

## 🔧 Opciones de Deploy Backend

### OPCIÓN 1: Railway (Recomendado - Gratis)
```bash
# 1. Crear cuenta en railway.app
# 2. Conectar tu repo GitHub
# 3. Railway detectará automáticamente el Dockerfile
# 4. Te dará una URL como: https://educore-backend-production.up.railway.app
```

### OPCIÓN 2: Render (Alternativa gratuita)
```bash
# 1. Crear cuenta en render.com  
# 2. Conectar GitHub repo
# 3. Configurar:
#    - Build Command: cd backend && go build ./cmd/server
#    - Start Command: ./server
#    - Port: 8080
```

### OPCIÓN 3: Tu Servidor (VPS/cPanel)
```bash
# En tu servidor onlineu.mx:
git clone https://github.com/ajasdascas/educore.git
cd educore/backend
go build ./cmd/server

# Variables de entorno necesarias:
export DATABASE_URL="postgresql://usuario:password@host:5432/educore"
export JWT_SECRET="tu-jwt-secret-super-seguro"
export PORT=8080

# Ejecutar:
./server
```

## 🌐 Configuración DNS

### Para usar `api.onlineu.mx` (Recomendado):
```
Tipo: CNAME
Nombre: api  
Valor: [URL-de-tu-backend-deployado]
```

### Para usar `onlineu.mx/api` (Alternativa):
```
Configurar reverse proxy en tu servidor web:
- Apache: ProxyPass /api http://localhost:8080
- Nginx: proxy_pass http://localhost:8080;
```

## 📊 Variables de Entorno Producción

Crear archivo `.env` en backend:
```env
# Base de datos
DATABASE_URL=postgresql://username:password@host:5432/educore_prod

# JWT
JWT_SECRET=tu-jwt-secret-super-ultra-seguro-512-bits
JWT_EXPIRATION=15m
REFRESH_EXPIRATION=7d

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# App
APP_ENV=production
PORT=8080
```

## ✅ Checklist Deploy

- [ ] Backend deployado y funcionando
- [ ] Base de datos PostgreSQL configurada
- [ ] Variables de entorno configuradas
- [ ] DNS/subdomain configurado
- [ ] CORS permite tu dominio
- [ ] SSL/HTTPS funcionando
- [ ] Health check: `https://api.onlineu.mx/api/v1/health`

## 🧪 Testing Producción

```bash
# Test API health
curl https://api.onlineu.mx/api/v1/health

# Test desde tu frontend
# Ir a: https://onlineu.mx/super-admin/dashboard
```

## 🆘 Solución Rápida (Temporal)

Si necesitas que funcione YA en onlineu.mx:

1. **Deploy a Railway** (5 minutos):
   - Ve a railway.app
   - Conecta tu GitHub
   - Deploy automático
   - Te da URL: `https://educore-xyz.up.railway.app`

2. **Actualizar frontend**:
   ```typescript
   // En frontend/lib/api.ts, cambiar línea 15:
   return "https://educore-xyz.up.railway.app";
   ```

3. **Commit y push**:
   ```bash
   git commit -am "fix: usar Railway backend en producción"
   git push
   ```

4. **Upload frontend** a tu hosting onlineu.mx

¡Listo! 🎉