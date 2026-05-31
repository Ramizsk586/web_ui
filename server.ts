import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import os from 'os';
import 'dotenv/config';
import axios from 'axios';
import { search } from 'duck-duck-scrape';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { spawn, spawnSync, type ChildProcessByStdio, type ChildProcessWithoutNullStreams } from "child_process";
import Tesseract from 'tesseract.js';
import si from 'systeminformation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== "production";

async function startServer() {
  const app = express();
  const PORT = 3000;
  let previewProcess: ChildProcessWithoutNullStreams | null = null;
  let previewUrl = '';
  let previewProxyOrigin = '';
  let previewLogs: string[] = [];
  let activePreviewRoot = process.cwd();

  // Handle JSON and CORS with increased body limits for OCR image payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    res.json({ status: 'ok', server: 'Lumina Web UI Server' });
  });

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
        ? ' Install FFmpeg and ensure it is available on PATH. Windows: scoop install ffmpeg, or download from https://ffmpeg.org/download.html'
        : '';
      res.status(500).json({
        error: 'Local transcription failed',
        detail: `${detail}${ffmpegHint}`,
        prerequisites: {
          ffmpeg: {
            macOS: 'brew install ffmpeg',
            linux: 'sudo apt install ffmpeg',
            windows: 'scoop install ffmpeg or download from https://ffmpeg.org/download.html'
          }
        }
      });
    }
  });

  // ─── Terminal Session Store ────────────────────────────────────────────────────
  const terminalSessions = new Map<string, { cwd: string; lastAccess: number }>();

  function getTerminalSession(sessionId?: string) {
    if (!sessionId || !terminalSessions.has(sessionId)) {
      const newSession = {
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

  const isWindows = process.platform === 'win32';

  function resolveTermPath(currentAbsPath: string, segment: string) {
    if (!segment || segment === '.') return currentAbsPath;
    if (path.isAbsolute(segment)) return segment;
    return path.resolve(currentAbsPath, segment);
  }

  function toTermRelativePath(absPath: string) {
    const rel = path.relative(process.cwd(), absPath);
    return rel === '' ? '.' : rel;
  }

  function handleTermCd(args: string, session: { cwd: string }) {
    let target: string;
    if (!args || args.trim() === '') {
      target = os.homedir();
    } else {
      target = args.trim();
      if (target === '~' || target.startsWith('~/') || target.startsWith('~\\')) {
        target = os.homedir() + target.slice(1);
      }
    }
    const newAbs = resolveTermPath(session.cwd, target);
    try {
      if (!fs.statSync(newAbs).isDirectory()) {
        return { stderr: `cd: not a directory: ${target}`, changed: false };
      }
      session.cwd = newAbs;
      return { newPath: toTermRelativePath(newAbs), changed: true };
    } catch {
      return { stderr: `cd: no such file or directory: ${target}`, changed: false };
    }
  }

  function executeTermCommand(command: string, cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      let shell: string;
      let shellArgs: string[];

      if (isWindows) {
        shell = 'powershell.exe';
        shellArgs = ['-NoProfile', '-NonInteractive', '-Command', command];
      } else {
        shell = '/bin/bash';
        shellArgs = ['-c', command];
      }

      const child = spawn(shell, shellArgs, {
        cwd,
        env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1' },
        timeout: 30000,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      child.on('error', (err) => {
        resolve({ stdout: '', stderr: err.message, exitCode: 1 });
      });

      setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
        resolve({ stdout, stderr: stderr + '\n[Timed out after 30s]', exitCode: 124 });
      }, 30000);
    });
  }

  // GET /api/terminal/session — create or resume a session
  app.get("/api/terminal/session", (req, res) => {
    const { id, session } = getTerminalSession();
    const hostname = os.hostname();
    let username = 'user';
    try { username = os.userInfo().username; } catch {}
    res.json({
      sessionId: id,
      cwd: session.cwd,
      currentPath: toTermRelativePath(session.cwd),
      platform: process.platform,
      shell: isWindows ? 'powershell' : 'bash',
      hostname,
      username,
    });
  });

  // POST /api/terminal/execute — real OS shell command execution with session support
  app.post("/api/terminal/execute", async (req, res) => {
    const { command, currentPath, sessionId: clientSessionId } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ stderr: 'No command provided.' });
    }

    const { id: sessionId, session } = getTerminalSession(clientSessionId);

    if (currentPath && currentPath !== '.') {
      const resolved = resolveTermPath(process.cwd(), currentPath);
      try {
        if (fs.statSync(resolved).isDirectory()) {
          session.cwd = resolved;
        }
      } catch {}
    }

    const trimmed = command.trim();
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();

    // Prevent interactive CLI processes that would hang the background spawn process
    const LOWER_CMD = trimmed.toLowerCase();
    const BLOCKED_CLIS = ['opencode', 'claude', 'poolside', 'cline', 'aider', 'gptengineer', 'gpt-engineer', 'devin'];
    if (BLOCKED_CLIS.some(cli => LOWER_CMD.includes(cli))) {
      return res.status(400).json({
        sessionId,
        stderr: '✖ Command blocked: Interactivity with external AI CLIs (opencode, claude, poolside, cline, etc.) is restricted to prevent terminal session freezes.\n'
      });
    }

    // Built-in: clear/cls
    if (['cls', 'clear', 'clear-host'].includes(firstWord)) {
      return res.json({ sessionId, clear: true, stdout: '', stderr: '' });
    }

    // Built-in: cd
    if (firstWord === 'cd' || firstWord === 'set-location' || firstWord === 'sl') {
      const args = trimmed.slice(firstWord.length).trim();
      const result = handleTermCd(args, session);
      return res.json({
        sessionId,
        stdout: '',
        stderr: result.stderr || '',
        newPath: result.newPath !== undefined ? result.newPath : toTermRelativePath(session.cwd),
      });
    }

    // Built-in: pwd
    if (firstWord === 'pwd' || firstWord === 'get-location' || firstWord === 'gl') {
      return res.json({ sessionId, stdout: session.cwd + '\n', stderr: '', newPath: toTermRelativePath(session.cwd) });
    }

    // Execute via real shell spawn
    try {
      const result = await executeTermCommand(trimmed, session.cwd);

      try { fs.statSync(session.cwd); } catch { session.cwd = process.cwd(); }

      return res.json({
        sessionId,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        newPath: toTermRelativePath(session.cwd),
      });
    } catch (err: any) {
      return res.status(500).json({ sessionId, stderr: `Server error: ${err.message}`, stdout: '' });
    }
  });

  // Live Compiler/Transpiler Sandbox Interceptor for React / JSX / TSX and JS
  app.get('/coder-preview/*', (req, res, next) => {
    const subpath = (req.params as Record<string, string>)['0'] || '';
    if (!subpath) {
      return next();
    }
    const targetFilePath = path.resolve(activePreviewRoot, subpath);
    if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
      const ext = path.extname(targetFilePath).toLowerCase();
      if (ext === '.jsx' || ext === '.tsx' || ext === '.js') {
        try {
          const fileContent = fs.readFileSync(targetFilePath, 'utf8');
          // Escape single/double quotes, code blocks, etc. for JS template literals
          const escapedContent = fileContent
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\${/g, '\\${');

          const wrappedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lumina Sandbox: ${path.basename(subpath)}</title>
  
  <!-- CSS styled overlay -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <!-- Umd standard files -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <style>
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0b0c10;
      color: #f3f4f6;
    }
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0f1115;
    }
    ::-webkit-scrollbar-thumb {
      background: #252833;
      border-radius: 4px;
    }
    #root {
      min-height: calc(100vh - 40px);
    }
  </style>
  <script>
    window.process = { env: { NODE_ENV: 'development' } };
  </script>
</head>
<body class="bg-[#0b0c10] text-[#f3f4f6] min-h-screen flex flex-col">

  <!-- Top status header -->
  <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-850 bg-[#0f1115] select-none text-xs text-zinc-400 h-10">
    <div class="flex items-center gap-2">
      <span class="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
      <span class="font-mono text-zinc-300 font-medium">Lumina Transpiler Engine</span>
      <span class="text-zinc-700">|</span>
      <span class="font-semibold text-teal-400 font-mono">${path.basename(subpath)}</span>
    </div>
    <div class="flex items-center gap-3 font-mono text-[10px]">
      <span class="text-zinc-500">TYPE: <strong class="text-[#D97756]">${ext.toUpperCase().slice(1)}</strong></span>
      <span>•</span>
      <span class="text-zinc-500">SANDBOX: <strong class="text-emerald-500">React 18</strong></span>
    </div>
  </div>

  <!-- Sandbox UI Container -->
  <div id="root" class="flex-1 p-6"></div>

  <!-- Error Boundary Overlay -->
  <div id="error-boundary-overlay" class="hidden fixed bottom-6 right-6 max-w-xl p-5 bg-rose-950/95 border border-rose-500 rounded-xl shadow-2xl backdrop-blur-md z-50 animate-fade-in">
    <div class="flex items-start gap-4">
      <div class="p-1 px-2 rounded bg-rose-800 text-white font-mono text-[10px] select-none uppercase font-bold tracking-wider">Compile / Runtime Error</div>
      <div class="flex-1">
        <h4 class="text-sm font-semibold text-rose-200">Execution Stacktrace</h4>
        <pre class="mt-2.5 text-xs font-mono text-rose-300 whitespace-pre-wrap max-h-56 overflow-y-auto bg-stone-950/80 p-3 rounded border border-rose-900/50" id="error-message"></pre>
      </div>
    </div>
  </div>

  <script type="text/babel" data-presets="react,typescript">
    function reportError(err) {
      console.error("Sandbox component error:", err);
      const overlay = document.getElementById('error-boundary-overlay');
      const msg = document.getElementById('error-message');
      if (overlay && msg) {
        msg.textContent = err.stack || err.message || String(err);
        overlay.classList.remove('hidden');
      }
    }

    try {
      let userCode = \`${escapedContent}\`;
      
      // Stand-in export transformation
      userCode = userCode.replace(/export\\s+default\\s+/g, 'const DefaultExportComponent = ');
      userCode = userCode.replace(/export\\s+const\\s+/g, 'const ');
      userCode = userCode.replace(/export\\s+function\\s+/g, 'function ');
      
      // Comment standard NPM imports that are not supported in basic browser UMD imports env
      userCode = userCode.replace(/import\\s+.*?\\s+from\\s+['"].*?['"]/g, match => '// ' + match);

      const { useState, useEffect, useMemo, useCallback, useRef } = React;
      
      const evalWrapper = new Function('React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'lucide', \`
        \${userCode}
        return typeof DefaultExportComponent !== 'undefined' ? DefaultExportComponent : (typeof App !== 'undefined' ? App : null);
      \`);

      const TargetComponent = evalWrapper(React, useState, useEffect, useMemo, useCallback, useRef, window.lucide);

      if (TargetComponent) {
        const rootElement = document.getElementById('root');
        const root = ReactDOM.createRoot(rootElement);
        root.render(<TargetComponent />);
        
        setTimeout(() => {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }, 300);
      } else {
        // Vanilla fallback loop
        const runModule = new Function('React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'lucide', userCode);
        runModule(React, useState, useEffect, useMemo, useCallback, useRef, window.lucide);
      }
    } catch (compileErr) {
      reportError(compileErr);
    }
  <\/script>
</body>
</html>`;
          res.setHeader('Content-Type', 'text/html;charset=utf-8');
          return res.send(wrappedHtml);
        } catch (err: any) {
          return res.status(500).send(`Transpiler error: ${err.message}`);
        }
      }
    }
    next();
  });
  app.use('/coder-preview', (req, res, next) => {
    express.static(activePreviewRoot)(req, res, next);
  });

  // Search endpoint
  app.post("/api/search", async (req, res) => {
    const { query, tavilyKey, serpKey, provider: preferredProvider } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    let results: any[] = [];
    let provider = "duckduckgo";

    try {
      const tryTavily = async () => {
        if (!tavilyKey) return;
        try {
          const response = await axios.post('https://api.tavily.com/search', {
            api_key: tavilyKey,
            query: query,
            search_depth: "advanced",
            include_answer: true,
            include_raw_content: false
          });
          if (response.data && response.data.results) {
            results = response.data.results.map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.content
            }));
            provider = "tavily";
          }
        } catch (e) {
          console.log("Tavily failed, falling back...");
        }
      };

      const trySerpApi = async () => {
        if (!serpKey) return;
        try {
          const response = await axios.post('https://google.serper.dev/search', { q: query }, {
            headers: { 'X-API-KEY': serpKey, 'Content-Type': 'application/json' }
          });
          if (response.data && response.data.organic) {
            results = response.data.organic.map((r: any) => ({
              title: r.title,
              url: r.link,
              snippet: r.snippet
            }));
            provider = "serper";
          }
        } catch (e) {
          console.log("SerpApi failed, falling back...");
        }
      };

      const tryDdg = async () => {
        try {
          const ddgResults = await search(query, {
            region: 'wt-wt',
            safeSearch: -1,
            time: 'y',
            offset: 0
          });

          let enrichedResults: any[] = [];
          for (const result of ddgResults.results.slice(0, 10)) {
            enrichedResults.push({
              title: result.title,
              url: result.url,
              snippet: result.description
            });
          }

          if (ddgResults.related && ddgResults.related.length > 0) {
            const relatedTopics = ddgResults.related.map((t) => ({
              title: t.text,
              url: '',
              snippet: t.text
            }));
            enrichedResults = [...enrichedResults, ...relatedTopics];
          }

          results = enrichedResults;
          provider = "duckduckgo";
        } catch (e) {
          console.error("DuckDuckGo search failed:", e);
        }
      };

      // Try the preferred provider first, then fallback to the other, then DDG
      if (preferredProvider === 'serpapi') {
        await trySerpApi();
        if (results.length === 0) await tryTavily();
      } else {
        await tryTavily();
        if (results.length === 0) await trySerpApi();
      }
      if (results.length === 0) await tryDdg();

      res.json({ results, provider });
    } catch (error: any) {
      console.error("Search API Error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/image-search", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const { searchImages } = await import('duck-duck-scrape');
      const results = await searchImages(query);
      
      const formattedResults = results.results.slice(0, 10).map((img: any) => ({
        title: img.title,
        url: img.image,
        source: img.source,
        thumbnail: img.thumbnail
      }));

      res.json({ results: formattedResults });
    } catch (error: any) {
      console.error("Image Search API Error:", error);
      res.status(500).json({ error: "Image search failed" });
    }
  });

  // Helper: Respect robots.txt (Warn user but allow proceeding)
  const checkRobotsTxt = async (targetUrl: string): Promise<{ allowed: boolean; warning?: string }> => {
    try {
      const parsed = new URL(targetUrl);
      const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
      const response = await axios.get(robotsUrl, { 
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (response.status === 200 && typeof response.data === 'string') {
        const lines = response.data.split('\n');
        let inWildcardAgent = false;
        const pathToCheck = parsed.pathname + parsed.search;
        
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.toLowerCase().startsWith('user-agent:')) {
            const agent = line.split(':')[1]?.trim() || '';
            inWildcardAgent = (agent === '*');
          }
          if (inWildcardAgent && line.toLowerCase().startsWith('disallow:')) {
            const rule = line.split(':')[1]?.trim() || '';
            if (rule && pathToCheck.startsWith(rule)) {
              return { 
                allowed: false, 
                warning: `Robots.txt on ${parsed.host} disallows crawling paths matching "${rule}". Proceeded via user override.` 
              };
            }
          }
        }
      }
    } catch (e) {
      // Ignore robots.txt fetch errors, assume allowed
    }
    return { allowed: true };
  };

  // Node.js based OCR system utilizing Tesseract
  app.post("/api/ocr", async (req, res) => {
    const { image } = req.body; // base64 formatted data string or image URL
    if (!image) {
      return res.status(400).json({ error: "Image data (base64 or URL) is required" });
    }

    try {
      let imageInput: Buffer | string = image;
      
      // If base64 data URL, extract the raw base64 and create a buffer
      if (typeof image === 'string' && image.startsWith('data:image')) {
        const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const base64Data = matches[2];
          imageInput = Buffer.from(base64Data, 'base64');
        } else {
          const base64Data = image.split(',')[1];
          if (base64Data) {
            imageInput = Buffer.from(base64Data, 'base64');
          }
        }
      } else if (typeof image === 'string' && image.startsWith('data:')) {
        const base64Data = image.split(',')[1];
        if (base64Data) {
          imageInput = Buffer.from(base64Data, 'base64');
        }
      }

      console.log(`[OCR SERVER] Running Tesseract character recognition...`);
      const result = (await Tesseract.recognize(
        imageInput,
        'eng',
        {
          logger: m => {
            // progress tracking logs if necessary in development
          }
        }
      ) as any);

      const text = result?.data?.text || '';
      const confidence = result?.data?.confidence || 0;
      
      console.log(`[OCR SERVER] Processed successfully. Confidence: ${confidence}%. Text length: ${text.length}`);

      res.json({
        success: true,
        text,
        confidence,
        words: result?.data?.words?.map((w: any) => ({
          text: w.text,
          confidence: w.confidence,
          bbox: w.bbox
        })) || []
      });
    } catch (error: any) {
      console.error("[OCR SERVER] Error during OCR parsing:", error);
      res.status(500).json({
        error: "Failed to perform OCR on the provided image.",
        details: error?.message || String(error)
      });
    }
  });

  // Web Scraping API proxy endpoint
  app.post("/api/scrape", async (req, res) => {
    const { url, selectors, extractLinks, extractTables, outputFormat, usePuppeteer } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are supported.' });
      }

      // Allowlist/Denylist to block malicious/internal addresses
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('169.254.') ||
        hostname.endsWith('.local')
      ) {
        return res.status(403).json({ error: 'Security Exception: Requests to local or private IP spaces are forbidden.' });
      }

      // Input sanitization: reject dangerous selector patterns
      if (selectors && typeof selectors === 'object') {
        for (const [key, val] of Object.entries(selectors)) {
          if (typeof val === 'string' && (val.includes('<script') || val.toLowerCase().includes('javascript:'))) {
            return res.status(400).json({ error: `Security Exception: Suspicious text in selector "${key}".` });
          }
        }
      }

      // Check robots.txt
      const robotsCheck = await checkRobotsTxt(url);

      // Rotate list of high-quality User-Agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
      ];
      const randomAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

      const headers = {
        'User-Agent': randomAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      };

      // Implement exponential backoff for rate limits 429, up to 3 retries
      let response: any = null;
      let delay = 1000;
      const maxRetries = 3;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          response = await axios.get(url, {
            timeout: 10000,
            headers,
            maxRedirects: 5,
            responseType: 'arraybuffer' // handle binary/size limits reliably
          });
          break; // success
        } catch (err: any) {
          const status = err.response?.status;
          if (status === 429 && attempt < maxRetries) {
            console.warn(`Scraping rate limited (429) on ${url}. Attempting retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
          } else {
            // Unrecoverable or exceeded retries
            if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
              return res.status(504).json({ error: 'Timeout after 10s. The target webpage failed to respond within the timeframe.' });
            }
            if (err.code === 'ECONNREFUSED') {
              return res.status(502).json({ error: 'Could not reach the target URL. Connection refused.' });
            }
            if (status === 403) {
              return res.status(403).json({ error: 'Access Denied: Site blocked scraping (403 Forbidden).' });
            }
            if (status === 401) {
              return res.status(401).json({ error: 'Authorization Error: Page requires log-in/credentials (401 Unauthorized).' });
            }
            return res.status(status || 500).json({ error: err.message || 'Failed to fetch webpage contents.' });
          }
        }
      }

      if (!response || !response.data) {
        return res.status(500).json({ error: 'Empty response returned from the target webpage.' });
      }

      // Cap response size at 5MB as per security guidelines
      const byteLength = response.data.length;
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      let rawData = response.data;
      if (byteLength > maxSizeBytes) {
        // Truncate to first 100KB representation to be safe, notify user
        rawData = rawData.slice(0, 100 * 1024);
      }

      const rawHtml = rawData.toString('utf8');
      const $ = cheerio.load(rawHtml);

      // Extract video sources!
      const foundVideos: Array<{ title: string; url: string; type: 'youtube' | 'vimeo' | 'direct' | 'other' }> = [];
      
      // Look at iframe sources (for YouTube, Vimeo, embeds/etc.)
      $('iframe').each((_, el) => {
        const srcAttr = $(el).attr('src');
        const titleAttr = $(el).attr('title') || 'Embedded Video';
        if (srcAttr) {
          try {
            const absSrc = new URL(srcAttr, url).href;
            if (absSrc.includes('youtube.com/') || absSrc.includes('youtu.be/') || absSrc.includes('youtube-nocookie.com/')) {
              foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'youtube' });
            } else if (absSrc.includes('vimeo.com/')) {
              foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'vimeo' });
            } else if (absSrc.endsWith('.mp4') || absSrc.endsWith('.webm') || absSrc.endsWith('.ogg')) {
              foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'direct' });
            } else if (absSrc.includes('/embed/')) {
              foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'other' });
            }
          } catch {}
        }
      });

      // Look at HTML5 video tags
      $('video').each((_, el) => {
        // Source tags inside video
        $(el).find('source').each((_, srcEl) => {
          const src = $(srcEl).attr('src');
          if (src) {
            try {
              const absSrc = new URL(src, url).href;
              foundVideos.push({ title: $(el).attr('title') || 'HTML5 Video Source', url: absSrc, type: 'direct' });
            } catch {}
          }
        });
        
        // Src attribute directly on video element
        const srcAttr = $(el).attr('src');
        if (srcAttr) {
          try {
            const absSrc = new URL(srcAttr, url).href;
            foundVideos.push({ title: $(el).attr('title') || 'HTML5 Video Direct', url: absSrc, type: 'direct' });
          } catch {}
        }
      });

      // Add a scan for links that look like videos
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const anchorText = $(el).text().trim() || 'Video Link';
        if (href) {
          try {
            const absHref = new URL(href, url).href;
            if (absHref.endsWith('.mp4') || absHref.endsWith('.webm') || absHref.endsWith('.ogg')) {
              foundVideos.push({ title: anchorText, url: absHref, type: 'direct' });
            } else if (absHref.includes('youtube.com/watch') || absHref.includes('youtu.be/')) {
              foundVideos.push({ title: anchorText, url: absHref, type: 'youtube' });
            } else if (absHref.includes('vimeo.com/') && !isNaN(Number(absHref.split('/').pop()))) {
              foundVideos.push({ title: anchorText, url: absHref, type: 'vimeo' });
            }
          } catch {}
        }
      });

      // Deduplicate elements by url to avoid repeating the exact same asset
      const seenUrl = new Set<string>();
      const dedupedVideos = foundVideos.filter(item => {
        if (seenUrl.has(item.url)) return false;
        seenUrl.add(item.url);
        return true;
      });

      // Clean script, style, noscript, etc. elements
      $('script, style, noscript, iframe, link, svg, video, audio').remove();

      // Resolve title
      const extractedTitle = $('title').text().trim() || $('h1').first().text().trim() || parsedUrl.hostname;

      const result: any = {
        url,
        title: extractedTitle,
        statusCode: response.status,
        scrapedAt: new Date().toISOString(),
        data: {},
        links: [],
        images: [],
        tables: [],
        videos: dedupedVideos.slice(0, 30)
      };

      if (robotsCheck.warning) {
        result.robotsWarning = robotsCheck.warning;
      }

      // Handle custom selectors extraction
      if (selectors && typeof selectors === 'object') {
        const customData: Record<string, any> = {};
        for (const [key, selector] of Object.entries(selectors)) {
          if (typeof selector === 'string') {
            const matches: string[] = [];
            $(selector).each((_, el) => {
              const textVal = $(el).text().trim();
              if (textVal) matches.push(textVal);
            });
            customData[key] = matches.length === 1 ? matches[0] : matches;
          }
        }
        result.data = customData;
      } else {
        // Standard high-quality parsing of headings and paragraph structures
        const headings: Array<{ level: string; text: string }> = [];
        $('h1, h2, h3, h4').each((_, el) => {
          const txt = $(el).text().trim();
          if (txt) {
            headings.push({
              level: el.tagName.toLowerCase(),
              text: txt
            });
          }
        });

        const paragraphs: string[] = [];
        $('p').each((_, el) => {
          const txt = $(el).text().trim();
          if (txt && txt.length > 30) {
            paragraphs.push(txt);
          }
        });

        result.data = {
          headings: headings.slice(0, 30),
          paragraphs: paragraphs.slice(0, 50),
          metaDescription: $('meta[name="description"]').attr('content') || ''
        };
      }

      // Extract links absolute resolved (truncated to 500 items max)
      if (extractLinks) {
        const foundLinks: Set<string> = new Set();
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              const absUrl = new URL(href, url).href;
              // Avoid self-references or hash-only links
              if (absUrl !== url && !absUrl.includes('#')) {
                foundLinks.add(absUrl);
              }
            } catch (e) {
              // Ignore invalid url structures
            }
          }
        });
        result.links = Array.from(foundLinks).slice(0, 500);
      }

      // Extract images matching absolute urls
      const foundImages: Set<string> = new Set();
      $('img[src]').each((_, el) => {
        const srcAttr = $(el).attr('src');
        if (srcAttr) {
          try {
            const absSrc = new URL(srcAttr, url).href;
            foundImages.add(absSrc);
          } catch {}
        }
      });
      result.images = Array.from(foundImages).slice(0, 50);

      // Extract tables as dual strings
      if (extractTables) {
        const resolvedTables: Array<string[][]> = [];
        $('table').each((_, tableEl) => {
          const currentTable: string[][] = [];
          $(tableEl).find('tr').each((_, rowEl) => {
            const rowData: string[] = [];
            $(rowEl).find('td, th').each((_, cellEl) => {
              rowData.push($(cellEl).text().trim().replace(/\s+/g, ' '));
            });
            if (rowData.length > 0) {
              currentTable.push(rowData);
            }
          });
          if (currentTable.length > 0) {
            resolvedTables.push(currentTable);
          }
        });
        result.tables = resolvedTables.slice(0, 5); // limit to first 5 tables to avoid size blowouts
      }

      // Convert body elements to standard markdown representations
      try {
        const turndownOptions = {
          headingStyle: 'atx' as const,
          codeBlockStyle: 'fenced' as const,
          bulletListMarker: '-' as const
        };
        const turndownService = new TurndownService(turndownOptions);
        
        // Add rule to exclude unwanted output
        turndownService.keep(['table']); // let markdown keep tables intact or render them beautifully

        // Convert the clean HTML body to markdown
        const bodyContent = $('body').html();
        if (bodyContent) {
          let convertedMarkdown = turndownService.turndown(bodyContent);
          // Limit or truncate rawText to 50,000 characters
          if (convertedMarkdown.length > 50000) {
            convertedMarkdown = convertedMarkdown.slice(0, 50000) + '\n\n... [Content Truncated due to size limit of 50K chars] ...';
          }
          result.rawText = convertedMarkdown;
        }
      } catch (errMarkdown) {
        console.error('Turndown translation failure:', errMarkdown);
        result.rawText = $('body').text().slice(0, 50000);
      }

      // If the outputFormat is specified as markdown or HTML, set it
      if (outputFormat === 'markdown') {
        result.formattedOutput = result.rawText;
      } else if (outputFormat === 'html') {
        result.formattedOutput = $.html();
      } else {
        result.formattedOutput = JSON.stringify(result.data, null, 2);
      }

      res.json(result);

    } catch (e: any) {
      console.error('Operational error on server scrap request:', e);
      res.status(500).json({ error: `Server Scraping Failure: ${e.message}` });
    }
  });

  // Llama Bridge proxy endpoints
  app.get("/api/bridge/health", async (req, res) => {
    const bridgeUrl = req.headers['x-bridge-url'] as string || 'http://localhost:8089';
    const apiKey = req.headers['x-api-key'] as string || '';
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await axios.get(`${bridgeUrl}/health`, { headers, timeout: 5000 });
      res.json(response.data);
    } catch (e: any) {
      res.status(502).json({ error: 'Could not reach Llama Bridge', detail: e.message });
    }
  });

  // Proxy: list tools from Llama Bridge
  app.post("/api/bridge/tools", async (req, res) => {
    const { bridgeUrl, apiKey, model } = req.body;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      
      // Send a probe request to let the bridge return its available tools
      const response = await axios.post(
        `${bridgeUrl}/v1/chat/completions`,
        {
          model: model || 'auto',
          messages: [{ role: 'user', content: '__tools_probe__' }],
          max_tokens: 1,
          _probe_tools: true
        },
        { headers, timeout: 8000 }
      );
      
      // Extract tool definitions from the response
      const tools = response.data?.tools || [];
      res.json({ tools, connected: true });
    } catch (e: any) {
      // Fallback: try direct tool listing
      try {
        const response = await axios.get(`${bridgeUrl}/v1/tools`, { timeout: 5000 });
        res.json({ tools: response.data?.tools || response.data?.data || [], connected: true });
      } catch (e2: any) {
        res.status(502).json({ error: 'Could not reach Llama Bridge', detail: e.message });
      }
    }
  });

  // Proxy: list models from Llama Bridge
  app.get("/api/bridge/models", async (req, res) => {
    const bridgeUrl = req.headers['x-bridge-url'] as string || 'http://localhost:8089';
    const apiKey = req.headers['x-api-key'] as string || '';
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await axios.get(`${bridgeUrl}/v1/models`, { headers, timeout: 5000 });
      res.json(response.data);
    } catch (e: any) {
      res.status(502).json({ error: 'Could not fetch models', detail: e.message });
    }
  });

  // Universal model listing proxy: fetch models from any OpenAI-compatible endpoint server-side to avoid CORS
  app.post("/api/provider/models", async (req, res) => {
    const { endpoint, apiKey } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }
    try {
      const url = endpoint.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      // Most OpenAI-compatible endpoints expose /models or /v1/models
      let models: any[] = [];
      let triedPaths: string[] = [];

      const tryFetch = async (path: string): Promise<boolean> => {
        triedPaths.push(path);
        try {
          const response = await axios.get(path, { headers, timeout: 10000 });
          if (response.status === 200) {
            const data = response.data;
            const list = data.data || data.models || [];
            if (Array.isArray(list) && list.length > 0) {
              models = list.map((m: any) => ({
                id: m.id,
                name: m.display_name || m.name || m.id,
              }));
              return true;
            }
          }
        } catch {}
        return false;
      };

      // Try multiple common paths: /models, /v1/models, /api/models
      const pathsToTry = [
        `${url}/models`,
        `${url}/v1/models`,
        `${url}/api/models`,
      ];

      for (const path of pathsToTry) {
        if (await tryFetch(path)) break;
        await new Promise(r => setTimeout(r, 300));
      }

      if (models.length > 0) {
        res.json({ success: true, models });
      } else {
        // If all paths failed, try the health endpoint to at least verify connectivity
        const healthPaths = [`${url}/health`, `${url}/v1/health`, `${url}/api/health`];
        let reached = false;
        for (const hp of healthPaths) {
          try {
            const hr = await axios.get(hp, { headers, timeout: 5000 });
            if (hr.status === 200) { reached = true; break; }
          } catch {}
        }
        if (reached) {
          res.json({ success: true, models: [], message: 'Connected but no models endpoint found. Enter model name manually.' });
        } else {
          res.status(502).json({ error: 'Could not reach provider endpoint', triedPaths });
        }
      }
    } catch (e: any) {
      res.status(502).json({ error: 'Provider request failed', detail: e.message });
    }
  });

  // Universal verification proxy: checks if an endpoint responds with valid auth
  app.post("/api/provider/verify", async (req, res) => {
    const { endpoint, apiKey, provider: providerType } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }
    try {
      const url = endpoint.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      const isOpenCode = providerType === 'opencode' || url.includes('opencode.ai');
      if (apiKey) {
        if (isOpenCode) {
          headers['x-api-key'] = apiKey;
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      // Try fetching models to verify connectivity + auth
      const pathsToTry = [
        `${url}/models`,
        `${url}/v1/models`,
        `${url}/api/models`,
      ];

      let verified = false;
      let responseData: any = null;
      for (const path of pathsToTry) {
        try {
          const response = await axios.get(path, { headers, timeout: 10000 });
          if (response.status === 200) {
            verified = true;
            responseData = response.data;
            break;
          }
        } catch {}
      }

      // If models paths fail, try health
      if (!verified) {
        const healthPaths = [`${url}/health`, `${url}/v1/health`, `${url}/api/health`];
        for (const hp of healthPaths) {
          try {
            const hr = await axios.get(hp, { headers, timeout: 5000 });
            if (hr.status === 200) { verified = true; break; }
          } catch {}
        }
      }

      if (verified) {
        res.json({ success: true, message: 'Connection verified', data: responseData });
      } else {
        res.status(502).json({ error: 'Could not verify connection', message: 'Endpoint is unreachable or API key is invalid' });
      }
    } catch (e: any) {
      res.status(502).json({ error: 'Verification failed', detail: e.message });
    }
  });

  // Search API key verification proxy
  app.post("/api/provider/verify-search", async (req, res) => {
    const { provider: searchProvider, apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }
    try {
      if (searchProvider === 'serpapi') {
        const response = await axios.post('https://google.serper.dev/search', { q: 'test', num: 1 }, {
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          timeout: 10000
        });
        if (response.status === 200) {
          return res.json({ success: true, message: 'SerpAPI key verified' });
        }
      } else {
        // Tavily
        const response = await axios.post('https://api.tavily.com/search', {
          api_key: apiKey,
          query: 'test',
          search_depth: 'basic',
          include_answer: false,
          include_raw_content: false,
          max_results: 1
        }, { timeout: 10000 });
        if (response.status === 200) {
          return res.json({ success: true, message: 'Tavily key verified' });
        }
      }
      res.status(502).json({ error: 'Verification failed', message: 'API key is invalid' });
    } catch (e: any) {
      res.status(502).json({ error: 'Verification failed', detail: e.message });
    }
  });

  // Proxy: chat completions to Llama Bridge
  app.post("/api/bridge/chat", async (req, res) => {
    const { bridgeUrl, apiKey, model, messages, tools, stream } = req.body;
    if (!bridgeUrl || !messages) {
      return res.status(400).json({ error: "bridgeUrl and messages are required" });
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const body: Record<string, any> = { model, messages, stream: !!stream };
      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }
      let response;
      try {
        response = await axios.post(`${bridgeUrl}/v1/chat/completions`, body, { headers, timeout: 30000 });
      } catch (toolChoiceError: any) {
        const upstreamDetail = JSON.stringify(toolChoiceError.response?.data || '').toLowerCase();
        const canRetryWithoutToolChoice = body.tool_choice && (
          upstreamDetail.includes('tool_choice') ||
          upstreamDetail.includes('unsupported') ||
          upstreamDetail.includes('extra_forbidden') ||
          upstreamDetail.includes('unrecognized')
        );
        if (!canRetryWithoutToolChoice) throw toolChoiceError;

        const retryBody = { ...body };
        delete retryBody.tool_choice;
        response = await axios.post(`${bridgeUrl}/v1/chat/completions`, retryBody, { headers, timeout: 30000 });
      }
      res.json(response.data);
    } catch (e: any) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      res.status(502).json({ error: 'Bridge chat failed', detail });
    }
  });

  // Proxy: connect to a remote MCP server
  app.post("/api/mcp/connect", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });
    
    try {
      // Try standard MCP tool listing endpoint (JSON-RPC over HTTP)
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }, { 
        timeout: 8000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const tools = response.data?.result?.tools || [];
      res.json({ tools, connected: true });
    } catch (e: any) {
      res.status(502).json({ error: 'Could not connect to MCP server', detail: e.message });
    }
  });

  // Helper to list files recursively
  function getFilesRecursively(dir: string, baseDir: string = dir): any[] {
    let results: any[] = [];
    try {
      if (!fs.existsSync(dir)) return [];
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of list) {
        const name = file.name;
        // Skip common dependency folders, builds, and dot folders
        if (
          name === 'node_modules' || 
          name === '.git' || 
          name === 'dist' || 
          name === '.next' || 
          name === 'dist-electron' ||
          name === '.svelte-kit' ||
          name === '.github' ||
          name === 'package-lock.json' ||
          name === 'yarn.lock' ||
          name === 'pnpm-lock.yaml'
        ) {
          continue;
        }
        const fullPath = path.join(dir, name);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        const isDirectory = file.isDirectory();
        
        results.push({
          name,
          path: fullPath.replace(/\\/g, '/'),
          relativePath,
          isDirectory,
        });

        if (isDirectory) {
          results = results.concat(getFilesRecursively(fullPath, baseDir));
        }
      }
    } catch (error) {
      console.error(`Error scanning directory: ${dir}`, error);
    }
    return results;
  }

  const resolveCoderPath = (inputPath?: string, workspaceRoot?: string) => {
    const raw = (inputPath || '').trim();
    const base = workspaceRoot || process.cwd();
    if (!raw || raw === '.') {
      return path.resolve(base);
    }
    const normalized = raw.replace(/\\/g, '/');
    const isAbsolute = path.isAbsolute(raw) || /^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith('\\\\');
    if (isAbsolute) {
      return path.resolve(raw);
    }
    const withoutDot = normalized.replace(/^\.\/+/, '').replace(/^\/+/, '');
    return path.resolve(base, withoutDot);
  };

  const fileExists = (filePath: string) => fs.existsSync(filePath);

  const readJsonFile = (filePath: string) => {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return null;
    }
  };

  // Filesystem Listing Endpoints
  app.post("/api/fs/list", (req, res) => {
    const { folderPath, workspaceRoot } = req.body;
    
    const resolvedPath = resolveCoderPath(folderPath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "Directory not found" });
    }
    
    const files = getFilesRecursively(resolvedPath);
    res.json({ files, rootPath: resolvedPath.replace(/\\/g, '/') });
  });

  app.post("/api/fs/read", (req, res) => {
    const { filePath, workspaceRoot, offset, limit } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found", filePath: resolvedPath.replace(/\\/g, '/') });
    }
    if (fs.statSync(resolvedPath).isDirectory()) {
      return res.status(400).json({ error: "Cannot read a directory as a file", filePath: resolvedPath.replace(/\\/g, '/') });
    }
    try {
      const fullContent = fs.readFileSync(resolvedPath, 'utf8');
      const lines = fullContent.split('\n');
      const totalLines = lines.length;
      if (offset !== undefined) {
        const start = Math.max(0, (Number(offset) || 1) - 1);
        const count = limit !== undefined ? Math.max(1, Number(limit) || 1) : totalLines - start;
        const selected = lines.slice(start, start + count);
        res.json({
          content: selected.join('\n'),
          filePath: resolvedPath.replace(/\\/g, '/'),
          name: path.basename(resolvedPath),
          offset: start + 1,
          limit: selected.length,
          totalLines
        });
      } else {
        res.json({ content: fullContent, filePath: resolvedPath.replace(/\\/g, '/'), name: path.basename(resolvedPath), totalLines });
      }
    } catch (e: any) {
      res.status(500).json({ error: "Failed to read file", detail: e.message });
    }
  });

  app.get("/api/fs/raw", (req, res) => {
    const { filePath } = req.query;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).send("filePath is required");
    }
    const resolvedPath = resolveCoderPath(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).send("File not found");
    }
    try {
      res.sendFile(resolvedPath);
    } catch (e: any) {
      res.status(500).send("Error reading file");
    }
  });

  app.post("/api/fs/write", (req, res) => {
    const { filePath, content, workspaceRoot } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: "filePath and content are required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    try {
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, content, 'utf8');
      res.json({ success: true, filePath: resolvedPath.replace(/\\/g, '/') });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to write file", detail: e.message });
    }
  });

  app.post("/api/fs/create", (req, res) => {
    const { filePath, isDirectory, workspaceRoot, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    try {
      if (isDirectory) {
        fs.mkdirSync(resolvedPath, { recursive: true });
       } else {
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        fs.writeFileSync(resolvedPath, content !== undefined ? content : '', 'utf8');
      }
      res.json({ success: true, filePath: resolvedPath.replace(/\\/g, '/') });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create", detail: e.message });
    }
  });

  app.post("/api/fs/delete", (req, res) => {
    const { filePath, workspaceRoot } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File or directory not found" });
    }
    try {
      if (fs.statSync(resolvedPath).isDirectory()) {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(resolvedPath);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete", detail: e.message });
    }
  });

  // Rename/move files and folders atomically
  app.post("/api/fs/move", (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: "oldPath and newPath are required" });
    }
    
    const resolvedOld = path.resolve(oldPath);
    const resolvedNew = path.resolve(newPath);
    try {
      if (!fs.existsSync(resolvedOld)) {
        return res.status(404).json({ error: "Source path not found" });
      }
      fs.mkdirSync(path.dirname(resolvedNew), { recursive: true });
      fs.renameSync(resolvedOld, resolvedNew);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to move or rename", detail: e.message });
    }
  });

  // Detect project type in the workspace folder
  app.post("/api/fs/detect-project", (req, res) => {
    const { folderPath, workspaceRoot } = req.body;
    const targetDir = folderPath
      ? resolveCoderPath(folderPath, workspaceRoot)
      : (workspaceRoot ? path.resolve(workspaceRoot) : process.cwd());
    if (!fs.existsSync(targetDir)) {
      return res.json({ type: 'empty', entryPoint: null, framework: null });
    }

    const files = getFilesRecursively(targetDir);
    const fileNames = files.map(f => f.name.toLowerCase());
    const filePaths = files.map(f => f.path.replace(/\\/g, '/'));

    // Check for package.json (framework project)
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.vite || fileNames.some(f => f.startsWith('vite.config'))) {
          return res.json({ type: 'vite', entryPoint: 'index.html', framework: 'Vite' });
        }
        if (deps.next) {
          return res.json({ type: 'next', entryPoint: null, framework: 'Next.js' });
        }
        if (deps.react || deps['react-dom']) {
          const entry = fileNames.includes('index.html') ? 'index.html' : null;
          return res.json({ type: 'react', entryPoint: entry, framework: 'React' });
        }
        return res.json({ type: 'node', entryPoint: null, framework: pkg.name || 'Node.js' });
      } catch { /* fall through */ }
    }

    // Check for index.html (static site)
    if (fileNames.includes('index.html')) {
      return res.json({ type: 'static', entryPoint: 'index.html', framework: null });
    }

    // Check for single HTML file
    const htmlFiles = fileNames.filter(f => f.endsWith('.html'));
    if (htmlFiles.length === 1) {
      return res.json({ type: 'single', entryPoint: htmlFiles[0], framework: null });
    }
    if (htmlFiles.length > 1) {
      return res.json({ type: 'multi-static', entryPoint: htmlFiles[0], framework: null });
    }

    return res.json({ type: 'unknown', entryPoint: null, framework: null });
  });



  // Report OS info for the AI to adapt its commands
  app.get("/api/os/info", (req, res) => {
    res.json({
      platform: process.platform,
      isWindows: process.platform === 'win32',
      isMac: process.platform === 'darwin',
      isLinux: process.platform === 'linux',
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      hostname: os.hostname(),
    });
  });

  // Experimental LSP endpoint: provides diagnostics & symbols for a file
  app.post("/api/lsp/analyze", async (req, res) => {
    const { filePath, workspaceRoot } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found" });
    }
    try {
      const ext = path.extname(resolvedPath).toLowerCase();
      const content = fs.readFileSync(resolvedPath, 'utf8');
      const lines = content.split('\n');
      const imports: string[] = [];
      const diagnostics: any[] = [];
      const symbols: any[] = [];

      // Basic static analysis by file type
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
        const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
        let importMatch: RegExpExecArray | null;
        while ((importMatch = importRegex.exec(content)) !== null) {
          imports.push(importMatch[1]);
        }
        const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;
        let exportMatch: RegExpExecArray | null;
        while ((exportMatch = exportRegex.exec(content)) !== null) {
          symbols.push({ name: exportMatch[1], kind: 'export', line: content.substring(0, exportMatch.index).split('\n').length });
        }
        const funcRegex = /(?:function|const)\s+(\w+)\s*(?:[=:]\s*(?:\([^)]*\)\s*=>|function)?)/g;
        let funcMatch: RegExpExecArray | null;
        while ((funcMatch = funcRegex.exec(content)) !== null) {
          const funcName = funcMatch[1];
          if (!symbols.find(s => s.name === funcName)) {
            symbols.push({ name: funcName, kind: 'function', line: content.substring(0, funcMatch.index).split('\n').length });
          }
        }
      }
      let lspMatch: RegExpExecArray | null;
      if (['.css', '.scss', '.less'].includes(ext)) {
        const classRegex = /\.([\w-]+)\s*\{/g;
        while ((lspMatch = classRegex.exec(content)) !== null) {
          symbols.push({ name: lspMatch[1], kind: 'class', line: content.substring(0, lspMatch.index).split('\n').length });
        }
      }
      if (['.html', '.htm'].includes(ext)) {
        const tagRegex = /<([\w-]+)(?:\s[^>]*)?>/g;
        while ((lspMatch = tagRegex.exec(content)) !== null) {
          symbols.push({ name: lspMatch[1], kind: 'tag', line: content.substring(0, lspMatch.index).split('\n').length });
        }
      }

      // Basic diagnostics
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

  type PreviewDetection = {
    kind: 'node' | 'static-html' | 'unknown';
    framework: string;
    packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | null;
    devCommand: string | null;
    previewUrl: string | null;
    entryFile: string | null;
    notes: string[];
  };

  const detectPackageManager = (workspaceRoot: string): PreviewDetection['packageManager'] => {
    if (fileExists(path.join(workspaceRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fileExists(path.join(workspaceRoot, 'yarn.lock'))) return 'yarn';
    if (fileExists(path.join(workspaceRoot, 'bun.lockb')) || fileExists(path.join(workspaceRoot, 'bun.lock'))) return 'bun';
    return 'npm';
  };

  const detectStaticEntry = (workspaceRoot: string) => {
    const candidates = ['index.html', 'public/index.html', 'dist/index.html', 'build/index.html'];
    for (const candidate of candidates) {
      if (fileExists(path.join(workspaceRoot, candidate))) return candidate;
    }
    const htmlFiles = getFilesRecursively(workspaceRoot)
      .filter(f => !f.isDirectory && /\.html?$/i.test(f.name))
      .map(f => f.relativePath)
      .sort();
    return htmlFiles[0] || null;
  };

  const encodePreviewPath = (relativePath: string) =>
    relativePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');

  const detectPreviewProject = (workspaceRoot: string): PreviewDetection => {
    const notes: string[] = [];
    if (!fileExists(workspaceRoot)) {
      return {
        kind: 'unknown',
        framework: 'No workspace',
        packageManager: null,
        devCommand: null,
        previewUrl: null,
        entryFile: null,
        notes: ['Workspace folder does not exist.']
      };
    }

    const pkgPath = path.join(workspaceRoot, 'package.json');
    const pkg = readJsonFile(pkgPath);
    if (pkg) {
      const packageManager = detectPackageManager(workspaceRoot);
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const scripts = pkg.scripts || {};
      const scriptName = scripts.dev ? 'dev' : scripts.start ? 'start' : scripts.serve ? 'serve' : scripts.preview ? 'preview' : null;
      let framework = pkg.name || 'Node app';
      if (deps.vite || scripts.dev?.includes('vite')) framework = 'Vite';
      else if (deps.next || scripts.dev?.includes('next')) framework = 'Next.js';
      else if (deps['react-scripts']) framework = 'Create React App';
      else if (deps.astro) framework = 'Astro';
      else if (deps.nuxt) framework = 'Nuxt';
      else if (deps['@sveltejs/kit'] || deps.svelte) framework = 'Svelte';
      else if (deps.express) framework = 'Express';
      if (!scriptName) notes.push('package.json exists but no dev/start/serve/preview script was found.');
      return {
        kind: 'node',
        framework,
        packageManager,
        devCommand: scriptName ? `${packageManager} run ${scriptName}` : null,
        previewUrl: null,
        entryFile: null,
        notes
      };
    }

    const entryFile = detectStaticEntry(workspaceRoot);
    if (entryFile) {
      notes.push('Static HTML project detected. No dev server is required.');
      return {
        kind: 'static-html',
        framework: 'Static HTML',
        packageManager: null,
        devCommand: null,
        previewUrl: `http://localhost:${PORT}/preview-static/${encodePreviewPath(entryFile)}`,
        entryFile,
        notes
      };
    }

    return {
      kind: 'unknown',
      framework: 'Unknown project',
      packageManager: null,
      devCommand: null,
      previewUrl: null,
      entryFile: null,
      notes: ['Could not detect package.json or an HTML entry file.']
    };
  };

  const stopPreviewProcess = () => {
    if (previewProcess) {
      if (process.platform === 'win32' && previewProcess.pid) {
        try {
          spawn('taskkill', ['/pid', previewProcess.pid.toString(), '/f', '/t']);
        } catch {
          previewProcess.kill();
        }
      } else {
        previewProcess.kill();
      }
      previewProcess = null;
    }
    previewUrl = '';
    previewProxyOrigin = '';
  };

  const pushPreviewLog = (chunk: Buffer | string) => {
    const text = chunk.toString();
    previewLogs.push(...text.split(/\r?\n/).filter(Boolean));
    previewLogs = previewLogs.slice(-200);
    const urlMatch = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?/i);
    if (urlMatch) {
      previewUrl = urlMatch[0].replace('[::1]', 'localhost');
      previewProxyOrigin = new URL(previewUrl).origin;
    }
  };

  const rewritePreviewText = (text: string) => {
    return text
      .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
      .replace(/(["'`])\/(?!preview-proxy\/)(@vite|@react-refresh|src|node_modules|assets)\//g, '$1/preview-proxy/$2/')
      .replace(/(href|src)=["']\/(?!\/|preview-proxy\/)([^"']*)["']/g, '$1="/preview-proxy/$2"')
      .replace(/url\(\s*\/(?!\/|preview-proxy\/)([^)"']+)\s*\)/g, 'url(/preview-proxy/$1)');
  };

  const getSafeFrameUrl = (urlStr: string, isStaticHtml: boolean): string => {
    if (!urlStr) return '';
    if (isStaticHtml) {
      try {
        return new URL(urlStr).pathname;
      } catch {
        return urlStr;
      }
    }
    return previewProxyOrigin ? '/preview-proxy/' : urlStr;
  };

  app.get('/api/preview/status', (req, res) => {
    const workspaceRoot = resolveCoderPath(typeof req.query.folderPath === 'string' ? req.query.folderPath : undefined);
    activePreviewRoot = workspaceRoot;
    const detection = detectPreviewProject(workspaceRoot);
    res.json({
      running: Boolean(previewProcess),
      url: previewUrl,
      frameUrl: getSafeFrameUrl(previewUrl, detection.kind === 'static-html'),
      logs: previewLogs,
      workspacePath: workspaceRoot.replace(/\\/g, '/'),
      detection
    });
  });

  app.post('/api/preview/stop', (_req, res) => {
    stopPreviewProcess();
    previewLogs = [];
    res.json({ success: true });
  });

  app.post('/api/preview/start', (req, res) => {
    try {
      const workspaceRoot = resolveCoderPath(req.body?.folderPath);
      const samePreviewRoot = activePreviewRoot === workspaceRoot;
      activePreviewRoot = workspaceRoot;
      const detection = detectPreviewProject(workspaceRoot);

      if (previewProcess && previewUrl && samePreviewRoot) {
        return res.json({
          running: true,
          url: previewUrl,
          frameUrl: getSafeFrameUrl(previewUrl, detection.kind === 'static-html'),
          logs: previewLogs,
          detection
        });
      }

      if (detection.kind === 'static-html' && detection.previewUrl) {
        stopPreviewProcess();
        previewUrl = detection.previewUrl;
        previewProxyOrigin = '';
        previewLogs = [`Launching ${detection.entryFile}`];
        return res.json({
          running: false,
          url: previewUrl,
          frameUrl: getSafeFrameUrl(previewUrl, true),
          logs: previewLogs,
          detection
        });
      }

      if (!detection.devCommand) {
        return res.status(400).json({
          error: detection.notes.join(' ') || 'Could not detect how to start this project.',
          detection
        });
      }

      stopPreviewProcess();
      previewLogs = [`Detected ${detection.framework}`, `Running ${detection.devCommand}`];
      const proc = spawn(detection.devCommand, {
        cwd: workspaceRoot,
        env: { ...process.env, BROWSER: 'none' },
        shell: true
      });
      previewProcess = proc;

      proc.stdout.on('data', pushPreviewLog);
      proc.stderr.on('data', pushPreviewLog);
      proc.on('exit', (code) => {
        pushPreviewLog(`Preview process exited with code ${code}`);
        previewProcess = null;
      });
      proc.on('error', (error) => {
        pushPreviewLog(`Preview process failed: ${error.message}`);
        previewProcess = null;
      });

      res.json({
        running: true,
        url: previewUrl,
        frameUrl: getSafeFrameUrl(previewUrl, false),
        logs: previewLogs,
        detection
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/preview-static/*', (req, res) => {
    const subpath = (req.params as Record<string, string>)['0'] || '';
    const resolved = path.resolve(activePreviewRoot, subpath);
    if (resolved !== activePreviewRoot && !resolved.startsWith(activePreviewRoot + path.sep)) {
      return res.status(403).send('Path escapes preview workspace');
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return res.status(404).send('Preview file not found');
    }
    res.sendFile(resolved);
  });

  app.use('/preview-proxy', async (req, res) => {
    if (!previewProxyOrigin) {
      return res.status(503).send('Preview server is not running yet');
    }
    try {
      const upstreamUrl = new URL(req.originalUrl.replace(/^\/preview-proxy/, '') || '/', previewProxyOrigin);
      const upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          accept: req.headers.accept || '*/*',
          'user-agent': req.headers['user-agent'] || 'LuminaPreview'
        } as any
      });
      const contentType = upstream.headers.get('content-type') || '';
      res.status(upstream.status);
      if (contentType) res.setHeader('content-type', contentType);
      if (contentType.includes('text/html') || contentType.includes('javascript') || contentType.includes('text/css')) {
        res.send(rewritePreviewText(await upstream.text()));
      } else {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.send(buffer);
      }
    } catch (error: any) {
      res.status(502).send(`Preview proxy error: ${error.message}`);
    }
  });

  // Analyze element endpoint using filesystem scan and optional Gemini analysis
  app.post("/api/fs/analyze_element", async (req, res) => {
    const {
      tag,
      id,
      classes,
      text,
      placeholder,
      src,
      href,
      outerHTML,
      attributes = {},
      domPath = [],
      sourceHint
    } = req.body;

    const normalizeText = (value = '') => String(value).replace(/\s+/g, ' ').trim();
    const normalizePath = (value = '') => String(value).replace(/\\/g, '/');
    const previewRoot = fs.existsSync(activePreviewRoot) ? activePreviewRoot : process.cwd();
    const sourceExtScore = (fileName: string) => {
      const ext = path.extname(fileName).toLowerCase();
      if (['.tsx', '.jsx', '.vue', '.svelte'].includes(ext)) return 90;
      if (['.ts', '.js'].includes(ext)) return 55;
      if (['.html', '.htm'].includes(ext)) return 45;
      if (ext === '.css' || ext === '.scss' || ext === '.less') return -40;
      return 0;
    };

    const resolveSourceHintFile = () => {
      const hintName = sourceHint?.fileName;
      if (!hintName || typeof hintName !== 'string') return null;
      const direct = path.resolve(hintName);
      if (fs.existsSync(direct)) return direct;
      const normalizedHint = normalizePath(hintName);
      const srcIndex = normalizedHint.lastIndexOf('/src/');
      if (srcIndex !== -1) {
        const candidate = path.join(previewRoot, normalizedHint.slice(srcIndex + 1));
        if (fs.existsSync(candidate)) return candidate;
      }
      const basename = path.basename(hintName);
      const match = getFilesRecursively(previewRoot).find(f => !f.isDirectory && f.name === basename);
      return match?.path || null;
    };

    const getLineIndex = (content: string, lineNumber?: number) => {
      if (!lineNumber || lineNumber < 1) return -1;
      const lines = content.split(/\r?\n/);
      let index = 0;
      for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
        index += lines[i].length + 1;
      }
      return index;
    };

    const findNeedleIndex = (content: string) => {
      const checks: string[] = [];
      if (id) checks.push(`id="${id}"`, `id='${id}'`, `id={${id}}`, `id={"${id}"}`, String(id));
      if (placeholder) checks.push(String(placeholder));
      if (href) checks.push(String(href));
      if (src) checks.push(String(src));
      if (text && normalizeText(text).length > 1) checks.push(normalizeText(text), String(text).trim());
      for (const value of Object.values(attributes as Record<string, string>)) {
        if (typeof value === 'string' && value.trim().length > 2 && value.length < 200) checks.push(value.trim());
      }
      const classList = String(classes || '').split(/\s+/).filter(c => c.length > 2);
      checks.push(...classList);

      for (const needle of checks.filter(Boolean)) {
        const exactIndex = content.indexOf(needle);
        if (exactIndex !== -1) return exactIndex;
        const lowerIndex = content.toLowerCase().indexOf(needle.toLowerCase());
        if (lowerIndex !== -1) return lowerIndex;
      }
      return -1;
    };

    const extractBalancedSnippet = (content: string, index: number) => {
      if (index < 0) return content.substring(0, 1600);
      const lines = content.split(/\r?\n/);
      let charCount = 0;
      let lineIndex = 0;
      for (; lineIndex < lines.length; lineIndex++) {
        if (charCount + lines[lineIndex].length + 1 > index) break;
        charCount += lines[lineIndex].length + 1;
      }

      let startLine = Math.max(0, lineIndex - 8);
      for (let i = lineIndex; i >= Math.max(0, lineIndex - 80); i--) {
        const line = lines[i];
        if (
          /^\s*(export\s+)?(default\s+)?function\s+\w+/.test(line) ||
          /^\s*(const|let|var)\s+\w+\s*=\s*(\([^)]*\)|[^=]*)\s*=>/.test(line) ||
          /^\s*return\s*\(/.test(line) ||
          /^\s*<[\w.-]+/.test(line)
        ) {
          startLine = i;
          break;
        }
      }

      let endLine = Math.min(lines.length - 1, lineIndex + 22);
      let balance = 0;
      let seenCode = false;
      for (let i = startLine; i < Math.min(lines.length, startLine + 140); i++) {
        const line = lines[i];
        for (const char of line) {
          if ('({['.includes(char)) balance++;
          if (')}]'.includes(char)) balance--;
        }
        if (i >= lineIndex) seenCode = true;
        if (seenCode && i > lineIndex + 6 && balance <= 0) {
          endLine = i;
          break;
        }
      }

      const snippet = lines.slice(startLine, endLine + 1).join('\n').trim();
      return snippet.length > 5000 ? snippet.slice(0, 5000) : snippet;
    };

    const allFiles = getFilesRecursively(previewRoot);
    const textFiles = allFiles.filter(f => !f.isDirectory && /\.(html|css|scss|less|js|jsx|ts|tsx|vue|svelte)$/i.test(f.name));
    const candidates: Array<any> = [];
    const hintedPath = resolveSourceHintFile();

    if (hintedPath && fs.existsSync(hintedPath)) {
      try {
        const content = fs.readFileSync(hintedPath, 'utf8');
        candidates.push({
          name: path.basename(hintedPath),
          path: normalizePath(hintedPath),
          content,
          score: 1200 + sourceExtScore(hintedPath),
          matchIndex: getLineIndex(content, sourceHint?.lineNumber)
        });
      } catch {
        // Ignore stale React debug source hints.
      }
    }

    let bestFile = null;
    let bestScore = -1;
    const selectedText = normalizeText(text);
    const selectedClasses = String(classes || '').split(/\s+/).filter(c =>
      c.length > 2 &&
      !['flex', 'grid', 'hidden', 'block', 'w-full', 'h-full', 'relative', 'absolute', 'items-center', 'justify-between', 'text-center', 'cursor-pointer', 'rounded', 'border', 'shadow', 'bg-white', 'text-black', 'text-white'].includes(c)
    );

    for (const file of textFiles) {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const lowerContent = content.toLowerCase();
        let score = sourceExtScore(file.name);
        let matchIndex = -1;

        if (hintedPath && normalizePath(file.path) === normalizePath(hintedPath)) {
          score += 1200;
          matchIndex = getLineIndex(content, sourceHint?.lineNumber);
        }

        if (id) {
          if (content.includes(`id="${id}"`) || content.includes(`id='${id}'`) || content.includes(`id={${id}}`) || content.includes(`id={"${id}"}`)) {
            score += 220;
            matchIndex = content.indexOf(id);
          } else if (content.includes(id)) {
            score += 45;
            if (matchIndex === -1) matchIndex = content.indexOf(id);
          }
        }

        if (selectedText.length > 1) {
          if (content.includes(selectedText)) {
            score += Math.min(220, 80 + selectedText.length);
            if (matchIndex === -1) matchIndex = content.indexOf(selectedText);
          } else if (lowerContent.includes(selectedText.toLowerCase())) {
            score += Math.min(120, 40 + selectedText.length / 2);
            if (matchIndex === -1) matchIndex = lowerContent.indexOf(selectedText.toLowerCase());
          }
        }

        for (const [attrName, attrValue] of Object.entries(attributes as Record<string, string>)) {
          if (!attrValue || attrValue.length > 300) continue;
          const exactAttrDouble = `${attrName}="${attrValue}"`;
          const exactAttrSingle = `${attrName}='${attrValue}'`;
          if (content.includes(exactAttrDouble) || content.includes(exactAttrSingle)) {
            score += 140;
            if (matchIndex === -1) matchIndex = content.indexOf(attrValue);
          } else if (attrValue.length > 2 && content.includes(attrValue)) {
            score += 35;
            if (matchIndex === -1) matchIndex = content.indexOf(attrValue);
          }
        }

        if (src && content.includes(src)) {
          score += 170;
          if (matchIndex === -1) matchIndex = content.indexOf(src);
        }
        if (href && content.includes(href)) {
          score += 170;
          if (matchIndex === -1) matchIndex = content.indexOf(href);
        }

        let classMatches = 0;
        for (const cls of selectedClasses) {
          if (content.includes(cls)) {
            classMatches++;
            if (matchIndex === -1) matchIndex = content.indexOf(cls);
          }
        }
        if (classMatches > 0) {
          score += classMatches * 22;
          if (classMatches >= Math.min(3, selectedClasses.length)) score += 80;
        }

        for (const segment of domPath as string[]) {
          const cleanSegment = String(segment).replace(/^[a-z0-9-]+/i, '').replace(/[.#]/g, '');
          if (cleanSegment && content.includes(cleanSegment)) score += 12;
        }

        if (outerHTML && typeof outerHTML === 'string') {
          const attrNames = Array.from(outerHTML.matchAll(/\s([\w:-]+)=/g)).map(m => m[1]).slice(0, 8);
          for (const attrName of attrNames) {
            if (content.includes(attrName)) score += 6;
          }
        }

        if (tag && (content.includes(`<${tag}`) || content.includes(`text-${tag}`))) {
          score += 12;
          if (matchIndex === -1) matchIndex = content.indexOf(`<${tag}`);
        }

        if (matchIndex === -1) {
          matchIndex = findNeedleIndex(content);
        }

        candidates.push({ ...file, content, score, matchIndex });
        if (score > bestScore) {
          bestScore = score;
          bestFile = { ...file, content, matchIndex };
        }
      } catch (err) {
        // Skip unreadable files
      }
    }

    const strongest = candidates.sort((a, b) => b.score - a.score)[0];
    if (strongest && strongest.score > bestScore) {
      bestFile = strongest;
      bestScore = strongest.score;
    }

    // Default fallbacks if no file scored above 0
    let targetFile = bestFile;
    if (!targetFile || bestScore <= 0) {
      // Look for App.tsx as logical default
      const probableFile = textFiles.find(f => ['App.tsx', 'App.jsx', 'index.html'].includes(f.name));
      if (probableFile) {
        try {
          targetFile = {
            ...probableFile,
            content: fs.readFileSync(probableFile.path, 'utf8'),
            matchIndex: -1
          };
        } catch {}
      }
    }

    if (!targetFile) {
      return res.status(404).json({ error: "No matching files or default files found in the workspace." });
    }

    let fileContentWindow = targetFile.content;
    const fileContent = targetFile.content;
    const filePath = targetFile.path;
    let matchIndex = typeof targetFile.matchIndex === 'number' ? targetFile.matchIndex : -1;
    if (matchIndex === -1) matchIndex = findNeedleIndex(fileContent);

    fileContentWindow = extractBalancedSnippet(fileContent, matchIndex);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Local Heuristic Fallback if Google Gemini API key is missing
      const specificSnippet = fileContentWindow.substring(0, 1000);
      return res.json({
        success: true,
        analysis: {
          fileName: targetFile.name,
          filePath: filePath,
          specificCode: specificSnippet,
          connections: [],
          elementWork: `Controls the UI view and rendering logic for selected <${tag}> element on the preview viewport.`
        }
      });
    }

    // Call Gemini
    try {
      const cssSelector = `${tag}${id ? `#${id}` : ''}${classes ? `.${classes.split(/\s+/)[0]}` : ''}`;
      const prompt = `You are a developer tool. I have selected an HTML/JSX element from a live web preview:
- CSS Selector: ${cssSelector}
- Tag Name: <${tag}>
- Classes: ${classes}
- Text content: "${text || ''}"
- Placeholder: "${placeholder || ''}"
- Image src: "${src || ''}"
- Link href: "${href || ''}"

This element was traced to reside in the source file: "${targetFile.name}" (at path: "${filePath}").
We have extracted the relevant section of that file's code:
\`\`\`
${fileContentWindow}
\`\`\`

Based on this content, extract/formulate the 4 parts required. Return a valid RAW JSON object matching this schema exactly (without any markdown block wrapper):
{
  "fileName": "The clean filename, e.g. '${targetFile.name}'",
  "filePath": "The path to the file, e.g. '${filePath}'",
  "specificCode": "The specific functional subset of code from the file that controls/renders this element. Include its event handlers, styling, attributes or properties. Keep it to a clean and perfectly formatted block of code.",
  "connections": [
    { "fileName": "Name of connected/imported/associated file", "filePath": "Path of the connected file" }
  ],
  "elementWork": "A highly professional, developer-focused 1-2 sentence description explaining exactly what this clicked element does, how it works, and its role in the interface."
}

Ensure the JSON is perfectly valid and matches the requested keys. Output only raw JSON text. No markdown backticks.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000
        }
      );

      let responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      responseText = responseText.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.substring(7, responseText.length - 3).trim();
      } else if (responseText.startsWith('```')) {
        responseText = responseText.substring(3, responseText.length - 3).trim();
      }

      const parsed = JSON.parse(responseText);
      return res.json({
        success: true,
        analysis: {
          fileName: parsed.fileName || targetFile.name,
          filePath: parsed.filePath || filePath,
          specificCode: parsed.specificCode || fileContentWindow.substring(0, 1000),
          connections: parsed.connections || [],
          elementWork: parsed.elementWork || `Controls interaction and state updates for this selected <${tag}> element.`
        }
      });

    } catch (err: any) {
      console.error("Gemini inspect analysis failed, using fallback:", err.message);
      return res.json({
        success: true,
        analysis: {
          fileName: targetFile.name,
          filePath: filePath,
          specificCode: fileContentWindow.substring(0, 1000),
          connections: [],
          elementWork: `Controls state updates and visual layout representation for the selected <${tag}> element.`
        }
      });
    }
  });

  // AI Chat Completion Proxy
  app.post("/api/chat", async (req, res) => {
    const { messages, systemPrompt, model, config, tools, stream = true } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Determine provider configuration
    let provider = 'openai-compatible';
    let baseUrl = '';
    let apiKey = '';

    if (config) {
      provider = config.provider || 'openai-compatible';
      baseUrl = config.baseUrl || '';
      apiKey = config.apiKey || '';
    }

    // Resolve endpoint based on the selected model/provider from agentApiKeys
    // If no config provided, try to infer from the model name
    if (!config || !config.baseUrl) {
      const modelLower = (model || '').toLowerCase();
      
      // Google Gemini models
      if (modelLower.includes('gemini')) {
        provider = 'google-gemini';
        baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        apiKey = process.env.GEMINI_API_KEY || '';
      }
      // OpenAI models
      else if (modelLower.startsWith('gpt') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
        provider = 'openai';
        baseUrl = 'https://api.openai.com/v1';
        apiKey = process.env.OPENAI_API_KEY || '';
      }
      // Anthropic Claude models
      else if (modelLower.includes('claude')) {
        provider = 'anthropic';
        baseUrl = 'https://api.anthropic.com/v1';
        apiKey = process.env.ANTHROPIC_API_KEY || '';
      }
      // DeepSeek models
      else if (modelLower.includes('deepseek')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.deepseek.com/v1';
        apiKey = process.env.DEEPSEEK_API_KEY || '';
      }
      // Groq models
      else if (modelLower.includes('groq') || modelLower.includes('llama')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.groq.com/openai/v1';
        apiKey = process.env.GROQ_API_KEY || '';
      }
      // Ollama local
      else if (modelLower.includes('ollama')) {
        provider = 'openai-compatible';
        baseUrl = 'http://localhost:11434/v1';
        apiKey = '';
      }
      // LM Studio local
      else if (modelLower.includes('lm-studio') || modelLower.includes('lm studio')) {
        provider = 'openai-compatible';
        baseUrl = 'http://localhost:1234/v1';
        apiKey = '';
      }
      // Sarvam AI models
      else if (modelLower.includes('sarvam')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.sarvam.ai/v1';
        apiKey = process.env.SARVAM_API_KEY || '';
      }
      // Kilo AI models
      else if (modelLower.includes('kilo')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.kilo.ai/api/gateway';
        apiKey = process.env.KILO_API_KEY || '';
      }
      // OpenCode models
      else if (modelLower.includes('opencode') || modelLower.includes('big pickle') || modelLower.includes('big-pickle') || modelLower.includes('bigpickle')) {
        provider = 'opencode';
        baseUrl = 'https://opencode.ai/zen/v1';
        apiKey = process.env.OPENCODE_API_KEY || '';
      }
      // Cline models
      else if (modelLower.includes('cline')) {
        provider = 'openai-compatible';
        baseUrl = 'https://api.cline.bot';
        apiKey = process.env.CLINE_API_KEY || '';
      }
      // Default fallback to environment variable
      else {
        provider = 'openai-compatible';
        baseUrl = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
        apiKey = process.env.AI_API_KEY || '';
      }
    }

    // Build the API messages array with system prompt
    const apiMessages: any[] = [];
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }
    apiMessages.push(...messages.map((m: any) => {
      const msg: any = { role: m.role, content: m.content };
      if (m.tool_calls && Array.isArray(m.tool_calls)) {
        msg.tool_calls = m.tool_calls;
      }
      if (m.tool_call_id) {
        msg.tool_call_id = m.tool_call_id;
      }
      if (m.name) {
        msg.name = m.name;
      }
      return msg;
    }));

    try {
      if (provider === 'anthropic' || provider === 'opencode') {
        // Anthropic/OpenCode uses a different API format (x-api-key auth, /v1/messages)
        const response = await axios.post(
          `${baseUrl}/messages`,
          {
            model: model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: systemPrompt || undefined,
            messages: messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            })),
            stream: true
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 60000
          }
        );

        // Transform Anthropic stream to OpenAI-compatible SSE format
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const decoder = new TextDecoder();
        response.data.on('data', (chunk: Buffer) => {
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split('\n').filter((l: string) => l.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  res.write(data.delta.text);
                }
              } catch {}
            }
          }
        });
        response.data.on('end', () => res.end());
        response.data.on('error', (err: any) => {
          console.error('Anthropic stream error:', err);
          res.end();
        });
        return;
      }

      if (provider === 'google-gemini') {
        // Google Gemini API format
        const url = `${baseUrl}/models/${model || 'gemini-2.5-flash'}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const response = await axios.post(
          url,
          {
            contents: apiMessages.map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
            systemInstruction: systemPrompt ? {
              parts: [{ text: systemPrompt }]
            } : undefined,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            responseType: 'stream',
            timeout: 60000
          }
        );

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const decoder = new TextDecoder();
        response.data.on('data', (chunk: Buffer) => {
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split('\n').filter((l: string) => l.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                  res.write(data.candidates[0].content.parts[0].text);
                }
              } catch {}
            }
          }
        });
        response.data.on('end', () => res.end());
        response.data.on('error', (err: any) => {
          console.error('Gemini stream error:', err);
          res.end();
        });
        return;
      }

      // Default: OpenAI-compatible streaming
      const requestBody: any = {
        model: model || 'gpt-4o-mini',
        messages: apiMessages,
        stream: stream !== false,
        max_tokens: 4096,
        temperature: 0.7
      };

      if (tools && Array.isArray(tools) && tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }

      const MAX_RETRIES = 3;
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

      if (stream === false) {
        let response;
        let lastError: any;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            response = await axios.post(
              `${baseUrl}/chat/completions`,
              requestBody,
              {
                headers: {
                  'Content-Type': 'application/json',
                  ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
                },
                timeout: 60000
              }
            );
            break;
          } catch (toolChoiceError: any) {
            lastError = toolChoiceError;

            // Retry on rate limit (429) with exponential backoff
            if (toolChoiceError.response?.status === 429 && attempt < MAX_RETRIES) {
              const delay = Math.pow(2, attempt) * 1000;
              console.warn(`Rate limited (429), retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
              await wait(delay);
              continue;
            }

            const upstreamDetail = JSON.stringify(toolChoiceError.response?.data || '').toLowerCase();
            const canRetryWithoutToolChoice = requestBody.tool_choice && (
              upstreamDetail.includes('tool_choice') ||
              upstreamDetail.includes('unsupported') ||
              upstreamDetail.includes('extra_forbidden') ||
              upstreamDetail.includes('unrecognized')
            );
            if (!canRetryWithoutToolChoice) throw toolChoiceError;

            const retryBody = { ...requestBody };
            delete retryBody.tool_choice;
            try {
              response = await axios.post(
                `${baseUrl}/chat/completions`,
                retryBody,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
                  },
                  timeout: 60000
                }
              );
              break;
            } catch (retryError: any) {
              lastError = retryError;
              if (retryError.response?.status === 429 && attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`Rate limited (429) on tool_choice fallback, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
                await wait(delay);
                continue;
              }
              throw retryError;
            }
          }
        }

        if (!response) throw lastError || new Error('Chat completion failed after retries');
        return res.json(response.data);
      }

      let response;
      let lastError: any;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await axios.post(
            `${baseUrl}/chat/completions`,
            requestBody,
            {
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
              },
              responseType: 'stream',
              timeout: 60000
            }
          );
          break;
        } catch (error: any) {
          lastError = error;
          if (error.response?.status === 429 && attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`Rate limited (429) on stream, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
            await wait(delay);
            continue;
          }
          throw error;
        }
      }

      if (!response) throw lastError || new Error('Chat completion failed after retries');

      // Stream the response back to the client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const decoder = new TextDecoder();
      response.data.on('data', (chunk: Buffer) => {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              res.end();
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                res.write(content);
              }
            } catch {}
          }
        }
      });
      response.data.on('end', () => res.end());
      response.data.on('error', (err: any) => {
        console.error('Stream error:', err);
        res.end();
      });

    } catch (e: any) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      console.error('Chat API Error:', detail);
      // If streaming headers haven't been set yet, send JSON error
      if (!res.headersSent) {
        res.status(502).json({ error: 'Chat completion failed', detail });
      } else {
        res.end();
      }
    }
  });

  // Keep a minimal stub for backward compatibility
  app.get("/api/v1/tools", (req, res) => {
    res.json({ tools: [] });
  });

  app.post("/api/list_tools", (req, res) => {
    res.json({ tools: [] });
  });

  // ─── llama.cpp Management ─────────────────────────────────────────────────────
  let llamaServerProcess: ChildProcessWithoutNullStreams | null = null;

  const getLlamaInstallDir = () => {
    return path.join(getLuminaDataDir(), 'llama');
  };

  const extractZip = async (zipPath: string, destDir: string): Promise<void> => {
    fs.mkdirSync(destDir, { recursive: true });
    if (process.platform === 'win32') {
      await new Promise<void>((resolve, reject) => {
        const ps = spawn('powershell', [
          '-NoProfile', '-NonInteractive',
          '-Command',
          `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`
        ]);
        ps.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Extract-Archive exited with code ${code}`)));
        ps.on('error', reject);
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('unzip', ['-o', zipPath, '-d', destDir]);
        proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`unzip exited with code ${code}`)));
        proc.on('error', reject);
      });
    }
  };

  const killProcess = (proc: ChildProcessWithoutNullStreams | null) => {
    if (!proc) return;
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', proc.pid?.toString() || '', '/f', '/t']);
      } else {
        proc.kill('SIGTERM');
        setTimeout(() => proc.kill('SIGKILL'), 3000);
      }
    } catch {}
  };

  // Download and extract a llama.cpp release
  app.post("/api/llama/download", async (req, res) => {
    const { url, fileName, releaseTag } = req.body;
    if (!url || !fileName) {
      return res.status(400).json({ error: 'url and fileName are required' });
    }

    const installDir = getLlamaInstallDir();
    const releaseDir = path.join(installDir, `llama.cpp-release-${releaseTag || 'latest'}`);
    fs.mkdirSync(releaseDir, { recursive: true });

    const zipPath = path.join(installDir, fileName);
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    try {
      addLog(`Starting download: ${fileName}`);
      addLog(`Target: ${url}`);

      const writer = fs.createWriteStream(zipPath);
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: 300000,
        onDownloadProgress: (progressEvent) => {
          // optional: could store progress in-memory for polling
        },
      });

      const contentLength = response.headers['content-length'];
      const totalSize = parseInt(String(contentLength || '0'), 10);
      let downloaded = 0;

      response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      addLog(`Download complete (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
      addLog(`Extracting to: ${releaseDir}`);

      await extractZip(zipPath, releaseDir);
      addLog('Extraction complete');

      try { fs.unlinkSync(zipPath); } catch {}

      // Find binary files in the extracted directory
      const findBinaries = (dir: string, depth = 0): string[] => {
        if (depth > 4) return [];
        const results: string[] = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              results.push(...findBinaries(fullPath, depth + 1));
            } else if (entry.isFile()) {
              const lower = entry.name.toLowerCase();
              if (lower.includes('llama-') || lower.endsWith('.exe')) {
                results.push(fullPath);
              }
            }
          }
        } catch {}
        return results;
      };

      const binaries = findBinaries(releaseDir);
      addLog(`Found ${binaries.length} binaries`);

      // Make binaries executable on non-Windows
      if (process.platform !== 'win32') {
        for (const bin of binaries) {
          try {
            fs.chmodSync(bin, 0o755);
            addLog(`chmod +x ${path.basename(bin)}`);
          } catch {}
        }
      }

      const config = {
        version: releaseTag || 'latest',
        fileName,
        installedAt: new Date().toISOString(),
        path: releaseDir,
        binaries,
        size: `${(totalSize / 1024 / 1024).toFixed(1)} MB`,
        url,
      };

      res.json({ success: true, config, logs });
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      try { fs.unlinkSync(zipPath); } catch {}
      res.status(500).json({ error: err.message, logs });
    }
  });

  // Calculate GPU layers and read model metadata using 'gguf'
  app.post("/api/llama/gpu-recommendation", async (req, res) => {
    const { modelPath, reserveVRAM = 512 * 1024 * 1024 } = req.body;
    if (!modelPath) {
      return res.status(400).json({ error: "modelPath is required" });
    }

    // Resolve path: support mapped Windows user format and absolute/relative maps
    let resolvedPath = modelPath.replace(/\\/g, '/');
    const match = resolvedPath.match(/^C:\/Users\/([^\/]+)\/(.*)$/i);
    if (match) {
      resolvedPath = path.join(os.homedir(), match[2]);
    } else {
      resolvedPath = path.resolve(resolvedPath);
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: `Model file not found at: ${resolvedPath}` });
    }

    try {
      const getGPUDetails = async () => {
        const results: { gpus: any[]; summary: any } = {
          gpus: [],
          summary: {}
        };

        const detectGPUType = (gpu: any) => {
          const model = (gpu.model || "").toLowerCase();
          const vendor = (gpu.vendor || "").toLowerCase();
          if (gpu.vramDynamic) return "Integrated (Shared VRAM)";
          if (model.includes("intel") || vendor.includes("intel")) return "Integrated";
          if (model.includes("radeon") && model.includes("graphics")) return "Integrated (APU)";
          return "Discrete";
        };

        const detectTypeFromName = (name = "") => {
          const n = name.toLowerCase();
          if (n.includes("intel") || n.includes("iris") || n.includes("uhd")) return "Integrated";
          if (n.includes("rtx") || n.includes("gtx") || n.includes("rx 6") || n.includes("rx 7")) return "Discrete";
          if (n.includes("radeon") && !n.includes("rx")) return "Integrated (APU)";
          return "Unknown";
        };

        // 1. systeminformation
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
                type: detectGPUType(gpu),
                source: "systeminformation"
              });
            }
          }
        } catch (e) {
          console.error("si.graphics error:", e);
        }

        // 2. nvidia-smi
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
                vramTotalMB: parseInt(total, 10),
                vramFreeMB: parseInt(free, 10),
                vramUsedMB: parseInt(used, 10),
                vramMB: parseInt(total, 10),
                source: "nvidia-smi",
              };
              if (existing) {
                Object.assign(existing, nvidiaData);
              } else {
                results.gpus.push(nvidiaData);
              }
            });
          }
        } catch {}

        // 3. WMIC (Windows fallback)
        if (process.platform === "win32") {
          try {
            const raw = spawnSync(
              "wmic",
              ["path", "Win32_VideoController", "get", "Name,AdapterRAM,AdapterDACType,VideoProcessor", "/format:csv"],
              { timeout: 5000, encoding: "utf8" }
            ).stdout;

            if (raw) {
              const lines = raw.split("\n").filter(l => l.includes(",") && !l.startsWith("Node"));
              for (const line of lines) {
                const parts = line.split(",");
                const adapterRAM = parseInt(parts[2], 10);
                const name = parts[3]?.trim();
                if (!name) continue;

                const vramMB = adapterRAM > 0 ? Math.round(adapterRAM / 1024 / 1024) : 0;
                const existing = results.gpus.find(g =>
                  g.model?.toLowerCase().includes(name.toLowerCase().substring(0, 10))
                );
                const wmicData = {
                  model: name,
                  vramMB,
                  vramNote: adapterRAM === 0
                    ? "Shared/Dynamic (actual size set by OS)"
                    : `${vramMB} MB`,
                  source: "wmic",
                  type: detectTypeFromName(name),
                };
                if (existing) {
                  Object.assign(existing, wmicData);
                } else {
                  results.gpus.push(wmicData);
                }
              }
            }
          } catch {}

          // 4. PowerShell Windows fallback
          try {
            const psCmd = `Get-CimInstance Win32_VideoController | Select-Object -Property Name, AdapterRAM, CurrentHorizontalResolution, AdapterCompatibility | ConvertTo-Json`.replace(/\n/g, " ");
            const raw = spawnSync(`powershell.exe`, ["-Command", psCmd], { timeout: 8000, encoding: "utf8" }).stdout;
            if (raw) {
              const parsed = JSON.parse(raw);
              const gpuList = Array.isArray(parsed) ? parsed : [parsed];

              for (const g of gpuList) {
                if (!g || !g.Name) continue;
                const existing = results.gpus.find(gpu =>
                  gpu.model?.toLowerCase().includes(g.Name?.toLowerCase().substring(0, 10))
                );
                const psData = {
                  model: g.Name,
                  adapterCompatibility: g.AdapterCompatibility,
                  vramMB: g.AdapterRAM ? Math.round(g.AdapterRAM / 1024 / 1024) : 0,
                  source: "powershell",
                };
                if (existing) {
                  Object.assign(existing, psData);
                } else {
                  results.gpus.push(psData);
                }
              }
            }
          } catch {}
        }

        // 5. Linux AMD / lspci fallback
        if (process.platform === "linux") {
          try {
            const amd = fs.readFileSync("/sys/class/drm/card0/device/mem_info_vram_total", "utf8").trim();
            if (amd) {
              const vramBytes = parseInt(amd, 10);
              const vramMB = Math.round(vramBytes / 1024 / 1024);
              results.gpus.push({
                vendor: "AMD",
                model: "AMD Radeon GPU (Linux Core)",
                type: "Discrete",
                vramMB,
                vramTotalMB: vramMB,
                source: "/sys/class/drm"
              });
            }
          } catch {}
        }

        // Calculate summary
        results.summary = {
          totalGPUs: results.gpus.length,
          hasNvidiaDiscrete: results.gpus.some(g => g.vendor?.includes("NVIDIA") || g.model?.includes("NVIDIA")),
          hasAMDDiscrete: results.gpus.some(g => g.vendor?.includes("AMD") && g.type === "Discrete"),
          hasIntegrated: results.gpus.some(g => g.type === "Integrated"),
          totalDedicatedVRAM_MB: results.gpus
            .filter(g => g.type === "Discrete")
            .reduce((sum, g) => sum + (g.vramTotalMB || g.vramMB || 0), 0),
        };

        return results;
      };

      const details = await getGPUDetails();
      let vramTotal = 8192 * 1024 * 1024; // Default fallback to 8GB

      // Determine the best VRAM output
      const discreteGPUs = details.gpus.filter(g => g.type === "Discrete" && (g.vramTotalMB || g.vramMB));
      if (discreteGPUs.length > 0) {
        const bestGPU = discreteGPUs.reduce((prev, current) => {
          const prevVal = prev.vramTotalMB || prev.vramMB || 0;
          const currVal = current.vramTotalMB || current.vramMB || 0;
          return prevVal > currVal ? prev : current;
        });
        vramTotal = (bestGPU.vramTotalMB || bestGPU.vramMB) * 1024 * 1024;
      } else {
        const anyGPU = details.gpus.find(g => (g.vramTotalMB || g.vramMB));
        if (anyGPU) {
          vramTotal = (anyGPU.vramTotalMB || anyGPU.vramMB) * 1024 * 1024;
        } else if (process.platform === 'darwin') {
          vramTotal = Math.floor(os.totalmem() * 0.6);
        } else {
          vramTotal = Math.floor(os.totalmem() * 0.4);
        }
      }

      const { parseRawMetadata } = (await import("gguf")) as any;
      const { metadata } = await parseRawMetadata(resolvedPath);

      let numLayers = 0;
      for (const key of Object.keys(metadata)) {
        if (key.endsWith('.block_count')) {
          numLayers = Number(metadata[key]);
          break;
        }
      }
      if (!numLayers) {
        numLayers = Number(
          metadata["llama.block_count"] ||
          metadata["phi3.block_count"] ||
          metadata["mistral.block_count"] ||
          metadata["gemma.block_count"] ||
          metadata["qwen2.block_count"] ||
          32
        );
      }

      const architecture = metadata["general.architecture"] || "unknown";
      const name = metadata["general.name"] || path.basename(resolvedPath, '.gguf');

      const modelSizeBytes = fs.statSync(resolvedPath).size;
      const bytesPerLayer = modelSizeBytes / numLayers;
      const usableVRAM = vramTotal - reserveVRAM;
      const maxLayers = Math.floor(usableVRAM / bytesPerLayer);
      const recommendedLayers = Math.max(0, Math.min(maxLayers, numLayers));

      res.json({
        success: true,
        vramTotal: (vramTotal / 1024 / 1024).toFixed(0) + " MB",
        modelSize: (modelSizeBytes / 1024 / 1024).toFixed(0) + " MB",
        totalLayers: numLayers,
        bytesPerLayer: (bytesPerLayer / 1024 / 1024).toFixed(1) + " MB",
        recommendedLayers,
        fullyOffloaded: recommendedLayers >= numLayers,
        architecture,
        name,
        metadata: {
          file_size: modelSizeBytes,
          context_length: metadata["llama.context_length"] || metadata["gemma.context_length"] || null,
          attention_head_count: metadata["llama.attention.head_count"] || null,
          feed_forward_length: metadata["llama.feed_forward_length"] || null,
        }
      });
    } catch (err: any) {
      console.error("GGUF Calculation Error:", err);
      res.status(500).json({ error: `GGUF metadata parsing error: ${err.message}` });
    }
  });

  // Start llama-server process
  app.post("/api/llama/start", async (req, res) => {
    const {
      binaryPath: customBinaryPath,
      modelPath,
      gpuOffload = 99,
      contextLength = 32768,
      cacheTypeK = 'q8_0',
      cacheTypeV = 'q8_0',
      threads = 8,
      host = '127.0.0.1',
      port = 1234,
      flashAttn = false,
      noMmap = false,
      seed,
      maxConcurrent,
      unifiedKVCache,
      ropeFreqBase,
      ropeFreqScale,
      offloadKV,
      keepInMemory,
      evalBatchSize,
      physicalBatchSize,
    } = req.body;

    if (!modelPath) {
      return res.status(400).json({ error: 'modelPath is required' });
    }

    // Kill existing process if any
    killProcess(llamaServerProcess);
    llamaServerProcess = null;

    // Find the llama-server binary
    let llamaServerBin = customBinaryPath || '';
    if (!llamaServerBin) {
      const installConfig = req.headers['x-llama-config']
        ? JSON.parse(req.headers['x-llama-config'] as string)
        : null;
      if (installConfig?.binaries) {
        llamaServerBin = installConfig.binaries.find((b: string) => {
          const base = path.basename(b).toLowerCase();
          return base.includes('llama-server') || base === 'server.exe' || base === 'server';
        }) || installConfig.binaries[0] || '';
      }
    }

    if (!llamaServerBin) {
      // Search in default install dir
      const installDir = getLlamaInstallDir();
      const allFiles: string[] = [];
      const walkDir = (dir: string) => {
        try {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walkDir(full);
            else allFiles.push(full);
          }
        } catch {}
      };
      walkDir(installDir);
      llamaServerBin = allFiles.find(f => {
        const base = path.basename(f).toLowerCase();
        return base.includes('llama-server') || base === 'server.exe' || base === 'server';
      }) || '';
    }

    if (!llamaServerBin || !fs.existsSync(llamaServerBin)) {
      return res.status(404).json({ error: 'llama-server binary not found. Please install llama.cpp first.' });
    }

    const args: string[] = [
      '-m', modelPath,
      '-ngl', String(gpuOffload),
      '-c', String(contextLength),
      '--cache-type-k', cacheTypeK,
      '--cache-type-v', cacheTypeV,
      '-t', String(threads),
      '--host', host,
      '--port', String(port),
    ];

    // --flash-attn removed
    if (noMmap) args.push('--no-mmap');
    if (seed && seed !== 'Random Seed' && seed !== '-1' && seed !== -1) args.push('--seed', String(seed));

    if (maxConcurrent && Number(maxConcurrent) > 0) {
      args.push('--parallel', String(maxConcurrent));
    }
    // Removed --slot-save-state: not a valid llama-server argument in recent builds
    if (ropeFreqBase && ropeFreqBase !== 'Auto' && String(ropeFreqBase).trim() !== '') {
      args.push('--rope-freq-base', String(ropeFreqBase));
    }
    if (ropeFreqScale && ropeFreqScale !== 'Auto' && String(ropeFreqScale).trim() !== '') {
      args.push('--rope-freq-scale', String(ropeFreqScale));
    }
    if (offloadKV === false) {
      args.push('--no-kv-offload');
    }
    if (keepInMemory) {
      args.push('--mlock');
    }
    if (evalBatchSize && Number(evalBatchSize) > 0) {
      args.push('--batch-size', String(evalBatchSize));
    }
    if (physicalBatchSize && Number(physicalBatchSize) > 0) {
      args.push('--ubatch-size', String(physicalBatchSize));
    }

    const serverUrl = `http://${host}:${port}`;

    try {
      const logStream = fs.createWriteStream(
        path.join(getLlamaInstallDir(), 'llama-server.log'),
        { flags: 'a' }
      );

      if (process.platform === 'win32') {
        const pArgs = [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `& "${llamaServerBin}" ${args.map(arg => {
            if (arg.includes(' ') || arg.includes('/') || arg.includes('\\')) {
              return `"${arg.replace(/"/g, '`"')}"`;
            }
            return arg;
          }).join(' ')}`
        ];
        llamaServerProcess = spawn('powershell.exe', pArgs, {
          stdio: ['ignore', 'pipe', 'pipe'],
        }) as unknown as ChildProcessWithoutNullStreams;
      } else {
        llamaServerProcess = spawn(llamaServerBin, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        }) as unknown as ChildProcessWithoutNullStreams;
      }

      const proc = llamaServerProcess;
      proc.stdout.on('data', (data: Buffer) => {
        logStream.write(`[stdout] ${data.toString()}`);
      });
      proc.stderr.on('data', (data: Buffer) => {
        logStream.write(`[stderr] ${data.toString()}`);
      });

      proc.on('error', (err) => {
        console.error('llama-server error:', err);
        logStream.write(`[error] ${err.message}\n`);
        logStream.end();
      });

      proc.on('exit', (code) => {
        console.log(`llama-server exited with code ${code}`);
        logStream.write(`[exit] code ${code}\n`);
        logStream.end();
        llamaServerProcess = null;
      });

      // Wait for the server to be ready (poll health endpoint)
      let ready = false;
      const maxRetries = 30;
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          const healthRes = await axios.get(`${serverUrl}/v1/models`, { timeout: 2000 });
          if (healthRes.status === 200 || healthRes.status === 405) {
            ready = true;
            break;
          }
        } catch {}
      }

      if (!ready) {
        if (proc) {
          killProcess(proc);
        }
        llamaServerProcess = null;
        logStream.end();
        return res.status(500).json({ error: 'llama-server started but did not become ready within 30s' });
      }

      res.json({
        success: true,
        serverUrl,
        command: process.platform === 'win32'
          ? `& "${llamaServerBin}" ${args.map(a => (a.includes(' ') || a.includes('/') || a.includes('\\')) ? `"${a}"` : a).join(' ')}`
          : `${llamaServerBin} ${args.join(' ')}`,
        pid: proc.pid,
      });
    } catch (err: any) {
      if (llamaServerProcess) {
        killProcess(llamaServerProcess);
      }
      llamaServerProcess = null;
      res.status(500).json({ error: `Failed to start llama-server: ${err.message}` });
    }
  });

  // Stop llama-server process
  app.post("/api/llama/stop", async (_req, res) => {
    if (!llamaServerProcess) {
      return res.json({ success: true, message: 'No server running' });
    }
    killProcess(llamaServerProcess);
    llamaServerProcess = null;
    res.json({ success: true, message: 'Server stopped' });
  });

  // Get llama-server status
  app.get("/api/llama/status", async (_req, res) => {
    const running = llamaServerProcess !== null && !llamaServerProcess.killed;
    res.json({ running, pid: running ? llamaServerProcess?.pid : null });
  });

  // Delete llama.cpp install directory
  app.post("/api/llama/delete", async (_req, res) => {
    const installDir = getLlamaInstallDir();
    try {
      // Kill server if running
      if (llamaServerProcess) {
        killProcess(llamaServerProcess);
        llamaServerProcess = null;
      }
      if (fs.existsSync(installDir)) {
        fs.rmSync(installDir, { recursive: true, force: true });
      }
      res.json({ success: true, message: 'llama.cpp installation deleted' });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to delete llama.cpp: ${err.message}` });
    }
  });

  // Verify llama-server binary by running it with --version
  app.post("/api/llama/verify", async (req, res) => {
    const { binaryPath } = req.body;
    if (!binaryPath) {
      return res.status(400).json({ success: false, error: 'binaryPath is required' });
    }
    if (!fs.existsSync(binaryPath)) {
      return res.status(404).json({ success: false, error: `Binary not found at: ${binaryPath}` });
    }
    try {
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const proc = spawn(binaryPath, ['--version'], { timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        proc.on('error', reject);
        proc.on('close', (code) => {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        });
      });
      res.json({
        success: true,
        version: result.stdout || result.stderr || 'version info unavailable',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Failed to run binary: ${err.message}` });
    }
  });

  // Test a running llama-server health
  app.get("/api/llama/test", async (req, res) => {
    const host = (req.query.host as string) || '127.0.0.1';
    const port = (req.query.port as string) || '1234';
    try {
      const response = await axios.get(`http://${host}:${port}/v1/models`, { timeout: 5000 });
      res.json({
        success: true,
        status: response.status,
        data: response.data,
        serverUrl: `http://${host}:${port}`,
      });
    } catch (err: any) {
      res.json({
        success: false,
        error: err.message,
        serverUrl: `http://${host}:${port}`,
      });
    }
  });

  // Download a GGUF model from Hugging Face
  app.post("/api/models/download", async (req, res) => {
    const { modelId, fileName, publisher, modelFolder, modelFile } = req.body;
    if (!modelId || !fileName) {
      return res.status(400).json({ error: 'modelId and fileName are required' });
    }

    const modelsDir = path.join(getLuminaDataDir(), 'models', publisher || 'huggingface', modelFolder || modelId.split('/')[1] || modelId);
    fs.mkdirSync(modelsDir, { recursive: true });

    // Extract the actual filename from a string like "model-q4_k_m.gguf (4.15 GB)"
    const actualFileName = fileName.split(' ')[0];
    const savePath = path.join(modelsDir, modelFile || actualFileName);

    // If file already exists, return immediately
    if (fs.existsSync(savePath)) {
      const sizeBytes = fs.statSync(savePath).size;
      return res.json({
        success: true,
        path: savePath,
        size: (sizeBytes / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        alreadyExisted: true,
        logs: [`[${new Date().toLocaleTimeString()}] File already exists at ${savePath}`],
      });
    }

    const hfUrl = `https://huggingface.co/${modelId}/resolve/main/${actualFileName}`;
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    addLog(`Downloading: ${actualFileName}`);
    addLog(`From: ${hfUrl}`);
    addLog(`To: ${savePath}`);

    try {
      const response = await axios({
        method: 'GET',
        url: hfUrl,
        responseType: 'stream',
        timeout: 600000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10);
      const writer = fs.createWriteStream(savePath);
      let downloaded = 0;

      response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const sizeMb = (downloaded / 1024 / 1024).toFixed(1);
      addLog(`Download complete: ${sizeMb} MB`);

      res.json({
        success: true,
        path: savePath,
        size: (downloaded / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        bytes: downloaded,
        logs,
      });
    } catch (err: any) {
      // Clean up partial download
      try { fs.unlinkSync(savePath); } catch {}
      addLog(`Error: ${err.message}`);
      res.status(500).json({ error: err.message, logs });
    }
  });

  // Vite middleware for development
  if (isDev) {
    try {
      console.log('⚡ Starting Vite middleware...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('✅ Vite middleware ready');
    } catch (e) {
      console.error("⚠️ Vite server failed to start:", e);
      process.exit(1);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "127.0.0.1", () => {
    console.log(`\n🚀 Proxy server ready at http://127.0.0.1:${PORT}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error(`\n❌ Server failed to start:`, err);
    }
  });

  // Graceful shutdown on Ctrl+C / SIGTERM
  const shutdown = () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
