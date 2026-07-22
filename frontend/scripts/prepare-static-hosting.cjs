#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const source = path.join(frontendRoot, "htaccess-subdomain-app-root");
const outputDir = path.join(frontendRoot, "out");
const destination = path.join(outputDir, ".htaccess");

if (!fs.existsSync(source)) {
  throw new Error(`Missing static-hosting router: ${source}`);
}
if (!fs.existsSync(outputDir)) {
  throw new Error(`Missing Next.js export directory: ${outputDir}`);
}

fs.copyFileSync(source, destination);
console.log("Static hosting router copied to out/.htaccess");
