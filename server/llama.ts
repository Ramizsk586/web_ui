import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

let llamaServerProcess: ChildProcess | null = null;

const getLuminaDataDir = () => {
  return process.env.LUMINA_DATA_DIR || path.join(os.homedir(), '.lumina');
};

const getLlamaInstallDir = () => {
  return path.join(getLuminaDataDir(), 'llama');
};

const extractZip = async (zipPath: string, destDir: string): Promise<void> => {
  fs.mkdirSync(destDir, { recursive: true });
  const isTarGz = zipPath.endsWith('.tar.gz') || zipPath.endsWith('.tgz');

  if (isTarGz) {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('tar', ['-xzf', zipPath, '-C', destDir]);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`tar exited with code ${code}`));
      });
      proc.on('error', reject);
    });
  } else {
    if (process.platform === 'win32') {
      await new Promise<void>((resolve, reject) => {
        const ps = spawn('powershell', [
          '-NoProfile', '-NonInteractive',
          '-Command',
          `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`
        ]);
        ps.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Expand-Archive exited with code ${code}`));
        });
        ps.on('error', reject);
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('unzip', ['-o', zipPath, '-d', destDir]);
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else {
            // Fallback to tar if unzip is not installed/fails
            const fallback = spawn('tar', ['-xf', zipPath, '-C', destDir]);
            fallback.on('close', (fCode) => {
              if (fCode === 0) resolve();
              else reject(new Error(`unzip (code ${code}) and tar (code ${fCode}) both failed to extract ${zipPath}`));
            });
            fallback.on('error', (err) => {
              reject(new Error(`unzip exited with code ${code} and tar fallback failed: ${err.message}`));
            });
          }
        });
        proc.on('error', (err) => {
          // If unzip command itself wasn't found (ENOENT), fallback to tar
          const fallback = spawn('tar', ['-xf', zipPath, '-C', destDir]);
          fallback.on('close', (fCode) => {
            if (fCode === 0) resolve();
            else reject(new Error(`unzip failed with ${err.message} and tar exited with code ${fCode}`));
          });
          fallback.on('error', (fErr) => {
            reject(new Error(`unzip failed with ${err.message} and tar failed with ${fErr.message}`));
          });
        });
      });
    }
  }
};

const killProcess = (proc: ChildProcess | null) => {
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

export function setupLlamaRoutes(app: express.Express) {
  // Download and extract a llama.cpp release
  app.post("/api/llama/download", async (req, res) => {
    const { releaseTag, assetName, browserDownloadUrl } = req.body;
    if (!browserDownloadUrl || !assetName) {
      return res.status(400).json({ error: 'browserDownloadUrl and assetName are required' });
    }

    const installDir = getLlamaInstallDir();
    fs.mkdirSync(installDir, { recursive: true });

    const zipPath = path.join(installDir, assetName);
    const releaseDir = path.join(installDir, `llama.cpp-release-${releaseTag || 'latest'}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    addLog(`Starting download: ${assetName}`);
    addLog(`URL: ${browserDownloadUrl}`);

    try {
      // Download zip
      const response = await axios({
        method: 'GET',
        url: browserDownloadUrl,
        responseType: 'stream',
        timeout: 300000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10);
      const writer = fs.createWriteStream(zipPath);
      let downloaded = 0;
      let lastChunkTime = Date.now();
      let lastDownloaded = 0;

      const progressInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastChunkTime) / 1000;
        const chunkBytes = downloaded - lastDownloaded;
        const speed = elapsed > 0 ? chunkBytes / elapsed : 0;

        sendEvent({
          type: 'progress',
          stage: 'download',
          percent: totalSize > 0 ? Math.min(Math.round((downloaded / totalSize) * 100), 99) : 0,
          downloaded: (downloaded / 1024 / 1024).toFixed(1) + ' MB',
          total: totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
          speed: speed > 0 ? (speed / 1024 / 1024).toFixed(1) + ' MB/s' : 'Calculating...',
        });

        lastChunkTime = now;
        lastDownloaded = downloaded;
      }, 200);

      response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
          clearInterval(progressInterval);
          reject(err);
        });
      });

      clearInterval(progressInterval);
      addLog(`Download complete. File size: ${(downloaded / 1024 / 1024).toFixed(1)} MB`);
      addLog(`Extracting archive to: ${releaseDir}`);

      sendEvent({
        type: 'progress',
        stage: 'extract',
        percent: 0,
        downloaded: '',
        total: '',
        speed: '',
      });

      // Extract zip
      await extractZip(zipPath, releaseDir);

      addLog(`Extraction complete.`);
      addLog(`Scanning binaries...`);

      // Find binaries
      const findBinaries = (dir: string): string[] => {
        const results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results.push(...findBinaries(fullPath));
          } else if (entry.isFile()) {
            const lower = entry.name.toLowerCase();
            if (lower.includes('llama-') || lower.endsWith('.exe') || lower === 'server') {
              results.push(fullPath.replace(/\\/g, '/'));
            }
          }
        }
        return results;
      };

      const binaries = findBinaries(releaseDir);
      addLog(`Found ${binaries.length} binaries.`);

      // Ensure execute permissions on Unix-like systems
      if (process.platform !== 'win32') {
        for (const bin of binaries) {
          try {
            fs.chmodSync(bin, 0o755);
            addLog(`Set executable permissions on ${path.basename(bin)}`);
          } catch (chmodErr: any) {
            addLog(`Warning: Failed to set executable permission on ${path.basename(bin)}: ${chmodErr.message}`);
          }
        }
      }

      // Clean up zip file
      try { fs.unlinkSync(zipPath); } catch {}

      sendEvent({
        type: 'complete',
        success: true,
        releaseTag,
        installDir: releaseDir.replace(/\\/g, '/'),
        binaries,
        logs,
      });
      res.end();
    } catch (err: any) {
      try { fs.unlinkSync(zipPath); } catch {}
      addLog(`Error: ${err.message}`);
      sendEvent({ type: 'error', message: err.message, logs });
      res.end();
    }
  });

  // Simple GPU recommendation based on OS
  app.post("/api/llama/gpu-recommendation", async (req, res) => {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    if (isMac) {
      return res.json({
        recommended: 'metal',
        reason: 'Apple Silicon Metal acceleration is standard on macOS.',
        options: [
          { value: 'metal', label: 'Metal (Apple Silicon)', desc: 'Recommended. Uses unified memory on Apple Silicon M-series chips.' },
          { value: 'cpu', label: 'CPU only', desc: 'Slower fallback.' }
        ]
      });
    }

    // Windows / Linux
    let systemInfo = '';
    try {
      const { default: si } = await import('systeminformation');
      const gpus = await si.graphics();
      systemInfo = gpus.controllers.map(c => `${c.vendor} ${c.model}`).join(', ');
    } catch {}

    const lower = systemInfo.toLowerCase();
    const hasNvidia = lower.includes('nvidia') || lower.includes('geforce') || lower.includes('rtx') || lower.includes('quadro');
    const hasAmd = lower.includes('amd') || lower.includes('radeon');

    if (hasNvidia) {
      return res.json({
        recommended: 'cuda',
        reason: `Detected NVIDIA GPU: ${systemInfo}. CUDA provides the fastest inference speeds.`,
        options: [
          { value: 'cuda', label: 'CUDA (NVIDIA)', desc: 'Recommended. High performance acceleration for NVIDIA GPUs.' },
          { value: 'cpu', label: 'CPU only (CLBlast/AVX)', desc: 'Standard CPU execution.' }
        ]
      });
    }

    if (hasAmd) {
      return res.json({
        recommended: 'cpu',
        reason: `Detected AMD GPU: ${systemInfo}. Vulkan/ROCm support varies, standard CPU recommended for initial setup.`,
        options: [
          { value: 'vulkan', label: 'Vulkan (AMD/Intel)', desc: 'Experimental acceleration for AMD/Intel GPUs.' },
          { value: 'cpu', label: 'CPU only', desc: 'Stable, standard CPU fallback.' }
        ]
      });
    }

    res.json({
      recommended: 'cpu',
      reason: `No discrete NVIDIA or Apple Silicon GPU detected. System graphics: ${systemInfo || 'Unknown'}.`,
      options: [
        { value: 'cpu', label: 'CPU only', desc: 'Standard stable CPU execution.' },
        { value: 'vulkan', label: 'Vulkan', desc: 'Attempt Vulkan acceleration on integrated graphics.' }
      ]
    });
  });

  // Start llama-server process
  app.post("/api/llama/start", async (req, res) => {
    const { modelPath, port = 1234, ctxSize = 4096, ngl = 99, customBinaryPath } = req.body;
    if (!modelPath) {
      return res.status(400).json({ error: 'modelPath is required' });
    }

    try {
      killProcess(llamaServerProcess);
      llamaServerProcess = null;

      // Find the llama-server binary
      let llamaServerBin = customBinaryPath || '';
      if (!llamaServerBin) {
        const installConfig = req.headers['x-llama-config']
          ? JSON.parse(req.headers['x-llama-config'] as string)
          : null;

        if (installConfig && Array.isArray(installConfig.binaries)) {
          llamaServerBin = installConfig.binaries.find((b: string) => {
            const base = path.basename(b).toLowerCase();
            return base.includes('llama-server') || base === 'server.exe' || base === 'server';
          }) || '';
        }
      }

      if (!llamaServerBin) {
        const installDir = getLlamaInstallDir();
        const findBinaries = (dir: string): string[] => {
          if (!fs.existsSync(dir)) return [];
          const results: string[] = [];
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              results.push(...findBinaries(fullPath));
            } else if (entry.isFile()) {
              results.push(fullPath);
            }
          }
          return results;
        };

        const allFiles = findBinaries(installDir);
        llamaServerBin = allFiles.find(f => {
          const base = path.basename(f).toLowerCase();
          return base.includes('llama-server') || base === 'server.exe' || base === 'server';
        }) || '';
      }

      if (!llamaServerBin || !fs.existsSync(llamaServerBin)) {
        return res.status(404).json({ error: 'llama-server binary not found. Please install llama.cpp first.' });
      }

      // Resolve model path
      let resolvedModel = modelPath.replace(/\\/g, '/');
      const cwMatch = resolvedModel.match(/^C:\/Users\/([^\/]+)\/(.*)$/i);
      if (cwMatch) {
        resolvedModel = path.join(os.homedir(), cwMatch[2]);
      } else {
        resolvedModel = path.resolve(resolvedModel);
      }

      if (!fs.existsSync(resolvedModel)) {
        return res.status(404).json({ error: `Model file not found at: ${resolvedModel}` });
      }

      const args = [
        '--model', resolvedModel,
        '--port', String(port),
        '--ctx-size', String(ctxSize),
        '--n-gpu-layers', String(ngl),
        '--parallel', '1',
      ];

      // Auto-projector check
      const dir = path.dirname(resolvedModel);
      const isMmproj = (name: string) => {
        const l = name.toLowerCase();
        return l.includes('mmproj') || l.includes('projector') || l.includes('clip-vision') || l.includes('siglip');
      };
      try {
        const entries = fs.readdirSync(dir);
        const match = entries.find(e => e.toLowerCase().endsWith('.gguf') && isMmproj(e));
        if (match) {
          const projPath = path.join(dir, match).replace(/\\/g, '/');
          args.push('--mmproj', projPath);
          console.log('[llama-server] Found and attaching multimodal projector:', projPath);
        }
      } catch {}

      if (process.platform !== 'win32' && llamaServerBin) {
        try {
          fs.chmodSync(llamaServerBin, 0o755);
        } catch (chmodErr) {
          console.warn(`Failed to set execution permissions on ${llamaServerBin}:`, chmodErr);
        }
      }

      console.log('[llama-server] Spawning:', llamaServerBin, args.join(' '));

      const isWin = process.platform === 'win32';
      const logStream = fs.createWriteStream(
        path.join(getLlamaInstallDir(), 'llama-server.log'),
        { flags: 'w' }
      );

      if (isWin) {
        const pArgs = [
          '-NoProfile', '-NonInteractive',
          '-Command',
          `& "${llamaServerBin}" ${args.map(arg => {
            if (arg.includes(' ') || arg.includes('/') || arg.includes('\\')) return `"${arg}"`;
            return arg;
          }).join(' ')}`
        ];
        llamaServerProcess = spawn('powershell.exe', pArgs, {
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else {
        llamaServerProcess = spawn(llamaServerBin, args, {
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      }

      const proc = llamaServerProcess;
      if (!proc) throw new Error('llama-server process creation failed');
      proc.stdout?.pipe(logStream);
      proc.stderr?.pipe(logStream);

      let exited = false;
      let exitCode: number | null = null;

      proc.on('error', (err) => {
        console.error('llama-server error:', err);
      });

      proc.on('close', (code) => {
        console.log(`llama-server exited with code ${code}`);
        exited = true;
        exitCode = code;
        if (llamaServerProcess === proc) {
          llamaServerProcess = null;
        }
      });

      // Wait up to 30s for server health endpoint to become ready
      let ready = false;
      for (let i = 0; i < 60; i++) {
        if (exited) break;
        try {
          const health = await axios.get(`http://127.0.0.1:${port}/health`, { timeout: 400 });
          if (health.status === 200) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 500));
      }

      if (exited) {
        llamaServerProcess = null;
        return res.status(500).json({ error: `llama-server exited immediately with code ${exitCode}. Check server logs.` });
      }

      if (!ready) {
        killProcess(proc);
        llamaServerProcess = null;
        return res.status(500).json({ error: 'llama-server started but did not become ready within 30s' });
      }

      res.json({
        success: true,
        message: 'llama-server started successfully',
        command: isWin
          ? `& "${llamaServerBin}" ${args.map(a => (a.includes(' ') || a.includes('/') || a.includes('\\')) ? `"${a}"` : a).join(' ')}`
          : `${llamaServerBin} ${args.join(' ')}`,
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

  // Verify if a local server supports and has successfully activated vision processing
  app.post("/api/llama/verify-vision", async (req, res) => {
    const { host = '127.0.0.1', port = 1234 } = req.body;
    const url = `http://${host}:${port}/v1/chat/completions`;
    const probeImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    try {
      const response = await axios.post(url, {
        model: "active-model",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What color is this 1x1 image? Respond in one word." },
              { type: "image_url", image_url: { url: probeImageBase64 } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 10
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const content = response.data?.choices?.[0]?.message?.content || "";
      const isRed = content.toLowerCase().includes("red");
      
      res.json({
        success: true,
        visionActive: true,
        isRed,
        modelResponse: content
      });
    } catch (e: any) {
      const errorMsg = e.response?.data 
        ? (typeof e.response.data === 'object' ? JSON.stringify(e.response.data) : String(e.response.data)) 
        : e.message;
        
      res.json({
        success: false,
        visionActive: false,
        error: "Vision verification failed",
        detail: errorMsg
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

    const actualFileName = fileName.split(' ')[0];
    const savePath = path.join(modelsDir, modelFile || actualFileName);

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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

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
      let lastChunkTime = Date.now();
      let lastDownloaded = 0;

      const progressInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastChunkTime) / 1000;
        const chunkBytes = downloaded - lastDownloaded;
        const speed = elapsed > 0 ? chunkBytes / elapsed : 0;

        sendEvent({
          type: 'progress',
          stage: 'download',
          percent: totalSize > 0 ? Math.min(Math.round((downloaded / totalSize) * 100), 99) : 0,
          downloaded: (downloaded / 1024 / 1024).toFixed(1) + ' MB',
          total: totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
          speed: speed > 0 ? (speed / 1024 / 1024).toFixed(1) + ' MB/s' : 'Calculating...',
        });

        lastChunkTime = now;
        lastDownloaded = downloaded;
      }, 200);

      response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
          clearInterval(progressInterval);
          reject(err);
        });
      });

      clearInterval(progressInterval);
      const sizeMb = (downloaded / 1024 / 1024).toFixed(1);
      addLog(`Download complete: ${sizeMb} MB`);

      sendEvent({
        type: 'complete',
        success: true,
        path: savePath,
        size: (downloaded / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        bytes: downloaded,
        logs,
      });
      res.end();
    } catch (err: any) {
      try { fs.unlinkSync(savePath); } catch {}
      addLog(`Error: ${err.message}`);
      sendEvent({ type: 'error', message: err.message, logs });
      res.end();
    }
  });

  // Find mmproj file for a given model path
  app.post("/api/llama/find-mmproj", async (req, res) => {
    const { modelPath } = req.body;
    if (!modelPath) return res.status(400).json({ error: 'modelPath is required' });

    let resolvedModel = modelPath.replace(/\\/g, '/');
    const cwMatch = resolvedModel.match(/^C:\/Users\/([^\/]+)\/(.*)$/i);
    if (cwMatch) {
      resolvedModel = path.join(os.homedir(), cwMatch[2]);
    } else {
      resolvedModel = path.resolve(resolvedModel);
    }

    const dir = path.dirname(resolvedModel);
    if (!fs.existsSync(dir)) {
      return res.json({ found: false, path: null });
    }

    const isMmproj = (name: string) => {
      const l = name.toLowerCase();
      return l.includes('mmproj') || l.includes('projector') || l.includes('clip-vision') || l.includes('siglip');
    };

    try {
      const entries = fs.readdirSync(dir);
      const match = entries.find(e => e.toLowerCase().endsWith('.gguf') && isMmproj(e));
      if (match) {
        return res.json({ found: true, path: path.join(dir, match).replace(/\\/g, '/') });
      }
      return res.json({ found: false, path: null });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Scan models directory
  app.get("/api/models/list", async (_req, res) => {
    const modelsDir = path.join(getLuminaDataDir(), 'models');
    const results: { id: string; name: string; publisher: string; folder: string; file: string; path: string; size: string }[] = [];

    const isProjectorFile = (name: string) => {
      const lower = name.toLowerCase();
      return lower.includes('mmproj') || lower.includes('projector') || lower.includes('clip-vision') || lower.includes('siglip');
    };

    const scanDir = (dir: string, publisher: string, folder: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath, publisher || entry.name, entry.name);
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gguf') && !isProjectorFile(entry.name)) {
            const sizeBytes = fs.statSync(fullPath).size;
            results.push({
              id: `${publisher}/${folder}`,
              name: entry.name.replace(/\.gguf$/i, '').replace(/[-_]/g, ' '),
              publisher,
              folder,
              file: entry.name,
              path: fullPath,
              size: (sizeBytes / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            });
          }
        }
      } catch {}
    };

    if (fs.existsSync(modelsDir)) {
      scanDir(modelsDir, '', '');
    }

    res.json({ success: true, models: results });
  });
}
