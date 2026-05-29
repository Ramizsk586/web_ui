import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import 'dotenv/config';
import axios from 'axios';
import { search } from 'duck-duck-scrape';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { exec, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import Tesseract from 'tesseract.js';

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

  // Real multi-shell terminal command executor translating macOS/Windows/PowerShell/Linux commands on backend
  app.post("/api/terminal/execute", (req, res) => {
    let { command, currentPath } = req.body;
    if (!command) {
      return res.status(400).json({ error: "command is required" });
    }

    const startDir = currentPath ? path.resolve(process.cwd(), currentPath) : process.cwd();

    const parts = command.trim().split(/\s+/);
    const firstWord = parts[0];
    const firstWordLower = firstWord.toLowerCase();

    // Handle 'clear' / 'cls' / 'clear-host'
    if (['cls', 'clear', 'clear-host'].includes(firstWordLower)) {
      return res.json({
        success: true,
        clear: true,
        stdout: '',
        stderr: ''
      });
    }

    // Handle CD / Set-Location / sl
    if (['cd', 'set-location', 'sl'].includes(firstWordLower)) {
      const rest = parts.slice(1).join(' ').trim();
      let targetPath = rest;
      if (!targetPath || targetPath === '~') {
        targetPath = process.cwd();
      } else {
        targetPath = path.resolve(startDir, targetPath);
      }

      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        const relativePath = path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
        return res.json({
          success: true,
          stdout: '',
          stderr: '',
          newPath: relativePath === '' ? '.' : relativePath
        });
      } else {
        return res.json({
          success: true,
          stdout: '',
          stderr: `cd: no such file or directory: ${rest}`,
          newPath: currentPath
        });
      }
    }

    // Command Translation Helpers
    const translateSegment = (segment: string): string => {
      segment = segment.trim();
      if (!segment) return '';

      const segParts = segment.split(/\s+/);
      const cmd = segParts[0];
      const cmdLower = cmd.toLowerCase();
      const args = segParts.slice(1);

      // Windows shell & PowerShell aliases mapping to modern Linux equivalents
      const mapping: Record<string, string> = {
        'dir': 'ls -laF --color=always',
        'gci': 'ls -laF --color=always',
        'get-childitem': 'ls -laF --color=always',
        'ls': 'ls -F --color=always',

        'type': 'cat',
        'gc': 'cat',
        'get-content': 'cat',

        'md': 'mkdir -p',
        'mkdir': 'mkdir -p',

        'rd': 'rm -rf',
        'rmdir': 'rm -rf',
        'del': 'rm -f',
        'erase': 'rm -f',
        'ri': 'rm -rf',
        'remove-item': 'rm -rf',

        'copy': 'cp -r',
        'copy-item': 'cp -r',

        'move': 'mv',
        'move-item': 'mv',

        'ren': 'mv',
        'rename-item': 'mv',

        'pwd': 'pwd',
        'gl': 'pwd',
        'get-location': 'pwd',

        'get-date': 'date',
        'write-output': 'echo',
        'write': 'echo',

        'get-process': 'ps aux',
        'gps': 'ps aux',

        'get-command': 'which',
        'gcm': 'which',

        'get-help': 'man',
      };

      if (cmdLower === 'ver') {
        return `echo "Microsoft Windows [Version 10.0.22631.3527]"`;
      }
      if (cmdLower === 'sw_vers') {
        return `echo -e "ProductName:\\tmacOS\\nProductVersion:\\t14.4.1\\nBuildVersion:\\t23E224"`;
      }
      if (cmdLower === 'systeminfo') {
        return `echo -e "Host Name:\\t\\t\\tLUMINA-CONTAINER\\nOS Name:\\t\\t\\tMicrosoft Windows 11 Pro\\nOS Version:\\t\\t\\t10.0.22631 N/A Build 22631\\nSystem Manufacturer:\\t\\tLumina Virtual Platforms\\nSystem Type:\\t\\t\\tx64-based PC\\nProcessor(s):\\t\\t\\t1 Processor(s) Installed. [01]: Intel Xeon @ 2.50 GHz"`;
      }
      if (cmdLower === '$psversiontable') {
        return `echo -e "Name                           Value\\n----                           -----\\nPSVersion                      7.4.2\\nPSEdition                      Core\\nGitCommitId                    7.4.2\\nOS                             Linux\\nPlatform                       Unix"`;
      }
      if (cmdLower === 'ipconfig') {
        return `(ip addr || ifconfig) 2>/dev/null`;
      }

      if (mapping[cmdLower]) {
        return `${mapping[cmdLower]} ${args.join(' ')}`.trim();
      }

      return segment;
    };

    // Parse commands joined by separators like &&, ||, ;, |
    const segments = command.split(/(&&|\|\||;|\|)/);
    let translatedCmd = '';
    for (const seg of segments) {
      if (['&&', '||', ';', '|'].includes(seg)) {
        translatedCmd += ` ${seg} `;
      } else {
        translatedCmd += ` ${translateSegment(seg)} `;
      }
    }
    translatedCmd = translatedCmd.trim();

    // Execute the command natively!
    exec(translatedCmd, { cwd: startDir, maxBuffer: 1024 * 1024 * 15 }, (error, stdout, stderr) => {
      res.json({
        success: true,
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : ''),
        exitCode: error ? error.code : 0
      });
    });
  });

  // Live Compiler/Transpiler Sandbox Interceptor for React / JSX / TSX and JS
  app.get('/coder-preview/*', (req, res, next) => {
    const subpath = req.params[0] || '';
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
        words: result?.data?.words?.map(w => ({
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
      const response = await axios.post(`${bridgeUrl}/v1/chat/completions`, body, { headers, timeout: 30000 });
      res.json(response.data);
    } catch (e: any) {
      res.status(502).json({ error: 'Bridge chat failed', detail: e.message });
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
    const { filePath, isDirectory, workspaceRoot } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    
    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    try {
      if (isDirectory) {
        fs.mkdirSync(resolvedPath, { recursive: true });
       } else {
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        fs.writeFileSync(resolvedPath, '', 'utf8');
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

  // Execute a shell command inside the workspace (for Coder Mode Bash tool)
  app.post("/api/fs/exec", async (req, res) => {
    const { command, workspaceRoot, cwd } = req.body;
    if (!command) {
      return res.status(400).json({ error: "command is required" });
    }
    const workDir = cwd
      ? resolveCoderPath(cwd, workspaceRoot)
      : (workspaceRoot ? path.resolve(workspaceRoot) : process.cwd());
    try {
      const { execSync } = await import('child_process');
      const output = execSync(command, {
        cwd: workDir,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf8',
        windowsHide: true
      });
      res.json({ success: true, stdout: output, stderr: '' });
    } catch (e: any) {
      res.json({
        success: false,
        stdout: e.stdout || '',
        stderr: e.stderr || e.message,
        exitCode: e.status || 1
      });
    }
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
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
        const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;
        while ((match = exportRegex.exec(content)) !== null) {
          symbols.push({ name: match[1], kind: 'export', line: content.substring(0, match.index).split('\n').length });
        }
        const funcRegex = /(?:function|const)\s+(\w+)\s*(?:[=:]\s*(?:\([^)]*\)\s*=>|function)?)/g;
        while ((match = funcRegex.exec(content)) !== null) {
          if (!symbols.find(s => s.name === match[1])) {
            symbols.push({ name: match[1], kind: 'function', line: content.substring(0, match.index).split('\n').length });
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
    const subpath = req.params[0] || '';
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
    const { messages, systemPrompt, model, config } = req.body;
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
      else if (modelLower.includes('opencode')) {
        provider = 'opencode';
        baseUrl = 'https://opencode.ai/zen';
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
    apiMessages.push(...messages.map((m: any) => ({
      role: m.role,
      content: m.content
    })));

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
        stream: true,
        max_tokens: 4096,
        temperature: 0.7
      };

      const response = await axios.post(
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
      console.error('Chat API Error:', e.message);
      // If streaming headers haven't been set yet, send JSON error
      if (!res.headersSent) {
        res.status(502).json({ error: 'Chat completion failed', detail: e.message });
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

  const server = app.listen(PORT, "localhost", () => {
    console.log(`\n🚀 Proxy server ready at http://localhost:${PORT}`);
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
