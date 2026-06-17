import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const runtimeDir = path.join(projectRoot, "src-tauri", "resources", "runtime");
const nodeTarget = path.join(runtimeDir, "node.exe");

const nodeExecPath = process.execPath;
if (!nodeExecPath || !fs.existsSync(nodeExecPath)) {
  throw new Error("Could not locate the current Node.js executable.");
}

if (process.platform !== "win32") {
  throw new Error("Desktop runtime packaging is currently configured for Windows only.");
}

fs.mkdirSync(runtimeDir, { recursive: true });
fs.copyFileSync(nodeExecPath, nodeTarget);

console.log(`Bundled Node runtime: ${nodeTarget}`);
