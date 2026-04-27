const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

async function uploadDir(client, localDir, remoteDir) {
    await client.ensureDir(remoteDir);
    const entries = fs.readdirSync(localDir);

    for (const entry of entries) {
        if (entry === "node_modules" || entry === ".next" || entry === ".git" || entry === ".env") {
            continue;
        }

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

    try {
        console.log("Conectando al FTP...");
        await client.access({
            host: "onlineu.mx",
            user: "u550473909",
            password: "Peju751015",
            secure: false
        });

        console.log("Conexión FTP exitosa. Subiendo frontend y backend (ignorando node_modules/.next)...");
        await uploadDir(client, path.join(__dirname, "frontend"), "/domains/educore/frontend");
        await uploadDir(client, path.join(__dirname, "backend"), "/domains/educore/backend");

        console.log("Subida FTP completada con éxito.");

    } catch (err) {
        console.error("Error en FTP:", err);
    }
    client.close();

    try {
        console.log("Realizando commit en GitHub...");
        execSync("git add frontend backend sync.js package.json package-lock.json");
        execSync('git commit -m "Auto update: Deploy a FTP y Github"');
        execSync("git push");
        console.log("Commit y Push en GitHub completados.");
    } catch (err) {
        console.log("Info Git: " + err.message.split("\n")[0]);
    }
}

deploy();
