import * as fs from 'fs';
import * as path from 'path';

export interface SkillMetadata {
  name: string;
  description: string;
  path: string;
  files: string[];
}

export interface SkillFile {
  name: string;
  content: string;
  description?: string;
}

const CONFIG_PATH = '/home/Ramiz/.config/kimchi/config.json';

function getSkillPaths(): string[] {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return config.skillPaths || [];
  } catch {
    return [];
  }
}

function parseFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    frontmatter[key] = value;
  }
  
  return {
    name: frontmatter.name,
    description: frontmatter.description,
  };
}

export function discoverSkills(): SkillMetadata[] {
  const paths = getSkillPaths();
  const skills: SkillMetadata[] = [];
  const seen = new Set<string>();

  for (const basePath of paths) {
    if (!fs.existsSync(basePath)) continue;

    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(basePath, entry.name);
      const skillFile = path.join(skillPath, 'SKILL.md');
      
      if (!fs.existsSync(skillFile)) continue;
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);

      const content = fs.readFileSync(skillFile, 'utf-8');
      const parsed = parseFrontmatter(content);
      
      const files = fs.readdirSync(skillPath);
      
      skills.push({
        name: parsed.name || entry.name,
        description: parsed.description || '',
        path: skillPath,
        files,
      });
    }
  }

  return skills;
}

export function loadSkillFiles(skillName: string): SkillFile[] {
  const paths = getSkillPaths();
  
  for (const basePath of paths) {
    if (!fs.existsSync(basePath)) continue;
    
    const skillPath = path.join(basePath, skillName);
    if (!fs.existsSync(skillPath)) continue;
    
    const files = fs.readdirSync(skillPath);
    const skillFiles: SkillFile[] = [];
    
    for (const file of files) {
      const filePath = path.join(skillPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) continue;
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (file.endsWith('.md')) {
        const parsed = parseFrontmatter(content);
        skillFiles.push({
          name: file,
          content,
          description: parsed.description,
        });
      } else {
        skillFiles.push({
          name: file,
          content,
        });
      }
    }
    
    return skillFiles;
  }
  
  return [];
}

export function searchSkills(query: string): SkillMetadata[] {
  const skills = discoverSkills();
  const q = query.toLowerCase();
  
  return skills.filter(s => 
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q)
  );
}