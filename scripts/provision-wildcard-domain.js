#!/usr/bin/env node

"use strict";

console.error(
  "ERROR: la provisión wildcard fue retirada. Hostinger hPanel no admite subdominios wildcard de hosting.\n" +
  "Usa un subdominio individual por escuela:\n" +
  "  node scripts/provision-school-domain.js --slug=<slug>\n" +
  "Consulta docs/AUTOMATIC_SCHOOL_SUBDOMAINS.md."
);
process.exit(1);
