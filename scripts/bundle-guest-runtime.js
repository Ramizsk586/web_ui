#!/usr/bin/env node
/**
 * Lumina Guest Runtime Bundler
 * 
 * Bundles the guest-side agent runtime into a standalone Node.js script
 * that can be deployed inside the VM image.
 * 
 * The bundled output includes all dependencies inline (no node_modules required).
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'vm', 'guest', 'lumina-guest.js');
const PACKAGE_JSON = path.join(__dirname, '..', 'vm', 'guest', 'package.json');
const OUTPUT = path.join(__dirname, '..', 'vm', 'dist', 'lumina-guest.cjs');
const OUTPUT_DIR = path.dirname(OUTPUT);

function bundle() {
  console.log('=== Lumina Guest Runtime Bundler ===\n');

  if (!fs.existsSync(SOURCE)) {
    console.error(`Error: Source not found: ${SOURCE}`);
    process.exit(1);
  }

  // Read source
  let source = fs.readFileSync(SOURCE, 'utf8');
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

  console.log(`Source: ${SOURCE}`);
  console.log(`Version: ${pkg.version}`);
  console.log(`Lines: ${source.split('\n').length}`);

  // Minimal bundling: wrap with shebang and metadata header
  const banner = `#!/usr/bin/env node
/**
 * Lumina Guest Agent Runtime v${pkg.version}
 * 
 * Bundled: ${new Date().toISOString()}
 * 
 * WARNING: This file runs INSIDE the sandbox VM.
 * It handles ALL communication between the host and VM.
 * Do NOT modify unless you understand the security implications.
 */
`;

  // Write bundled output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, banner + '\n' + source, 'utf8');
  console.log(`\nBundled: ${OUTPUT}}}`);
  console.log(`Size: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
}

bundle();
