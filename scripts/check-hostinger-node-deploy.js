const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function check() {
  const errors = [];
  const rootDir = path.resolve(__dirname, '..');
  
  // 1. package.json raíz existe
  const rootPkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(rootPkgPath)) {
    errors.push('package.json raíz no existe');
  } else {
    const rootPkg = require(rootPkgPath);
    
    // 2. script build raíz existe
    if (!rootPkg.scripts || !rootPkg.scripts.build) {
      errors.push('script build raíz no existe');
    }
    
    // 3. script start raíz existe
    if (!rootPkg.scripts || !rootPkg.scripts.start) {
      errors.push('script start raíz no existe');
    }
    
    // 4. script test raíz no contiene exit 1
    if (rootPkg.scripts && rootPkg.scripts.test && rootPkg.scripts.test.includes('exit 1')) {
      errors.push('script test raíz contiene exit 1');
    }
    
    // 8. serve está en dependencies raíz
    if (!rootPkg.dependencies || !rootPkg.dependencies.serve) {
      errors.push('serve no está en dependencies raíz');
    }
  }

  // 5. frontend/package.json existe
  const frontendPkgPath = path.join(rootDir, 'frontend', 'package.json');
  if (!fs.existsSync(frontendPkgPath)) {
    errors.push('frontend/package.json no existe');
  } else {
    const frontendPkg = require(frontendPkgPath);
    
    // 6. frontend build existe
    if (!frontendPkg.scripts || !frontendPkg.scripts.build) {
      errors.push('script build en frontend/package.json no existe');
    }
  }

  // 7. next config tiene output export
  const nextConfigMjsPath = path.join(rootDir, 'frontend', 'next.config.mjs');
  const nextConfigJsPath = path.join(rootDir, 'frontend', 'next.config.js');
  let hasOutputExport = false;
  
  if (fs.existsSync(nextConfigMjsPath)) {
    const content = fs.readFileSync(nextConfigMjsPath, 'utf-8');
    if (content.includes('output: "export"') || content.includes("output: 'export'")) {
      hasOutputExport = true;
    }
  } else if (fs.existsSync(nextConfigJsPath)) {
    const content = fs.readFileSync(nextConfigJsPath, 'utf-8');
    if (content.includes('output: "export"') || content.includes("output: 'export'")) {
      hasOutputExport = true;
    }
  }
  
  if (!hasOutputExport) {
    errors.push('next config no tiene configurado output export');
  }

  if (errors.length > 0) {
    console.error('ERRORES ENCONTRADOS:');
    errors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
  } else {
    console.log('Validación de archivos correcta.');
  }

  console.log('Probando build de frontend...');
  try {
    // 9. npm run build desde raíz genera frontend/out
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    console.log('Build completado.');
    
    // 10. frontend/out/index.html existe
    const outIndex = path.join(rootDir, 'frontend', 'out', 'index.html');
    if (!fs.existsSync(outIndex)) {
      console.error('ERROR: frontend/out/index.html no existe después del build');
      process.exit(1);
    } else {
      console.log('QA SUPERADO: frontend/out/index.html existe.');
    }
  } catch (error) {
    console.error('El build falló:', error.message);
    process.exit(1);
  }
}

check();
