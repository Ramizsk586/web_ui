import fs from "fs";
import path from "path";

export type OpenCodeMode = "primary" | "subagent" | "all";

export type OpenCodeManifestItem = {
  id: string;
  name: string;
  description: string;
  content: string;
  sourcePath: string;
  tools: string[];
  mode: OpenCodeMode;
  permissions?: Record<string, any>;
};

export type OpenCodeWorkspaceContext = {
  available: boolean;
  root: string;
  commands: OpenCodeManifestItem[];
  agents: OpenCodeManifestItem[];
  tools: OpenCodeManifestItem[];
  config: {
    references: Record<string, string>;
    permissions: Record<string, any>;
    toolStates: Record<string, boolean>;
  } | null;
};

const COMMAND_DIRS = [
  [".lumina_opencode", "command"],
  [".lumina_opencode", "commands"],
  [".opencode", "command"],
  [".opencode", "commands"],
];

const AGENT_DIRS = [
  [".lumina_opencode", "agent"],
  [".lumina_opencode", "agents"],
  [".opencode", "agent"],
  [".opencode", "agents"],
];

const TOOL_DIRS = [
  [".lumina_opencode", "tool"],
  [".lumina_opencode", "tools"],
  [".opencode", "tool"],
  [".opencode", "tools"],
];

const normalizeSlug = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.(md|mdx|txt|ts|tsx|js|jsx|json)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const stripJsonComments = (input: string) =>
  input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1");

const parseLooseJsonc = (input: string) => {
  try {
    return JSON.parse(stripJsonComments(input));
  } catch {
    return null;
  }
};

const parseFrontmatterValue = (rawValue: string) => {
  const value = rawValue.trim();
  if (!value) return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
};

const parseFrontmatter = (rawContent: string) => {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return {
      metadata: {} as Record<string, any>,
      body: rawContent.trim(),
    };
  }

  const metadata: Record<string, any> = {};
  let activeObjectKey: string | null = null;

  for (const line of match[1].split(/\r?\n/)) {
    const objectLine = line.match(/^\s{2,}([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (objectLine && activeObjectKey) {
      if (!metadata[activeObjectKey] || typeof metadata[activeObjectKey] !== "object" || Array.isArray(metadata[activeObjectKey])) {
        metadata[activeObjectKey] = {};
      }
      metadata[activeObjectKey][objectLine[1]] = parseFrontmatterValue(objectLine[2]);
      continue;
    }

    const entry = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!entry) {
      activeObjectKey = null;
      continue;
    }

    const [, key, value] = entry;
    if (!value.trim()) {
      metadata[key] = metadata[key] && typeof metadata[key] === "object" ? metadata[key] : {};
      activeObjectKey = key;
      continue;
    }

    metadata[key] = parseFrontmatterValue(value);
    activeObjectKey = null;
  }

  return {
    metadata,
    body: match[2].trim(),
  };
};

const firstDescriptiveLine = (content: string) => {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line === "---") continue;
    return line.replace(/^[-*]\s*/, "");
  }
  return "";
};

const readManifestItems = (workspaceRoot: string, dirCandidates: string[][], fallbackMode: OpenCodeMode) => {
  const foundItems = new Map<string, OpenCodeManifestItem>();

  for (const parts of dirCandidates) {
    const dirPath = path.join(workspaceRoot, ...parts);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      continue;
    }

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (![".md", ".mdx", ".txt", ".ts", ".tsx", ".js", ".jsx", ".json"].includes(ext)) {
        continue;
      }

      const sourcePath = path.join(dirPath, entry.name);
      const rawContent = fs.readFileSync(sourcePath, "utf8");
      const { metadata, body } = parseFrontmatter(rawContent);
      const id = normalizeSlug(String(metadata.name || path.basename(entry.name, ext)));
      if (!id) continue;

      const content = (body || rawContent).trim();
      const description = String(metadata.description || firstDescriptiveLine(content) || `${toTitleCase(id)} workflow`);
      const tools = Array.isArray(metadata.tools)
        ? metadata.tools.map((tool) => normalizeSlug(String(tool))).filter(Boolean)
        : [];
      const mode = metadata.mode === "primary" || metadata.mode === "subagent" || metadata.mode === "all"
        ? metadata.mode
        : fallbackMode;

      foundItems.set(id, {
        id,
        name: String(metadata.name || toTitleCase(id)),
        description,
        content,
        sourcePath: sourcePath.replace(/\\/g, "/"),
        tools,
        mode,
        permissions: metadata.permissions && typeof metadata.permissions === "object" ? metadata.permissions : undefined,
      });
    }
  }

  return [...foundItems.values()].sort((a, b) => a.id.localeCompare(b.id));
};

const resolveConfigPath = (workspaceRoot: string) => {
  const candidates = [
    path.join(workspaceRoot, "opencode.jsonc"),
    path.join(workspaceRoot, "opencode.json"),
    path.join(workspaceRoot, ".lumina_opencode", "opencode.jsonc"),
    path.join(workspaceRoot, ".lumina_opencode", "opencode.json"),
    path.join(workspaceRoot, ".opencode", "opencode.jsonc"),
    path.join(workspaceRoot, ".opencode", "opencode.json"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

export const loadOpenCodeWorkspaceContext = (workspaceRoot: string): OpenCodeWorkspaceContext => {
  const root = path.resolve(workspaceRoot || process.cwd());
  const commands = readManifestItems(root, COMMAND_DIRS, "all");
  const agents = readManifestItems(root, AGENT_DIRS, "subagent");
  const tools = readManifestItems(root, TOOL_DIRS, "all");

  const configPath = resolveConfigPath(root);
  const parsedConfig = configPath ? parseLooseJsonc(fs.readFileSync(configPath, "utf8")) : null;

  return {
    available: commands.length > 0 || agents.length > 0 || tools.length > 0 || Boolean(parsedConfig),
    root: root.replace(/\\/g, "/"),
    commands,
    agents,
    tools,
    config: parsedConfig ? {
      references: parsedConfig.reference && typeof parsedConfig.reference === "object" ? parsedConfig.reference : {},
      permissions: parsedConfig.permission && typeof parsedConfig.permission === "object" ? parsedConfig.permission : {},
      toolStates: parsedConfig.tools && typeof parsedConfig.tools === "object" ? parsedConfig.tools : {},
    } : null,
  };
};

const AGENT_ALIASES: Record<string, string[]> = {
  build: ["build", "builder", "coder", "debugger"],
  plan: ["plan", "planner", "orchestrator", "analyzer", "reviewer"],
  general: ["general", "research", "triage", "search"],
};

export const resolveOpenCodeAgentProfile = (workspaceRoot: string, requestedName: string) => {
  const context = loadOpenCodeWorkspaceContext(workspaceRoot);
  if (!context.available || context.agents.length === 0) {
    return null;
  }

  const requested = normalizeSlug(String(requestedName || "").replace(/-agent$/i, ""));
  if (!requested) return null;

  const exact = context.agents.find((agent) => normalizeSlug(agent.id) === requested || normalizeSlug(agent.name) === requested);
  if (exact) return exact;

  for (const [target, aliases] of Object.entries(AGENT_ALIASES)) {
    if (!aliases.some((alias) => requested.includes(alias))) continue;
    const match = context.agents.find((agent) => normalizeSlug(agent.id) === target || normalizeSlug(agent.name) === target);
    if (match) return match;
  }

  return null;
};
