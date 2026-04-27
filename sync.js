// ============================================================
// ARCHIVO: sync.js
// QUÉ HACE: Compila el frontend, sube a FTP y hace push a GitHub.
//           Se ejecuta con: node sync.js
// ============================================================
const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const IGNORE = new Set(["node_modules", ".next", ".git", ".env", "out"]);

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
    const client = new ftp.Client();
    client.ftp.verbose = false;

    // Paso 1: Build
    try {
        console.log("Construyendo frontend (Next.js Static Export)...");
        execSync("npm run build", { cwd: path.join(__dirname, "frontend"), stdio: "inherit" });
        console.log("Build completado.");
    } catch (err) {
        console.error("Error construyendo el frontend.");
        return;
    }

    // Paso 2: FTP
    try {
        console.log("Conectando al FTP...");
        await client.access({
            host: "onlineu.mx",
            user: "u550473909",
            password: "Peju751015",
            secure: false
        });

        // Next.js con basePath: "/educore" genera out/educore/
        // Subimos el contenido de out/educore/ a /domains/educore/
        const outDir = path.join(__dirname, "frontend", "out", "educore");
        if (fs.existsSync(outDir)) {
            console.log("Subiendo build estático (out/educore/) a /domains/educore/...");
            await uploadDir(client, outDir, "/domains/educore");
        } else {
            // Fallback: si no existe subcarpeta, subir out/ directamente
            console.log("Subiendo build estático (out/) a /domains/educore/...");
            await uploadDir(client, path.join(__dirname, "frontend", "out"), "/domains/educore");
        }

        console.log("Subida FTP completada con éxito.");
    } catch (err) {
        console.error("Error en FTP:", err.message);
    }
    client.close();

    // Paso 3: GitHub
    try {
        console.log("Realizando commit en GitHub...");
        execSync("git add -A");
        execSync('git commit -m "Auto update: Deploy a FTP y Github"');
        execSync("git push");
        console.log("Commit y Push en GitHub completados.");
    } catch (err) {
        console.log("Info Git: " + err.message.split("\n")[0]);
    }
}

deploy();
