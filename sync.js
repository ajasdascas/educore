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

        // Subimos out/ a la subcarpeta educore dentro del public_html de onlineu.mx
        const remoteDir = "/domains/onlineu.mx/public_html/educore";
        const outDir = path.join(__dirname, "frontend", "out");
        console.log(`Subiendo build estático (out/) a ${remoteDir}/...`);
        await uploadDir(client, outDir, remoteDir);

        console.log("Subida FTP completada con éxito.");
    } catch (err) {
        console.error("Error en FTP:", err.message);
    }
    client.close();

    // Paso 3: GitHub
    try {
        console.log("Realizando commit en GitHub...");
        execSync("git add frontend backend sync.js package.json .gitignore");
        execSync('git commit -m "Auto update: Deploy a FTP y Github"');
        execSync("git push");
        console.log("Commit y Push en GitHub completados.");
    } catch (err) {
        console.log("Info Git: " + err.message.split("\n")[0]);
    }
}

deploy();
