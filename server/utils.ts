import path from 'path';
import fs from 'fs';

export function resolveCoderPath(inputPath?: string, workspaceRoot?: string): string {
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
}

export function getFilesRecursively(dir: string, baseDir: string = dir): any[] {
  let results: any[] = [];
  try {
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of list) {
      const name = file.name;
      if (
        name === 'node_modules' || 
        name === '.git' || 
        name === 'dist' || 
        name === '.next' || 
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

export function escapeGlobRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function globToRegExp(pattern: string): RegExp | null {
  const normalized = String(pattern || '')
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\.\//, '');

  if (!normalized) return null;

  let regex = '';
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '*' && next === '*') {
      const afterNext = normalized[i + 2];
      if (afterNext === '/') {
        regex += '(?:.*/)?';
        i += 2;
      } else {
        regex += '.*';
        i += 1;
      }
      continue;
    }

    if (char === '*') {
      regex += '[^/]*';
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    regex += escapeGlobRegex(char);
  }

  return new RegExp(`^${regex}$`, 'i');
}

export function matchesWorkspaceGlob(filePath: string, pattern: string): boolean {
  const normalizedPath = String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const normalizedPattern = String(pattern || '').replace(/\\/g, '/').trim();

  if (!normalizedPattern) return true;

  const regex = globToRegExp(normalizedPattern);
  if (!regex) return true;

  return regex.test(normalizedPath);
}
