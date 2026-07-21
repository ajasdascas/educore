// ============================================================
// ARCHIVO: sync.js
// QUÉ HACE: Herramienta MANUAL de emergencia para desplegar el
//           frontend estático a Hostinger por FTP.
//
//   node sync.js
//
// El flujo AUTOMÁTICO oficial es GitHub Actions
// (.github/workflows/deploy-frontend-hostinger.yml). Este script es
// solo un respaldo manual y explícito.
//
// IMPORTANTE (cambios de seguridad respecto a la versión anterior):
//   - NO hace git add / commit / push  (evita ciclos de despliegue).
//   - NO borra archivos remotos (solo sube/actualiza).
//   - Exige NEXT_PUBLIC_API_URL para no hornear un build roto.
//   - Credenciales SOLO por variables de entorno (nunca hardcodeadas).
//
// Variables requeridas en el entorno (no versionar):
//   NEXT_PUBLIC_API_URL   URL pública del backend (https://...)
//   FTP_HOST              host FTP de Hostinger (p. ej. ftp.onlineu.mx)
//   FTP_USER              usuario FTP
//   FTP_PASSWORD          contraseña FTP
//   FTP_TARGET_DIR        opcional; default /domains/onlineu.mx/public_html/educore
// ============================================================
const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const IGNORE = new Set(["node_modules", ".next", ".git", ".env", "out"]);
const FTP_HOST = process.env.FTP_HOST || "ftp.onlineu.mx";
const FTP_USER = process.env.FTP_USER;
const FTP_PASSWORD = process.env.FTP_PASSWORD;
const FTP_TARGET_DIR =
    process.env.FTP_TARGET_DIR || "/domains/onlineu.mx/public_html/educore";
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim();

async function uploadDir(client, localDir, remoteDir) {
    await client.ensureDir(remoteDir);
    const entries = fs.readdirSync(localDir);
    for (const entry of entries) {
        if (IGNORE.has(entry)) continue;
        const localPath = path.join(localDir, entry);
        const remotePath = `${remoteDir}/${entry}`;
        if (fs.statSync(localPath).isDirectory()) {
            await uploadDir(client, localPath, remotePath);
        } else {
            console.log(`Subiendo: ${remotePath}`);
            await client.uploadFrom(localPath, remotePath);
        }
    }
}

async function deploy() {
    // Paso 0: validaciones
    if (!API_URL || !API_URL.startsWith("https://")) {
        console.error(
            "ERROR: NEXT_PUBLIC_API_URL debe estar definida y ser https:// " +
            "(la URL pública del backend). Aborta para no subir un build roto."
        );
        process.exit(1);
    }
    if (!FTP_USER || !FTP_PASSWORD) {
        console.error("ERROR: define FTP_USER y FTP_PASSWORD en el entorno.");
        process.exit(1);
    }

    // Paso 1: Build (hornea NEXT_PUBLIC_API_URL desde el entorno)
    try {
        console.log(`Construyendo frontend con NEXT_PUBLIC_API_URL=${API_URL} ...`);
        execSync("npm run build", {
            cwd: path.join(__dirname, "frontend"),
            stdio: "inherit",
            env: { ...process.env, NEXT_PUBLIC_API_URL: API_URL },
        });
        console.log("Build completado.");
    } catch (err) {
        console.error("Error construyendo el frontend. Aborta.");
        process.exit(1);
    }

    // Paso 1b: verificar que no quede la URL muerta de Railway
    const outDir = path.join(__dirname, "frontend", "out");
    try {
        const grepHit = execSync(
            `grep -rl "educore-production-beef.up.railway.app" "${outDir}" || true`
        ).toString().trim();
        if (grepHit) {
            console.error("ERROR: el build contiene la URL muerta de Railway. Aborta.");
            process.exit(1);
        }
    } catch (_) { /* grep ausente en algunos entornos: no bloquear */ }

    // Paso 2: FTP (sube el CONTENIDO de out/, sin borrar remoto)
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        console.log(`Conectando al FTP ${FTP_HOST} ...`);
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASSWORD,
            secure: false,
        });
        console.log(`Subiendo out/ a ${FTP_TARGET_DIR}/ ...`);
        await uploadDir(client, outDir, FTP_TARGET_DIR);
        console.log("Subida FTP completada con éxito.");
    } catch (err) {
        console.error("Error en FTP:", err.message);
        process.exitCode = 1;
    } finally {
        client.close();
    }

    // Nota: este script NO hace git add/commit/push a propósito.
    console.log("Listo. (Recuerda: los commits se hacen a mano; este script no toca git.)");
}

deploy();
