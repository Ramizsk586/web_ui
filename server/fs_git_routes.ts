import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { startTelegram } from './telegram.js';
import { resolveCoderPath, getFilesRecursively } from './utils.js';
import { state } from './state.js';

type WorkspaceChangeRecord = {
  filePath: string;
  fileName: string;
  folder: string;
  status: 'modified' | 'added' | 'deleted';
  added: number;
  removed: number;
  oldContent: string;
  newContent: string;
};

const workspaceChangeLedger = new Map<string, Map<string, WorkspaceChangeRecord>>();

const normalizeWorkspaceKey = (workspaceRoot?: string) =>
  path.resolve(workspaceRoot || process.cwd()).replace(/\\/g, '/').toLowerCase();

const toWorkspaceRelativePath = (absolutePath: string, workspaceRoot?: string) => {
  const root = path.resolve(workspaceRoot || process.cwd());
  const rel = path.relative(root, absolutePath);
  return (!rel || rel.startsWith('..') || path.isAbsolute(rel) ? path.basename(absolutePath) : rel).replace(/\\/g, '/');
};

const countChangedLines = (oldContent: string, newContent: string) => {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];
  let commonPrefix = 0;
  while (
    commonPrefix < oldLines.length &&
    commonPrefix < newLines.length &&
    oldLines[commonPrefix] === newLines[commonPrefix]
  ) {
    commonPrefix++;
  }
  let oldSuffix = oldLines.length - 1;
  let newSuffix = newLines.length - 1;
  while (
    oldSuffix >= commonPrefix &&
    newSuffix >= commonPrefix &&
    oldLines[oldSuffix] === newLines[newSuffix]
  ) {
    oldSuffix--;
    newSuffix--;
  }
  return {
    added: Math.max(0, newSuffix - commonPrefix + 1),
    removed: Math.max(0, oldSuffix - commonPrefix + 1)
  };
};

const buildLedgerDiff = (record: WorkspaceChangeRecord) => {
  const oldLines = record.oldContent ? record.oldContent.split('\n') : [];
  const newLines = record.newContent ? record.newContent.split('\n') : [];
  return [
    `--- a/${record.filePath}`,
    `+++ b/${record.filePath}`,
    `@@ -1,${Math.max(oldLines.length, 1)} +1,${Math.max(newLines.length, 1)} @@`,
    ...oldLines.map(line => `-${line}`),
    ...newLines.map(line => `+${line}`)
  ].join('\n');
};

const recordWorkspaceChange = (absolutePath: string, workspaceRoot: string | undefined, oldContent: string, newContent: string, forcedStatus?: WorkspaceChangeRecord['status']) => {
  const filePath = toWorkspaceRelativePath(absolutePath, workspaceRoot);
  const workspaceKey = normalizeWorkspaceKey(workspaceRoot);
  const lastSlash = filePath.lastIndexOf('/');
  const fileName = lastSlash !== -1 ? filePath.substring(lastSlash + 1) : filePath;
  const folder = lastSlash !== -1 ? filePath.substring(0, lastSlash) : '/';
  const changedLines = countChangedLines(oldContent, newContent);
  const status = forcedStatus || (!oldContent ? 'added' : 'modified');
  const workspaceChanges = workspaceChangeLedger.get(workspaceKey) || new Map<string, WorkspaceChangeRecord>();

  workspaceChanges.set(filePath, {
    filePath,
    fileName,
    folder,
    status,
    added: status === 'deleted' ? 0 : changedLines.added,
    removed: status === 'added' ? 0 : changedLines.removed,
    oldContent,
    newContent
  });
  workspaceChangeLedger.set(workspaceKey, workspaceChanges);
};

