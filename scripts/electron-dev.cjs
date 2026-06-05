const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const electronDir = path.join(__dirname, "..", "node_modules", "electron");
const pathFile = path.join(electronDir, "path.txt");

function getElectronExecutable() {
  const relativeExecutable = fs.readFileSync(pathFile, "utf8").trim();
  return path.join(electronDir, "dist", relativeExecutable);
}

const electronExecutable = getElectronExecutable();
const child = spawn(electronExecutable, ["."], {
  stdio: "inherit",
  windowsHide: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to launch Electron:", error);
  process.exit(1);
});
