# EduCore Backend En Hostinger VPS

Fecha: 02-05-2026

## Objetivo
Mover la API Go/Fiber a un VPS con IP fija y MariaDB local. El frontend sigue en Hostinger estatico y consume `https://api.onlineu.mx`. phpMyAdmin queda solo como herramienta administrativa.

## Arquitectura elegida
- `onlineu.mx/educore`: frontend estatico en Hostinger.
- `api.onlineu.mx`: Nginx en Hostinger VPS.
- `127.0.0.1:8080`: backend EduCore Go/Fiber.
- `127.0.0.1:3306`: MariaDB local del VPS.
- Cloudflare: DNS/proxy/SSL edge; no cache para `/api/*`.

## Provisioning inicial del VPS
1. Crear VPS Ubuntu LTS en Hostinger.
2. Crear usuario Linux:
   ```bash
   adduser educore
   usermod -aG sudo educore
   ```
3. Copiar llave SSH y deshabilitar password login cuando confirmes acceso por llave.
4. Instalar paquetes:
   ```bash
   sudo apt update
   sudo apt install -y nginx mariadb-server certbot python3-certbot-nginx ufw
   ```
5. Firewall:
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

## MariaDB local
1. Ejecutar hardening:
   ```bash
   sudo mysql_secure_installation
   ```
2. Crear DB y usuario dedicado:
   ```sql
   CREATE DATABASE educore_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'educore_app'@'localhost' IDENTIFIED BY 'GENERATE_A_STRONG_SECRET';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, REFERENCES, TRIGGER ON educore_prod.* TO 'educore_app'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Importar schema:
   ```bash
   mysql -u educore_app -p educore_prod < backend/migrations_mysql/001_hostinger_core.sql
   ```

## Backend API
1. Crear directorios:
   ```bash
   sudo mkdir -p /opt/educore/api /etc/educore /var/log/educore
   sudo chown -R educore:educore /opt/educore /var/log/educore
   ```
2. Copiar `deploy/vps/api.env.production.example` a `/etc/educore/api.env` y llenar secretos reales.
3. Instalar systemd:
   ```bash
   sudo cp deploy/vps/educore-api.service /etc/systemd/system/educore-api.service
   sudo systemctl daemon-reload
   sudo systemctl enable educore-api
   ```
4. Desplegar desde tu maquina:
   ```bash
   VPS_HOST=IP_DEL_VPS VPS_USER=educore scripts/deploy_vps.sh
   ```

## Nginx y TLS
1. Crear DNS `api.onlineu.mx` apuntando al VPS.
2. Copiar `deploy/vps/api.onlineu.mx.conf` a `/etc/nginx/sites-available/api.onlineu.mx`.
3. Activar:
   ```bash
   sudo ln -s /etc/nginx/sites-available/api.onlineu.mx /etc/nginx/sites-enabled/api.onlineu.mx
   sudo nginx -t
   sudo certbot --nginx -d api.onlineu.mx
   sudo systemctl reload nginx
   ```
4. En Cloudflare usar SSL/TLS `Full (strict)`.

## phpMyAdmin
Instalarlo solo si se necesita administracion visual. Protegerlo con una de estas opciones:
- limitar por VPN/IP;
- basic auth en Nginx;
- subruta no publica con access control;
- o usar phpMyAdmin local por tunel SSH.

No exponer phpMyAdmin libremente en Cloudflare.

## Seguridad operacional
- Rotar la contrasena MySQL que ya fue compartida antes de conectar produccion.
- Guardar secretos solo en `/etc/educore/api.env`, no en git.
- `DB_DRIVER=mysql` solo cuando los repositorios portables pasen tests.
- Ejecutar seed de propietarios con `EDUCORE_OWNER_ADMIN_PASSWORD` temporal y rotarlo despues de verificacion.

#deployment #vps #hostinger #mysql #security #backend