const ensureGitPresentAndInitialized = (targetDir: string) => {
  try {
    try {
      execSync('git --version', { stdio: 'ignore' });
    } catch {
      return false;
    }

    let isGit = true;
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: targetDir, stdio: 'ignore' });
    } catch {
      isGit = false;
    }

    if (!isGit) {
      console.log(`[LUMINA_DEBUG] Initializing Git repository in: ${targetDir}`);
      execSync('git init', { cwd: targetDir });
      try {
        execSync('git config user.name "Lumina User"', { cwd: targetDir });
        execSync('git config user.email "user@lumina.local"', { cwd: targetDir });
      } catch {
        // Ignore config set failures
      }
      return true;
    }
  } catch (err: any) {
    console.error('[LUMINA_DEBUG] Git init failed:', err.message);
  }
  return false;
};

export function setupFsGitRoutes(app: express.Express) {
  // Filesystem Listing Endpoints
  app.post("/api/fs/list", (req, res) => {
    const { folderPath, workspaceRoot } = req.body;
    
    const resolvedPath = resolveCoderPath(folderPath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "Directory not found" });
    }
    
    try {
      const targetWorkspace = workspaceRoot ? path.resolve(workspaceRoot) : resolvedPath;
      ensureGitPresentAndInitialized(targetWorkspace);
    } catch (gitErr: any) {
      console.warn('[LUMINA_DEBUG] Auto git init during list failed:', gitErr.message);
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
      const existed = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
      const oldContent = existed ? fs.readFileSync(resolvedPath, 'utf8') : '';
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, content, 'utf8');
      if (resolvedPath.endsWith('.env.local')) {
        try {
          dotenv.config({ path: resolvedPath, override: true });
          startTelegram();
        } catch (envErr) {
          console.error('[EnvReload] Failed to reload .env.local dynamically:', envErr);
        }
      }
      recordWorkspaceChange(resolvedPath, workspaceRoot, oldContent, String(content), existed ? 'modified' : 'added');
      
      const changed = countChangedLines(oldContent, String(content));
      res.json({
        success: true,
        filePath: resolvedPath.replace(/\\/g, '/'),
        oldContent,
        newContent: String(content),
        addedCount: changed.added,
        removedCount: changed.removed
      });
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
        res.json({ success: true, filePath: resolvedPath.replace(/\\/g, '/') });
      } else {
        const existed = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
        const oldContent = existed ? fs.readFileSync(resolvedPath, 'utf8') : '';
        const nextContent = content !== undefined ? String(content) : '';
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        fs.writeFileSync(resolvedPath, nextContent, 'utf8');
        recordWorkspaceChange(resolvedPath, workspaceRoot, oldContent, nextContent, existed ? 'modified' : 'added');
        
        const changed = countChangedLines(oldContent, nextContent);
        res.json({
          success: true,
          filePath: resolvedPath.replace(/\\/g, '/'),
          oldContent,
          newContent: nextContent,
          addedCount: changed.added,
          removedCount: changed.removed
        });
      }
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
      const oldContent = fs.statSync(resolvedPath).isFile() ? fs.readFileSync(resolvedPath, 'utf8') : '';
      if (fs.statSync(resolvedPath).isDirectory()) {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(resolvedPath);
      }
      recordWorkspaceChange(resolvedPath, workspaceRoot, oldContent, '', 'deleted');
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

  app.post("/api/git/changes", (req, res) => {
    const _initTarget = req.body.workspaceRoot ? path.resolve(req.body.workspaceRoot) : process.cwd();
    try {
      ensureGitPresentAndInitialized(_initTarget);
    } catch (_) {}
    const { workspaceRoot } = req.body;
    const targetDir = workspaceRoot ? path.resolve(workspaceRoot) : process.cwd();
    
    try {
      let isGit = true;
      try {
        execSync('git rev-parse --is-inside-work-tree', { cwd: targetDir, stdio: 'ignore' });
      } catch {
        isGit = false;
      }

      if (!isGit) {
        const ledgerChanges = Array.from((workspaceChangeLedger.get(normalizeWorkspaceKey(targetDir)) || new Map()).values())
          .map(({ oldContent, newContent, ...change }) => change);
        return res.json({ success: true, changes: ledgerChanges, source: 'workspace-ledger' });
      }

      const statusOutput = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf8' });
      const lines = statusOutput.split('\n').filter(Boolean);
      
      let numstatMap = new Map<string, { added: number, removed: number }>();
      try {
        const numstatOutput = execSync('git diff --numstat', { cwd: targetDir, encoding: 'utf8' });
        numstatOutput.split('\n').filter(Boolean).forEach((line: string) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const added = parseInt(parts[0], 10) || 0;
            const removed = parseInt(parts[1], 10) || 0;
            const file = parts[2];
            numstatMap.set(file.replace(/\\/g, '/'), { added, removed });
          }
        });
      } catch (err) {
        console.warn('git diff --numstat failed:', err);
      }

      const changes = lines.map((line: string) => {
        const status = line.substring(0, 2);
        const filePath = line.substring(3).trim().replace(/"/g, '');
        const normPath = filePath.replace(/\\/g, '/');
        
        let fileStatus: 'modified' | 'added' | 'deleted' = 'modified';
        let added = 0;
        let removed = 0;
        
        if (status.includes('M')) {
          fileStatus = 'modified';
          const stats = numstatMap.get(normPath);
          if (stats) {
            added = stats.added;
            removed = stats.removed;
          }
        } else if (status.includes('A') || status.includes('?')) {
          fileStatus = 'added';
          const fullPath = path.join(targetDir, normPath);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              added = content.split('\n').length;
            } catch {
              added = 0;
            }
          }
        } else if (status.includes('D')) {
          fileStatus = 'deleted';
          const stats = numstatMap.get(normPath);
          if (stats) {
            removed = stats.removed;
          }
        }
        
        const lastSlash = normPath.lastIndexOf('/');
        const fileName = lastSlash !== -1 ? normPath.substring(lastSlash + 1) : normPath;
        const folder = lastSlash !== -1 ? normPath.substring(0, lastSlash) : '/';
        
        return {
          filePath: normPath,
          fileName,
          folder,
          status: fileStatus,
          added,
          removed
        };
      });
      
      const ledgerChanges = Array.from((workspaceChangeLedger.get(normalizeWorkspaceKey(targetDir)) || new Map()).values())
        .filter(change => !changes.some((gitChange: { filePath: string }) => gitChange.filePath === change.filePath))
        .map(({ oldContent, newContent, ...change }) => change);

      res.json({ success: true, changes: [...changes, ...ledgerChanges], source: 'git' });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to get git changes", detail: e.message });
    }
  });

  app.post("/api/git/diff", (req, res) => {
    const _initTarget = req.body.workspaceRoot ? path.resolve(req.body.workspaceRoot) : process.cwd();
    try {
      ensureGitPresentAndInitialized(_initTarget);
    } catch (_) {}
    const { filePath, workspaceRoot } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    const targetDir = workspaceRoot ? path.resolve(workspaceRoot) : process.cwd();
    const fullPath = path.resolve(targetDir, filePath);
    
    try {
      let diffOutput = '';
      const ledgerRecord = workspaceChangeLedger.get(normalizeWorkspaceKey(targetDir))?.get(filePath.replace(/\\/g, '/'));
      
      let isUntracked = false;
      try {
        const statusOutput = execSync(`git status --porcelain "${filePath}"`, { cwd: targetDir, encoding: 'utf8' });
        isUntracked = statusOutput.startsWith('??');
      } catch {
        // ignore
      }
      
      if (isUntracked) {
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          diffOutput = [
            `--- /dev/null`,
            `+++ b/${filePath}`,
            `@@ -0,0 +1,${lines.length} @@`,
            ...lines.map(l => `+${l}`)
          ].join('\n');
        }
      } else {
        try {
          diffOutput = execSync(`git diff --unified=3 -- "${filePath}"`, { cwd: targetDir, encoding: 'utf8' });
          if (!diffOutput.trim()) {
            diffOutput = execSync(`git diff --cached --unified=3 -- "${filePath}"`, { cwd: targetDir, encoding: 'utf8' });
          }
        } catch {
          if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            diffOutput = [
              `--- a/${filePath}`,
              `+++ b/${filePath}`,
              `@@ -0,0 +1,${lines.length} @@`,
              ...lines.map(l => `+${l}`)
            ].join('\n');
          }
        }
      }

      if (!diffOutput.trim() && ledgerRecord) {
        diffOutput = buildLedgerDiff(ledgerRecord);
      }
      
      res.json({ success: true, diff: diffOutput });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to get git diff", detail: e.message });
    }
  });

  // Provision dummy/demo workspace folder in coder mode
  app.post("/api/fs/create-demo", (req, res) => {
    try {
      const demoDir = path.resolve(process.cwd(), 'demo-workspace');
      if (!fs.existsSync(demoDir)) {
        fs.mkdirSync(demoDir, { recursive: true });
      }
      
      const srcDir = path.join(demoDir, 'src');
      if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
      }

      const indexHtmlPath = path.join(demoDir, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) {
        fs.writeFileSync(indexHtmlPath, `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lumina Coder Demo Workspace</title>
    <link rel="stylesheet" href="src/style.css">
</head>
<body>
    <div class="card">
        <h1>Lumina Sandbox</h1>
        <p>This is an interactive local preview of your application workspace.</p>
        <button id="counter-btn">Clicked 0 times</button>
    </div>
    <script src="src/main.js"></script>
</body>
</html>`, 'utf8');
      }

      const cssPath = path.join(srcDir, 'style.css');
      if (!fs.existsSync(cssPath)) {
        fs.writeFileSync(cssPath, `body {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    color: #f8fafc;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}
.card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2.5rem;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}
h1 {
    margin-top: 0;
    background: linear-gradient(to right, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
button {
    background: #6366f1;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
}
button:hover {
    background: #4f46e5;
}`, 'utf8');
      }

      const jsPath = path.join(srcDir, 'main.js');
      if (!fs.existsSync(jsPath)) {
        fs.writeFileSync(jsPath, `let count = 0;
const btn = document.getElementById('counter-btn');
if (btn) {
    btn.addEventListener('click', () => {
        count++;
        btn.textContent = \`Clicked \${count} time\${count === 1 ? '' : 's'}\`;
    });
}`, 'utf8');
      }

      try {
        let isGit = true;
        try {
          execSync('git rev-parse --is-inside-work-tree', { cwd: demoDir, stdio: 'ignore' });
        } catch {
          isGit = false;
        }

        if (!isGit) {
          execSync('git init', { cwd: demoDir });
          try {
            execSync('git config user.name "Lumina User"', { cwd: demoDir });
            execSync('git config user.email "user@lumina.local"', { cwd: demoDir });
          } catch (_) {}
          execSync('git add .', { cwd: demoDir });
          execSync('git commit -m "Initial commit of Lumina Coder Demo"', { cwd: demoDir });
        }
      } catch (gitErr: any) {
        console.warn('[LUMINA_DEBUG] Git init in demo creation failed:', gitErr.message);
      }

      res.json({ success: true, folderPath: demoDir.replace(/\\/g, '/') });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create demo workspace", detail: err.message });
    }
  });

  // Detect project type
  app.post("/api/fs/detect-project", async (req, res) => {
    const { folderPath, workspaceRoot } = req.body;

    const targetDir = folderPath
      ? resolveCoderPath(folderPath, workspaceRoot)
      : (workspaceRoot ? path.resolve(workspaceRoot) : process.cwd());
    if (!fs.existsSync(targetDir)) {
      return res.json({ type: 'empty', entryPoint: null, framework: null });
    }

    const files = getFilesRecursively(targetDir);
    const fileNames = files.map(f => f.name.toLowerCase());

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

    if (fileNames.includes('index.html')) {
      return res.json({ type: 'static', entryPoint: 'index.html', framework: null });
    }

    const htmlFiles = fileNames.filter(f => f.endsWith('.html'));
    if (htmlFiles.length === 1) {
      return res.json({ type: 'single', entryPoint: htmlFiles[0], framework: null });
    }
    if (htmlFiles.length > 1) {
      return res.json({ type: 'multi-static', entryPoint: htmlFiles[0], framework: null });
    }

    return res.json({ type: 'unknown', entryPoint: null, framework: null });
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
      dataAttributes = {},
      domPath = [],
      selectorPath,
      childIndexPath = [],
      sourceHint,
      role,
      ariaLabel,
      title,
      parentText,
      siblingIndex,
      sameTagSiblingIndex
    } = req.body;

    const normalizeText = (value = '') => String(value).replace(/\s+/g, ' ').trim();
    const normalizePath = (value = '') => String(value).replace(/\\/g, '/');
    const previewRoot = fs.existsSync(state.activePreviewRoot) ? state.activePreviewRoot : process.cwd();
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

    const getLineNumberFromIndex = (content: string, index: number) => {
      if (index < 0) return undefined;
      const lines = content.split(/\r?\n/);
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1;
        if (charCount + lineLength > index) {
          return i + 1;
        }
        charCount += lineLength;
      }
      return lines.length || undefined;
    };

    const getLineRangeForSnippet = (content: string, snippet: string, preferredIndex: number) => {
      if (!snippet) return {};
      let startIndex = preferredIndex >= 0 ? content.indexOf(snippet, Math.max(0, preferredIndex - 20)) : -1;
      if (startIndex === -1) startIndex = content.indexOf(snippet);
      if (startIndex === -1) return {};
      const startLine = getLineNumberFromIndex(content, startIndex);
      const endLine = getLineNumberFromIndex(content, startIndex + Math.max(0, snippet.length - 1));
      return {
        lineNumber: startLine,
        lineRangeStart: startLine,
        lineRangeEnd: endLine
      };
    };

    const countTagOccurrences = (snippet: string, tagName: string) => {
      if (!tagName) return 0;
      const matches = snippet.match(new RegExp(`<${tagName}(?=\\s|>|/)`, 'gi'));
      return matches ? matches.length : 0;
    };

    const normalizeHtmlFragment = (value = '') =>
      String(value)
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

    type ElementSnippetMatch = {
      snippet: string;
      lineNumber: number;
      lineRangeStart: number;
      lineRangeEnd: number;
      score: number;
      exact: boolean;
    };

    const exactAttributeMatchers = () => {
      const matchers: Array<{ name: string; value: string; weight: number; exact: boolean }> = [];
      if (id) matchers.push({ name: 'id', value: String(id), weight: 900, exact: true });
      if (placeholder) matchers.push({ name: 'placeholder', value: String(placeholder), weight: 360, exact: true });
      if (href) matchers.push({ name: 'href', value: String(href), weight: 420, exact: true });
      if (src) matchers.push({ name: 'src', value: String(src), weight: 420, exact: true });
      if (role) matchers.push({ name: 'role', value: String(role), weight: 240, exact: true });
      if (ariaLabel) matchers.push({ name: 'aria-label', value: String(ariaLabel), weight: 500, exact: true });
      if (title) matchers.push({ name: 'title', value: String(title), weight: 260, exact: true });

      for (const [name, value] of Object.entries(dataAttributes as Record<string, string>)) {
        if (typeof value === 'string' && value.trim() && value.length < 300) {
          matchers.push({ name, value, weight: 760, exact: true });
        }
      }
      for (const [name, value] of Object.entries(attributes as Record<string, string>)) {
        if (name === 'class' || name.startsWith('data-')) continue;
        if (typeof value === 'string' && value.trim() && value.length < 300) {
          matchers.push({ name, value, weight: 240, exact: true });
        }
      }
      return matchers;
    };

    const lineHasAttribute = (line: string, name: string, value: string) =>
      line.includes(`${name}="${value}"`) ||
      line.includes(`${name}='${value}'`) ||
      line.includes(`${name}={${value}}`) ||
      line.includes(`${name}={"${value}"}`) ||
      line.includes(`${name}={'${value}'}`);

    const isSingleElementLine = (line: string) =>
      tag ? countTagOccurrences(line, tag) === 1 : false;

    const buildElementWork = () => {
      const elementClasses = String(classes || '').split(/\s+/).filter(Boolean);
      const selectorDetails = [
        id ? `#${id}` : '',
        Object.entries(dataAttributes as Record<string, string>)
          .map(([name, value]) => `[${name}="${value}"]`)
          .join(''),
        elementClasses.length ? `.${elementClasses.slice(0, 2).join('.')}` : ''
      ].filter(Boolean).join('');
      return `Represents the selected <${tag}>${selectorDetails ? ` (${selectorDetails})` : ''} element from the preview. The attached code is the exact source node matched from its DOM attributes${selectorPath ? ` and selector path ${selectorPath}` : ''}.`;
    };

    const staticAssetPathFromRef = (refValue: string) => {
      const raw = String(refValue || '').trim();
      if (!raw || /^([a-z]+:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('#')) return null;
      const clean = raw.split('?')[0].split('#')[0].replace(/^\/+/, '');
      if (!clean) return null;
      const resolved = path.resolve(previewRoot, clean);
      if (resolved !== previewRoot && !resolved.startsWith(previewRoot + path.sep)) return null;
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
      return resolved;
    };

    const extractStaticLinkedAssets = (htmlContent: string) => {
      const assets: Array<{ path: string; kind: 'script' | 'style' }> = [];
      for (const match of htmlContent.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
        const resolved = staticAssetPathFromRef(match[1]);
        if (resolved) assets.push({ path: resolved, kind: 'script' });
      }
      for (const match of htmlContent.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
        const tagText = match[0] || '';
        if (!/stylesheet/i.test(tagText)) continue;
        const resolved = staticAssetPathFromRef(match[1]);
        if (resolved) assets.push({ path: resolved, kind: 'style' });
      }
      return assets.filter((asset, index, arr) =>
        arr.findIndex((entry) => normalizePath(entry.path) === normalizePath(asset.path)) === index
      );
    };

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const getSnippetWindow = (content: string, startLine: number, endLine: number, padding = 18) => {
      const lines = content.split(/\r?\n/);
      const safeStart = Math.max(1, startLine - padding);
      const safeEnd = Math.min(lines.length, endLine + padding);
      return {
        snippet: lines.slice(safeStart - 1, safeEnd).join('\n'),
        lineRangeStart: safeStart,
        lineRangeEnd: safeEnd
      };
    };

    const buildRelatedAssetConnection = (assetPath: string, kind: 'script' | 'style') => {
      try {
        const assetContent = fs.readFileSync(assetPath, 'utf8');
        if (!assetContent || assetContent.length > 800 * 1024) return null;

        const relPath = path.relative(previewRoot, assetPath).replace(/\\/g, '/');
        const lines = assetContent.split(/\r?\n/);
        const classTokens = String(classes || '').split(/\s+/).filter(Boolean).slice(0, 8);
        const idTokens = id ? [String(id)] : [];
        const attrTokens = Object.entries(dataAttributes as Record<string, string>)
          .map(([name, value]) => `${name}="${value}"`)
          .slice(0, 8);
        const textTokens = [normalizeText(text), normalizeText(ariaLabel), normalizeText(title)]
          .filter(Boolean)
          .filter(token => token.length >= 3 && token.length < 80)
          .slice(0, 6);

        let bestMatch:
          | {
              score: number;
              lineNumber: number;
              lineRangeStart: number;
              lineRangeEnd: number;
              specificCode: string;
            }
          | null = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lower = line.toLowerCase();
          let score = 0;

          for (const cls of classTokens) {
            if (lower.includes(`.${cls.toLowerCase()}`)) score += kind === 'style' ? 180 : 40;
            if (lower.includes(`"${cls.toLowerCase()}"`) || lower.includes(`'${cls.toLowerCase()}'`)) score += kind === 'script' ? 140 : 20;
          }
          for (const token of idTokens) {
            if (lower.includes(`#${token.toLowerCase()}`)) score += kind === 'style' ? 220 : 30;
            if (lower.includes(`"${token.toLowerCase()}"`) || lower.includes(`'${token.toLowerCase()}'`)) score += kind === 'script' ? 170 : 25;
          }
          for (const token of attrTokens) {
            if (lower.includes(token.toLowerCase())) score += 120;
          }
          for (const token of textTokens) {
            if (lower.includes(token.toLowerCase())) score += 45;
          }

          if (kind === 'script') {
            if (tag && lower.includes(`queryselector`) && classTokens.some(cls => lower.includes(cls.toLowerCase()))) score += 150;
            if (tag && lower.includes(`getelementbyid`) && idTokens.some(token => lower.includes(token.toLowerCase()))) score += 190;
            if (selectorPath && lower.includes('queryselector') && lower.includes(tag.toLowerCase())) score += 60;
          }

          if (score <= 0) continue;

          const startLine = i + 1;
          const endLine = Math.min(lines.length, startLine + (kind === 'script' ? 10 : 14));
          const snippetWindow = getSnippetWindow(assetContent, startLine, endLine, kind === 'script' ? 8 : 10);
          const candidate = {
            score,
            lineNumber: startLine,
            lineRangeStart: snippetWindow.lineRangeStart,
            lineRangeEnd: snippetWindow.lineRangeEnd,
            specificCode: snippetWindow.snippet
          };

          if (!bestMatch || candidate.score > bestMatch.score) {
            bestMatch = candidate;
          }
        }

        if (!bestMatch) {
          const fallbackWindow = getSnippetWindow(assetContent, 1, Math.min(lines.length, 24), 0);
          bestMatch = {
            score: 1,
            lineNumber: 1,
            lineRangeStart: fallbackWindow.lineRangeStart,
            lineRangeEnd: fallbackWindow.lineRangeEnd,
            specificCode: fallbackWindow.snippet
          };
        }

        return {
          fileName: path.basename(assetPath),
          filePath: assetPath.replace(/\\/g, '/'),
          relativePath: relPath,
          kind,
          lineNumber: bestMatch.lineNumber,
          lineRangeStart: bestMatch.lineRangeStart,
          lineRangeEnd: bestMatch.lineRangeEnd,
          specificCode: bestMatch.specificCode
        };
      } catch {
        return null;
      }
    };

    const runtimeHintTerms = (() => {
      const values = [
        tag,
        id,
        text,
        parentText,
        ariaLabel,
        title,
        selectorPath,
        ...(domPath as string[]),
        ...Object.keys(attributes as Record<string, string>),
        ...Object.values(attributes as Record<string, string>),
        ...Object.keys(dataAttributes as Record<string, string>),
        ...Object.values(dataAttributes as Record<string, string>)
      ];
      return [...new Set(
        values
          .map((v) => normalizeText(v))
          .filter((v) => v && v.length >= 3 && v.length < 150)
      )];
    })();

    const matchesCandidateScore = (line: string) => {
      let score = 0;
      for (const term of runtimeHintTerms) {
        if (line.toLowerCase().includes(term.toLowerCase())) score += 10;
      }
      return score;
    };

    try {
      const hintFile = resolveSourceHintFile();
      const files = getFilesRecursively(previewRoot);
      const candidates = files
        .filter((file) => !file.isDirectory)
        .map((file) => {
          const extensionScore = sourceExtScore(file.name);
          const isHintMatch = hintFile && normalizePath(file.path) === normalizePath(hintFile);
          const pathLower = file.relativePath.toLowerCase();
          
          let pathFolderScore = 0;
          if (pathLower.includes('src/components/')) pathFolderScore = 30;
          else if (pathLower.includes('src/pages/') || pathLower.includes('src/views/')) pathFolderScore = 25;
          else if (pathLower.includes('src/')) pathFolderScore = 15;

          return {
            file,
            isHintMatch,
            baseScore: extensionScore + pathFolderScore + (isHintMatch ? 200 : 0)
          };
        })
        .filter((candidate) => candidate.baseScore > 0)
        .sort((a, b) => b.baseScore - a.baseScore)
        .slice(0, 35);

      const htmlMatchSnippet = outerHTML ? normalizeHtmlFragment(outerHTML) : '';
      const normTextVal = normalizeText(text);

      let bestFileMatch: any = null;
      let bestSnippetMatch: ElementSnippetMatch | null = null;
      let maxTotalScore = -1;

      for (const { file, isHintMatch, baseScore } of candidates) {
        let content = '';
        try {
          content = fs.readFileSync(file.path, 'utf8');
        } catch {
          continue;
        }

        if (content.length > 800 * 1024) continue;

        const fileMatches: ElementSnippetMatch[] = [];

        if (htmlMatchSnippet) {
          const idx = content.indexOf(htmlMatchSnippet);
          if (idx !== -1) {
            const range = getLineRangeForSnippet(content, htmlMatchSnippet, idx);
            if (range.lineNumber) {
              fileMatches.push({
                snippet: htmlMatchSnippet,
                lineNumber: range.lineNumber,
                lineRangeStart: range.lineRangeStart!,
                lineRangeEnd: range.lineRangeEnd!,
                score: 800,
                exact: true
              });
            }
          }
        }

        const lines = content.split(/\r?\n/);
        const attrMatchers = exactAttributeMatchers();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineLower = line.toLowerCase();
          
          let score = 0;
          let matchedAttrs = 0;

          if (tag && lineLower.includes(`<${tag.toLowerCase()}`)) {
            score += 15;
            if (isSingleElementLine(line)) score += 35;
          }

          for (const matcher of attrMatchers) {
            if (lineHasAttribute(line, matcher.name, matcher.value)) {
              score += matcher.weight;
              matchedAttrs++;
            }
          }

          if (normTextVal && line.includes(normTextVal)) {
            score += Math.min(250, 40 + normTextVal.length * 2);
          }

          const hitsScore = matchesCandidateScore(line);
          score += hitsScore;

          if (score > 0) {
            fileMatches.push({
              snippet: line.trim(),
              lineNumber: i + 1,
              lineRangeStart: i + 1,
              lineRangeEnd: i + 1,
              score,
              exact: Boolean(matchedAttrs > 0 || (normTextVal && line.includes(normTextVal)))
            });
          }
        }

        if (fileMatches.length === 0) continue;

        const topMatch = fileMatches.sort((a, b) => b.score - a.score)[0];
        const combinedScore = baseScore + topMatch.score;

        if (combinedScore > maxTotalScore) {
          maxTotalScore = combinedScore;
          bestFileMatch = file;
          bestSnippetMatch = topMatch;
        }
      }

      if (bestFileMatch && bestSnippetMatch && maxTotalScore > 120) {
        const fullContent = fs.readFileSync(bestFileMatch.path, 'utf8');
        const lines = fullContent.split(/\r?\n/);
        
        const startLine = Math.max(1, bestSnippetMatch.lineRangeStart - 25);
        const endLine = Math.min(lines.length, bestSnippetMatch.lineRangeEnd + 25);
        const surroundingSnippet = lines.slice(startLine - 1, endLine).join('\n');

        const linkedAssets = bestFileMatch.name.endsWith('.html')
          ? extractStaticLinkedAssets(fullContent)
          : [];
        const relatedConnections = linkedAssets
          .map((asset) => buildRelatedAssetConnection(asset.path, asset.kind))
          .filter(Boolean);

        const elementWorkDescription = buildElementWork();

        const responsePayload = {
          success: true,
          found: true,
          filePath: bestFileMatch.path.replace(/\\/g, '/'),
          relativePath: bestFileMatch.relativePath,
          lineNumber: bestSnippetMatch.lineNumber,
          lineRangeStart: bestSnippetMatch.lineRangeStart,
          lineRangeEnd: bestSnippetMatch.lineRangeEnd,
          matchedSnippet: bestSnippetMatch.snippet,
          surroundingSnippet,
          matchScore: maxTotalScore,
          elementWorkDescription,
          connections: relatedConnections,
          linkedAssets: linkedAssets.map(asset => ({
            filePath: asset.path.replace(/\\/g, '/'),
            relativePath: path.relative(previewRoot, asset.path).replace(/\\/g, '/'),
            kind: asset.kind
          }))
        };

        return res.json(responsePayload);
      }

      res.json({
        success: true,
        found: false,
        message: "No high-confidence source code element match could be resolved in the workspace."
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to scan or analyze element source", detail: err.message });
    }
  });
}
