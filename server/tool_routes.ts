import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import axios from 'axios';
import { spawn, spawnSync } from 'child_process';
import si from 'systeminformation';
import { resolveCoderPath } from './utils.js';

const PORT = 3000;

const getLuminaDataDir = () => {
  return process.env.LUMINA_DATA_DIR || path.join(os.homedir(), '.lumina');
};

const extensionFromMime = (mimeType = '') => {
  const clean = mimeType.split(';')[0].trim().toLowerCase();
  if (clean === 'audio/wav' || clean === 'audio/wave' || clean === 'audio/x-wav') return '.wav';
  if (clean === 'audio/mpeg' || clean === 'audio/mp3') return '.mp3';
  if (clean === 'audio/mp4' || clean === 'video/mp4') return '.mp4';
  if (clean === 'audio/flac') return '.flac';
  if (clean === 'audio/ogg' || clean === 'audio/opus') return '.ogg';
  if (clean === 'audio/webm' || clean === 'video/webm') return '.webm';
  return '.webm';
};

const cleanWhisperTranscript = (raw: string) => {
  return String(raw || '')
    .split(/\r?\n/)
    .map(line => line
      .replace(/^\s*\[[^\]]*-->\s*[^\]]*\]\s*/g, '')
      .replace(/^\s*\[[0-9:.]+\s*-->\s*[0-9:.]+\]\s*/g, '')
      .trim())
    .filter(line => {
      if (!line) return false;
      const lower = line.toLowerCase();
      return !lower.includes('[nodejs-whisper]') &&
        !lower.startsWith('whisper_') &&
        !lower.startsWith('system_info:') &&
        !lower.startsWith('main:');
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

type TerminalSession = {
  cwd: string;
  lastAccess: number;
};

const terminalSessions = new Map<string, TerminalSession>();

function getTerminalSession(sessionId?: string): { id: string; session: TerminalSession } {
  if (!sessionId || !terminalSessions.has(sessionId)) {
    const newSession: TerminalSession = {
      cwd: process.cwd(),
      lastAccess: Date.now(),
    };
    const id = sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    terminalSessions.set(id, newSession);
    return { id, session: newSession };
  }
  const session = terminalSessions.get(sessionId)!;
  session.lastAccess = Date.now();
  return { id: sessionId, session };
}

// Clean up stale terminal sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of terminalSessions.entries()) {
    if (now - sess.lastAccess > 60 * 60 * 1000) {
      terminalSessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

// ─── Unix → PowerShell command translation (Windows only) ─────────────────
const PS_CMD_MAP: Record<string, string> = {
  'cat': 'Get-Content', 'cp': 'Copy-Item', 'mv': 'Move-Item',
  'rm': 'Remove-Item', 'grep': 'Select-String', 'which': 'Get-Command',
  'head': 'Select-Object', 'tail': 'Select-Object',
  'wc': 'Measure-Object', 'sort': 'Sort-Object', 'diff': 'Compare-Object',
  'find': 'Where-Object', 'touch': 'New-Item',
  'whoami': 'whoami', 'echo': 'Write-Output',
  'ps': 'Get-Process', 'kill': 'Stop-Process',
  'curl': 'Invoke-WebRequest', 'wget': 'Invoke-WebRequest',
  'date': 'Get-Date', 'alias': 'Get-Alias', 'history': 'Get-History',
  'man': 'Get-Help', 'ping': 'Test-Connection',
};

function firstWordOf(s: string): string {
  return s.split(/\s+/)[0].replace(/["']/g, '').toLowerCase();
}

function translateLs(rest: string): string {
  let target = '';
  let hasForce = false, hasRecurse = false, hasReverse = false;
  let extraPipes = '';
  const parts = rest.match(/\S+/g) || [];
  for (const p of parts) {
    if (p.startsWith('--')) {
      const f = p.slice(2);
      if (f === 'all' || f === 'almost-all') hasForce = true;
      else if (f === 'recursive') hasRecurse = true;
      else if (f === 'reverse') hasReverse = true;
      else target = p;
    } else if (p.startsWith('-') && p.length > 1) {
      for (const ch of p.slice(1)) {
        switch (ch) {
          case 'a': hasForce = true; break;
          case 'R': hasRecurse = true; break;
          case 'r': hasReverse = true; break;
          case 'S': extraPipes = ' | Sort-Object Length -Descending'; break;
          case 't': extraPipes = ' | Sort-Object LastWriteTime -Descending'; break;
        }
      }
    } else {
      target = p;
    }
  }
  let cmd = 'Get-ChildItem';
  if (target) cmd += ` -Path "${target.replace(/"/g, '\\"')}"`;
  if (hasForce) cmd += ' -Force';
  if (hasRecurse) cmd += ' -Recurse';
  cmd += extraPipes || ' | Format-Table -AutoSize';
  return cmd;
}

function translateRm(rest: string): string {
  let target = '';
  let recurse = false, force = false;
  const parts = rest.match(/\S+/g) || [];
  for (const p of parts) {
    if (p.startsWith('-') && p.length > 1) {
      for (const ch of p.slice(1)) {
        if (ch === 'r' || ch === 'R') recurse = true;
        if (ch === 'f') force = true;
      }
    } else {
      target = p;
    }
  }
  if (!target) return 'Remove-Item';
  let cmd = `Remove-Item -Path "${target.replace(/"/g, '\\"')}"`;
  if (recurse) cmd += ' -Recurse';
  if (force) cmd += ' -Force';
  return cmd;
}

function translateCpMv(rest: string, cmd: string): string {
  let src = '', dst = '';
  let recurse = false, force = false;
  const parts = rest.match(/\S+/g) || [];
  for (const p of parts) {
    if (p.startsWith('-') && p.length > 1) {
      for (const ch of p.slice(1)) {
        if (ch === 'r' || ch === 'R') recurse = true;
        if (ch === 'f') force = true;
      }
    } else if (!src) {
      src = p;
    } else {
      dst = p;
    }
  }
  let ps = cmd;
  if (src) ps += ` -Path "${src.replace(/"/g, '\\"')}"`;
  if (dst) ps += ` -Destination "${dst.replace(/"/g, '\\"')}"`;
  if (recurse) ps += ' -Recurse';
  if (force) ps += ' -Force';
  return ps;
}

function translateGrep(rest: string): string {
  const parts = rest.match(/\S+/g) || [];
  const pattern: string[] = [];
  const files: string[] = [];
  let inPattern = false, invert = false, ignoreCase = false;
  for (const p of parts) {
    if (p.startsWith('-') && p.length > 1) {
      for (const ch of p.slice(1)) {
        if (ch === 'i') ignoreCase = true;
        if (ch === 'v') invert = true;
      }
    } else if (!inPattern) {
      pattern.push(p);
      inPattern = true;
    } else {
      files.push(p);
    }
  }
  let ps = `Select-String -Pattern "${pattern.join(' ').replace(/"/g, '\\"')}"`;
  if (files.length > 0) ps += ` -Path "${files.map(f => f.replace(/"/g, '\\"')).join(',')}"`;
  if (ignoreCase) ps += ' -CaseSensitive:$false';
  if (invert) ps += ' -NotMatch';
  return ps;
}

function translateSegment(seg: string): string {
  const t = seg.trim();
  if (!t) return t;
  const fw = firstWordOf(t);
  const rest = t.slice(fw.length).trim();

  switch (fw) {
    case 'ls': return translateLs(rest);
    case 'rm': return translateRm(rest);
    case 'cp': return translateCpMv(rest, 'Copy-Item');
    case 'mv': return translateCpMv(rest, 'Move-Item');
    case 'grep': return translateGrep(rest);
    case 'mkdir': return `New-Item -ItemType Directory -Path "${rest.replace(/"/g, '\\"')}"`;
    case 'touch': return `New-Item -ItemType File -Path "${(rest || '.').replace(/"/g, '\\"')}" -Force`;
    case 'pwd': return 'Get-Location | Select-Object -ExpandProperty Path';
    case 'ps': return 'Get-Process | Format-Table -AutoSize';
    case 'kill': return `Stop-Process ${rest.replace(/^-/, '-Id ')}`;
    case 'which': return `Get-Command ${rest || ''} | Select-Object -ExpandProperty Source`;
    case 'chmod': return 'Write-Output "chmod is not available on Windows"';
    case 'chown': return 'Write-Output "chown is not available on Windows"';
    case 'ifconfig': return 'Get-NetIPConfiguration | Format-Table -AutoSize';
    case 'netstat': return 'Get-NetTCPConnection | Format-Table -AutoSize';
    case 'uname': return rest?.includes('-a') ? '[Environment]::OSVersion | Format-List *' : '[Environment]::OSVersion.OSVersion.Platform';
    case 'head': {
      const n = rest.match(/-n\s+(\d+)/);
      return `Select-Object -First ${n ? n[1] : 10}`;
    }
    case 'tail': {
      const n = rest.match(/-n\s+(\d+)/);
      return `Select-Object -Last ${n ? n[1] : 10}`;
    }
    case 'wc': return 'Measure-Object -Line -Word -Character | Select-Object Lines, Words, Characters';
    case 'clear': return 'Clear-Host';
    case 'exit': return 'exit';
    default: {
      if (PS_CMD_MAP[fw]) {
        return `${PS_CMD_MAP[fw]} ${rest}`;
      }
      return seg;
    }
  }
}

function translateCommand(cmd: string): string {
  return cmd.split(/(\||;)/g).map((part) => {
    if (part === '|' || part === ';') return part;
    return translateSegment(part);
  }).join('');
}

// ─── Scraper removed ──────────────────────────────────────────────

export function setupToolRoutes(app: express.Express) {
  // Speech-to-Text
  app.post("/api/stt/transcribe", async (req, res) => {
    const { audioBase64, mimeType = 'audio/webm', modelName = 'base.en', language } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const audioBuffer = Buffer.from(audioBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (!audioBuffer.length) {
      return res.status(400).json({ error: 'Audio payload is empty' });
    }

    const sttRoot = path.join(getLuminaDataDir(), 'local-stt');
    const audioDir = path.join(sttRoot, 'audio');
    const modelRootPath = path.join(sttRoot, 'models');
    fs.mkdirSync(audioDir, { recursive: true });
    fs.mkdirSync(modelRootPath, { recursive: true });

    const audioPath = path.join(audioDir, `voice-${Date.now()}-${Math.random().toString(36).slice(2)}${extensionFromMime(mimeType)}`);
    fs.writeFileSync(audioPath, audioBuffer);

    try {
      const whisperModule: any = await import('nodejs-whisper');
      const nodewhisper = whisperModule.nodewhisper || whisperModule.default?.nodewhisper;
      if (typeof nodewhisper !== 'function') {
        throw new Error('nodejs-whisper did not expose nodewhisper().');
      }

      const whisperLanguage = typeof language === 'string' && language
        ? language.split('-')[0].toLowerCase()
        : undefined;
      const logs: string[] = [];
      const logger = {
        debug: (...args: any[]) => logs.push(args.map(String).join(' ')),
        log: (...args: any[]) => logs.push(args.map(String).join(' ')),
        error: (...args: any[]) => logs.push(args.map(String).join(' '))
      };

      const rawTranscript = await nodewhisper(audioPath, {
        modelName,
        autoDownloadModelName: modelName,
        modelRootPath,
        removeWavFileAfterTranscription: true,
        withCuda: false,
        logger,
        whisperOptions: {
          language: whisperLanguage,
          outputInText: false,
          outputInSrt: false,
          outputInVtt: false,
          outputInJson: false,
          splitOnWord: true,
          noGpu: true
        }
      });

      try { fs.unlinkSync(audioPath); } catch {}
      res.json({
        success: true,
        transcript: cleanWhisperTranscript(rawTranscript) || rawTranscript.trim(),
        rawTranscript,
        modelName,
        modelRootPath
      });
    } catch (e: any) {
      try { fs.unlinkSync(audioPath); } catch {}
      const detail = e?.message || String(e);
      const ffmpegHint = detail.toLowerCase().includes('ffmpeg')
        ? ' Install FFmpeg and ensure it is available on PATH.'
        : '';
      res.status(500).json({
        error: 'Local transcription failed',
        detail: `${detail}${ffmpegHint}`
      });
    }
  });

  // Terminal Endpoints
  app.get("/api/terminal/session", (req, res) => {
    const workspaceRoot = typeof req.query.workspaceRoot === 'string' && req.query.workspaceRoot.trim()
      ? req.query.workspaceRoot
      : process.cwd();
    const { id, session } = getTerminalSession();
    session.cwd = workspaceRoot;
    res.json({
      sessionId: id,
      cwd: session.cwd,
      currentPath: session.cwd,
      platform: process.platform,
      shell: process.platform === 'win32' ? 'powershell' : 'bash',
      hostname: os.hostname(),
      username: os.userInfo().username,
    });
  });

  app.post("/api/terminal/execute", async (req, res) => {
    let { command, currentPath, sessionId: clientSessionId, workspaceRoot } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ stderr: 'No command provided.' });
    }

    const hostWorkspaceRoot = path.resolve(workspaceRoot || currentPath || process.cwd());
    const { id: sessionId, session } = getTerminalSession(clientSessionId);

    if (currentPath && currentPath !== '.') {
      const resolved = path.resolve(currentPath);
      if (resolved === hostWorkspaceRoot || resolved.startsWith(hostWorkspaceRoot + path.sep)) {
        session.cwd = resolved;
      }
    }
    if (!(session.cwd === hostWorkspaceRoot || session.cwd.startsWith(hostWorkspaceRoot + path.sep))) {
      session.cwd = hostWorkspaceRoot;
    }

    const trimmed = command.trim();
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    const isWin = process.platform === 'win32';
    const translatedCommand = isWin ? translateCommand(trimmed) : trimmed;

    if (['cls', 'clear', 'clear-host'].includes(firstWord)) {
      return res.json({ sessionId, clear: true, stdout: '', stderr: '' });
    }

    if (firstWord === 'cd') {
      const args = trimmed.slice(firstWord.length).trim();
      const nextPath = path.resolve(session.cwd, args || hostWorkspaceRoot);
      if (!(nextPath === hostWorkspaceRoot || nextPath.startsWith(hostWorkspaceRoot + path.sep))) {
        return res.status(403).json({ sessionId, stdout: '', stderr: `Permission denied: terminal is sandboxed to ${hostWorkspaceRoot}\n`, newPath: session.cwd });
      }
      session.cwd = nextPath;
      return res.json({ sessionId, stdout: '', stderr: '', newPath: session.cwd });
    }

    if (firstWord === 'pwd') {
      return res.json({ sessionId, stdout: session.cwd + '\n', stderr: '', newPath: session.cwd });
    }

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      const proc = isWin
        ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', translatedCommand], {
            cwd: session.cwd,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : spawn(translatedCommand, [], {
            cwd: session.cwd,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
          });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      proc.on('close', (code) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
      proc.on('error', (error) => resolve({ stdout: '', stderr: `Execution failed: ${error.message}\n`, exitCode: 1 }));
    });
    return res.json({
      sessionId,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      newPath: session.cwd,
    });
  });

  // Search endpoint (scraper removed - returns stub)
  app.post("/api/search", async (req, res) => {
    res.json({ results: [], provider: "unavailable", message: "Web search has been removed." });
  });

  app.post("/api/image-search", async (req, res) => {
    res.json({ images: [], message: "Image search has been removed." });
  });

  // OS Info
  app.get("/api/os/gpu-info", async (req, res) => {
    try {
      const getGPUDetails = async () => {
        const results: { gpus: any[]; totalDedicatedVRAM_MB: number } = {
          gpus: [],
          totalDedicatedVRAM_MB: 0
        };

        const detectGPUType = (gpu: any) => {
          const model = (gpu.model || "").toLowerCase();
          const vendor = (gpu.vendor || "").toLowerCase();
          if (gpu.vramDynamic) return "Integrated (Shared VRAM)";
          if (model.includes("intel") || vendor.includes("intel")) return "Integrated";
          if (model.includes("radeon") && model.includes("graphics")) return "Integrated (APU)";
          return "Discrete";
        };

        try {
          const graphics = await si.graphics();
          if (graphics && graphics.controllers) {
            for (const gpu of graphics.controllers) {
              results.gpus.push({
                vendor: gpu.vendor,
                model: gpu.model,
                vramMB: gpu.vram,
                vramDynamic: gpu.vramDynamic,
                bus: gpu.bus,
                driverVersion: gpu.driverVersion,
                type: detectGPUType(gpu)
              });
            }
          }
        } catch (e) {
          console.error("si.graphics error:", e);
        }

        try {
          const raw = spawnSync(
            "nvidia-smi",
            ["--query-gpu=name,memory.total,memory.free,memory.used", "--format=csv,noheader,nounits"],
            { timeout: 5000, encoding: "utf8" }
          ).stdout?.trim();

          if (raw) {
            raw.split("\n").forEach((line) => {
              const [name, total, free, used] = line.split(",").map(s => s.trim());
              const existing = results.gpus.find(g =>
                g.model?.toLowerCase().includes(name?.toLowerCase().split(" ")[1])
              );
              const nvidiaData = {
                vendor: "NVIDIA",
                model: name,
                type: "Discrete",
                vramMB: parseInt(total, 10),
                source: "nvidia-smi"
              };
              if (existing) {
                Object.assign(existing, nvidiaData);
              } else {
                results.gpus.push(nvidiaData);
              }
            });
          }
        } catch {}

        results.totalDedicatedVRAM_MB = results.gpus
          .filter(g => g.type === "Discrete")
          .reduce((sum, g) => sum + (g.vramMB || 0), 0);

        return results;
      };

      const details = await getGPUDetails();
      let vramTotalBytes = 8192 * 1024 * 1024; // Default 8GB

      const discreteGPUs = details.gpus.filter(g => g.type === "Discrete" && g.vramMB);
      if (discreteGPUs.length > 0) {
        const bestGPU = discreteGPUs.reduce((prev, current) => {
          const prevVal = prev.vramMB || 0;
          const currVal = current.vramMB || 0;
          return prevVal > currVal ? prev : current;
        });
        vramTotalBytes = bestGPU.vramMB * 1024 * 1024;
      } else {
        const anyGPU = details.gpus.find(g => g.vramMB);
        if (anyGPU) {
          vramTotalBytes = anyGPU.vramMB * 1024 * 1024;
        } else if (process.platform === 'darwin') {
          vramTotalBytes = Math.floor(os.totalmem() * 0.6);
        } else {
          vramTotalBytes = Math.floor(os.totalmem() * 0.4);
        }
      }

      const vramTotalGB = vramTotalBytes / (1024 * 1024 * 1024);
      res.json({
        gpus: details.gpus,
        vramTotalBytes,
        vramTotalGB,
        detected: discreteGPUs.length > 0 || details.gpus.length > 0
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/os/info", (req, res) => {
    res.json({
      platform: process.platform,
      isWindows: process.platform === 'win32',
      isMac: process.platform === 'darwin',
      isLinux: process.platform === 'linux',
      shell: process.platform === 'win32' ? 'powershell' : '/bin/bash',
      hostname: os.hostname(),
    });
  });

  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({
      status: 'ok',
      server: 'Lumina Web UI Server',
    });
  });

  // LSP endpoint
  app.post("/api/lsp/analyze", async (req, res) => {
    const { filePath, workspaceRoot } = req.body;
    if (!filePath) return res.status(400).json({ error: "filePath is required" });

    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    try {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      const ext = path.extname(resolvedPath).toLowerCase();
      const lines = content.split(/\r?\n/);
      
      const imports: string[] = [];
      const symbols: Array<{ type: string; name: string; line: number }> = [];
      const diagnostics: Array<{ severity: 'error' | 'warning' | 'info'; message: string; line: number }> = [];

      lines.forEach((line, index) => {
        const importMatch = line.match(/^\s*(?:import|require)\s+.*?(?:from\s+)?['"](.*?)['"]/);
        if (importMatch) imports.push(importMatch[1]);

        const classMatch = line.match(/^\s*(?:export\s+)?class\s+(\w+)/);
        if (classMatch) symbols.push({ type: 'class', name: classMatch[1], line: index + 1 });

        const funcMatch = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
        if (funcMatch) symbols.push({ type: 'function', name: funcMatch[1], line: index + 1 });

        const arrowMatch = line.match(/^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>/);
        if (arrowMatch) symbols.push({ type: 'arrow-function', name: arrowMatch[1], line: index + 1 });
      });

      const longLines = lines.map((l, i) => ({ line: i + 1, length: l.length })).filter(l => l.length > 200);
      longLines.forEach(ll => diagnostics.push({
        severity: 'warning',
        message: `Line ${ll.line} is ${ll.length} characters long (recommended max: 200)`,
        line: ll.line
      }));
      const tabLines = lines.map((l, i) => ({ line: i + 1, hasTabs: l.includes('\t') })).filter(l => l.hasTabs);
      tabLines.forEach(tl => diagnostics.push({
        severity: 'info',
        message: `Line ${tl.line} contains tab characters (consider using spaces)`,
        line: tl.line
      }));

      res.json({
        success: true,
        fileType: ext,
        lineCount: lines.length,
        imports: [...new Set(imports)],
        symbols,
        diagnostics,
        language: ext.replace('.', '')
      });
    } catch (e: any) {
      res.status(500).json({ error: "LSP analysis failed", detail: e.message });
    }
  });
}
