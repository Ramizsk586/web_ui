#!/usr/bin/env node
/**
 * Lumina Guest Agent Runtime
 * 
 * Runs inside the sandbox VM.
 * Handles IPC with the host via serial port / named pipe.
 * Executes commands, manages files, forwards preview ports.
 * 
 * This is the ONLY code that executes inside the VM.
 * Everything the host sends goes through this bridge.
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const readline = require('readline');

const VM_ID = process.env.LUMINA_VM_ID || require('os').hostname();
const LUMINA_HOME = '/opt/lumina';
const WORKSPACE = '/workspace';
const LOG_FILE = '/var/log/lumina-guest.log';

const logFile = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(level, message, data) {
  const entry = JSON.stringify({
    timestamp: Date.now(),
    level,
    source: 'lumina-guest',
    vmId: VM_ID,
    message,
    data,
  });
  logFile.write(entry + '\n');
  if (level === 'error') {
    process.stderr.write(entry + '\n');
  }
}

function sendMessage(type, id, payload) {
  const msg = JSON.stringify({ type, id, payload, timestamp: Date.now() }) + '\n';
  process.stdout.write(msg);
}

function receiveMessage(line) {
  try {
    const msg = JSON.parse(line.trim());
    handleMessage(msg);
  } catch (e) {
    log('error', `Failed to parse message: ${e.message}`, { raw: line });
  }
}

async function handleMessage(msg) {
  const { type, id, payload } = msg;

  switch (type) {
    case 'heartbeat':
      sendMessage('heartbeat_ack', id, { timestamp: Date.now(), vmId: VM_ID });
      break;

    case 'exec':
      await handleExec(id, payload);
      break;

    case 'file_read':
      await handleFileRead(id, payload);
      break;

    case 'file_write':
      await handleFileWrite(id, payload);
      break;

    case 'file_list':
      await handleFileList(id, payload);
      break;

    case 'file_delete':
      await handleFileDelete(id, payload);
      break;

    case 'install':
      await handleInstall(id, payload);
      break;

    case 'preview_start':
      await handlePreviewStart(id, payload);
      break;

    case 'preview_stop':
      await handlePreviewStop(id, payload);
      break;

    default:
      sendMessage('error', id, { error: `Unknown message type: ${type}` });
  }
}

async function handleExec(id, payload) {
  const { command, timeout = 120000, cwd = WORKSPACE, env = {} } = payload;

  log('info', `Exec: ${command.substring(0, 200)}`, { cwd });

  const startTime = Date.now();
  let stdout = '';
  let stderr = '';

  try {
    const result = execSync(command, {
      cwd,
      timeout,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, ...env },
    });

    sendMessage('exec_result', id, {
      stdout: result,
      stderr: '',
      exitCode: 0,
      durationMs: Date.now() - startTime,
      vmId: VM_ID,
    });
  } catch (e) {
    const exitCode = e.status || e.code || 1;
    const stdoutStr = typeof e.stdout === 'string' ? e.stdout : '';
    const stderrStr = typeof e.stderr === 'string' ? e.stderr : e.message;

    sendMessage('exec_result', id, {
      stdout: stdoutStr,
      stderr: stderrStr,
      exitCode,
      durationMs: Date.now() - startTime,
      vmId: VM_ID,
      error: e.message,
    });
  }
}

async function handleFileRead(id, payload) {
  const { filePath } = payload;
  try {
    const resolved = resolvePath(filePath);
    const content = fs.readFileSync(resolved, 'utf8');
    sendMessage('file_read_result', id, { content, path: filePath, exists: true });
  } catch (e) {
    sendMessage('file_read_result', id, { error: e.message, path: filePath, exists: false });
  }
}

async function handleFileWrite(id, payload) {
  const { filePath, content } = payload;
  try {
    const resolved = resolvePath(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf8');
    sendMessage('file_write_result', id, { path: filePath, success: true });
  } catch (e) {
    sendMessage('file_write_result', id, { error: e.message, success: false });
  }
}

async function handleFileList(id, payload) {
  const { dirPath = '.' } = payload;
  try {
    const resolved = resolvePath(dirPath);
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      size: entry.isFile() ? fs.statSync(path.join(resolved, entry.name)).size : 0,
    }));
    sendMessage('file_list_result', id, { files, path: dirPath });
  } catch (e) {
    sendMessage('file_list_result', id, { error: e.message });
  }
}

async function handleFileDelete(id, payload) {
  const { filePath, recursive = false } = payload;
  try {
    const resolved = resolvePath(filePath);
    if (recursive) {
      fs.rmSync(resolved, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved);
    }
    sendMessage('file_delete_result', id, { path: filePath, success: true });
  } catch (e) {
    sendMessage('file_delete_result', id, { error: e.message, success: false });
  }
}

async function handleInstall(id, payload) {
  const { packageType, packageName, version } = payload;
  let command;

  switch (packageType) {
    case 'npm':
      command = `npm install ${packageName}${version ? '@' + version : ''}`;
      break;
    case 'pip':
      command = `pip install ${packageName}${version ? '==' + version : ''}`;
      break;
    case 'apk':
      command = `apk add --no-cache ${packageName}`;
      break;
    default:
      sendMessage('install_result', id, { error: `Unknown package type: ${packageType}` });
      return;
  }

  try {
    const result = execSync(command, { encoding: 'utf8', timeout: 300000, cwd: WORKSPACE });
    sendMessage('install_result', id, { output: result, success: true });
  } catch (e) {
    sendMessage('install_result', id, { error: e.message, success: false });
  }
}

const PREVIEW_PROCESSES = new Map();

async function handlePreviewStart(id, payload) {
  const { projectPath, framework = 'vite' } = payload;
  const projectDir = resolvePath(projectPath);

  if (PREVIEW_PROCESSES.has(id)) {
    handlePreviewStop(id, payload);
  }

  let command;
  switch (framework) {
    case 'vite':
      command = 'npx vite --host 0.0.0.0 --port 5173';
      break;
    case 'next':
      command = 'npx next dev --hostname 0.0.0.0 --port 3000';
      break;
    case 'react':
      command = 'npx react-scripts start';
      break;
    case 'static':
      command = `npx serve -l 8080 -s ${projectDir}`;
      break;
    default:
      command = 'npx vite --host 0.0.0.0';
  }

  try {
    const proc = spawn(command, {
      cwd: projectDir,
      shell: '/bin/bash',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none', PORT: '5173' },
    });

    PREVIEW_PROCESSES.set(id, proc);

    proc.stdout.on('data', (data) => {
      log('info', `[preview:${id}] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
      log('info', `[preview:${id}] ${data.toString().trim()}`);
    });

    proc.on('exit', (code) => {
      PREVIEW_PROCESSES.delete(id);
      log('info', `Preview ${id} exited with code ${code}`);
    });

    sendMessage('preview_port', id, {
      port: framework === 'vite' ? 5173 : framework === 'static' ? 8080 : 3000,
      framework,
      projectPath,
      pid: proc.pid,
    });
  } catch (e) {
    sendMessage('error', id, { error: `Failed to start preview: ${e.message}` });
  }
}

async function handlePreviewStop(id, payload) {
  const proc = PREVIEW_PROCESSES.get(id);
  if (proc) {
    try {
      proc.kill('SIGTERM');
    } catch {}
    PREVIEW_PROCESSES.delete(id);
  }
}

function resolvePath(filePath) {
  if (!filePath) return WORKSPACE;
  if (filePath.startsWith('/')) {
    if (filePath.startsWith('/workspace') || filePath.startsWith('/opt/lumina')) {
      return filePath;
    }
    throw new Error(`Access denied: path '${filePath}' is outside allowed directories`);
  }
  return path.join(WORKSPACE, filePath);
}

// Validate environment
function validateEnvironment() {
  const checks = [];

  if (!fs.existsSync(WORKSPACE)) {
    fs.mkdirSync(WORKSPACE, { recursive: true });
  }

  checks.push({ name: 'node', value: process.version });
  try {
    const pyVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
    checks.push({ name: 'python', value: pyVersion });
  } catch {
    checks.push({ name: 'python', value: 'not found' });
  }
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    checks.push({ name: 'git', value: gitVersion });
  } catch {
    checks.push({ name: 'git', value: 'not found' });
  }

  log('info', 'Environment validation', checks);

  // Signal ready to host
  sendMessage('heartbeat_ack', 'boot', {
    status: 'ready',
    vmId: VM_ID,
    nodeVersion: process.version,
    checks,
  });
}

// Main entry point
log('info', `Lumina Guest Runtime starting`, { vmId: VM_ID, pid: process.pid });

validateEnvironment();

// Read from stdin for IPC messages
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', receiveMessage);
rl.on('close', () => {
  log('info', 'IPC stdin closed, shutting down');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down');
  for (const [id, proc] of PREVIEW_PROCESSES) {
    try { proc.kill(); } catch {}
  }
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log('error', 'Uncaught exception', { message: err.message, stack: err.stack });
});
