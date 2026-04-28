const ftp = require("basic-ftp");

async function explore() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    
    await client.access({
        host: "onlineu.mx",
        user: "u550473909",
        password: "Peju751015",
        secure: false
    });

    console.log("=== ROOT (/) ===");
    const rootList = await client.list("/");
    rootList.forEach(f => console.log(`  ${f.type === 2 ? 'DIR' : 'FILE'} ${f.name} ${f.size || ''}`));

    // Check common Hostinger paths
    for (const dir of ["/domains", "/domains/onlineu.mx", "/domains/onlineu.mx/public_html", "/public_html", "/home"]) {
        try {
            console.log(`\n=== ${dir} ===`);
            const list = await client.list(dir);
            list.forEach(f => console.log(`  ${f.type === 2 ? 'DIR' : 'FILE'} ${f.name} ${f.size || ''}`));
        } catch (e) {
            console.log(`  ERROR: ${e.message}`);
        }
    }

    // Check if /domains/educore exists and what's in it
    try {
        console.log("\n=== /domains/educore ===");
        const list = await client.list("/domains/educore");
        list.forEach(f => console.log(`  ${f.type === 2 ? 'DIR' : 'FILE'} ${f.name} ${f.size || ''}`));
    } catch (e) {
        console.log(`  ERROR: ${e.message}`);
    }

    client.close();
}

explore();
