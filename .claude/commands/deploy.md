# Comando: /deploy
# Uso: /deploy [staging|production]
# Revisa checklist de despliegue antes de proceder

## CHECKLIST PRE-DEPLOY

### 🧪 Tests
- [ ] `make test` pasa sin errores
- [ ] `make test-integration` pasa
- [ ] No hay `TODO` o `FIXME` en código nuevo

### 🗄️ Base de Datos
- [ ] Migraciones nuevas son reversibles (tienen `-- migrate:down`)
- [ ] Se probaron las migraciones en BD de staging
- [ ] Políticas RLS verificadas con usuario de prueba

### 🔐 Seguridad
- [ ] Variables de entorno actualizadas en el servidor
- [ ] No hay credenciales hardcodeadas
- [ ] JWT secret rotado si es necesario
- [ ] CORS configurado correctamente para el dominio

### 📦 Build
- [ ] `go build ./...` sin errores
- [ ] `npm run build` sin errores ni warnings críticos
- [ ] Imágenes Docker construidas correctamente

### 📝 Documentación
- [ ] `docs/obsidian/CONTEXTO_ACTUAL.md` actualizado
- [ ] CHANGELOG actualizado
- [ ] Versión bumpeada en go.mod / package.json

## COMANDOS DE DEPLOY

```bash
# Staging
make deploy-staging

# Production (requiere aprobación explícita)
make deploy-production
```

## POST-DEPLOY

- [ ] Verificar logs en primeros 5 minutos
- [ ] Probar flujo crítico: login → ver dashboard → tomar asistencia
- [ ] Notificar en Slack/Discord: "Deploy [version] completado"
- [ ] Actualizar `docs/obsidian/CAMBIOS_RECIENTES.md`
