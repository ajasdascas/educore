# Comando: /fix-issue
# Uso: /fix-issue [descripción del bug]
# Ejemplo: /fix-issue "El login no funciona cuando el email tiene mayúsculas"

## PROTOCOLO DE CORRECCIÓN DE BUGS

### PASO 1 — Diagnóstico
1. Lee el error completo (si hay stack trace, analízalo)
2. Identifica el módulo afectado
3. Lee el código relevante ANTES de proponer solución

### PASO 2 — Hipótesis
Plantea 2-3 causas posibles ordenadas por probabilidad:
```
Causa 1 (más probable): [descripción]
Causa 2: [descripción]
Causa 3: [descripción]
```

### PASO 3 — Verificación
Antes de corregir, verifica la causa con un test o log:
- Go: añade `log.Printf()` temporal o escribe un test
- Frontend: usa `console.log` o React DevTools

### PASO 4 — Corrección
- Aplica el fix más pequeño posible
- No refactorices código que no está roto
- Añade un comment `// Fix: [descripción breve]`

### PASO 5 — Verificación Post-Fix
- Prueba el caso que fallaba
- Prueba casos relacionados (regression)
- Elimina logs temporales

### PASO 6 — Commit
```bash
./scripts/auto-commit.sh "fix: [descripción breve del bug corregido]"
```

### PASO 7 — Documentar
Si el bug era por una decisión de diseño, agrega nota en:
`docs/obsidian/DECISIONES_TECNICAS.md`
