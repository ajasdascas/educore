const fs = require('fs');
const path = require('path');

function checkHostingerRootPackage() {
  const rootDir = path.resolve(__dirname, '..');
  const packagePath = path.join(rootDir, 'package.json');
  const errors = [];

  if (!fs.existsSync(packagePath)) {
    console.error('ERROR: package.json no encontrado en la raíz.');
    process.exit(1);
  }

  const pkgContent = fs.readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(pkgContent);

  if (pkgContent.includes('Error: no test specified')) {
    errors.push('El package.json contiene "Error: no test specified".');
  }

  if (pkg.scripts && pkg.scripts.test && pkg.scripts.test.includes('exit 1')) {
    errors.push('El script test contiene "exit 1".');
  }

  if (!pkg.scripts || !pkg.scripts.build) {
    errors.push('Falta el script "build" en la raíz.');
  }

  if (!pkg.scripts || !pkg.scripts.start) {
    errors.push('Falta el script "start" en la raíz.');
  }

  if (!pkg.scripts || !pkg.scripts.test) {
    errors.push('Falta un script "test" seguro en la raíz.');
  }

  const outDir = path.join(rootDir, 'frontend', 'out');
  const outIndex = path.join(outDir, 'index.html');
  if (!fs.existsSync(outIndex)) {
    errors.push('El archivo frontend/out/index.html no se generó o no existe. ¿Ejecutaste npm run build?');
  }

  if (errors.length > 0) {
    console.error('--- FALLÓ LA VALIDACIÓN DE HOSTINGER PACKAGE ---');
    errors.forEach((err, idx) => console.error(`${idx + 1}. ${err}`));
    process.exit(1);
  }

  console.log('✅ Validación completada: El package.json es seguro para Hostinger y el build existe.');
}

checkHostingerRootPackage();
