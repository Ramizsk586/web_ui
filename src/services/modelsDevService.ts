export interface ModelsDevEntry {
  id: string;
  name: string;
  family: string;
  attachment: boolean;
  reasoning: boolean;
  tool_call: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date: string;
  last_updated: string;
  modalities?: { input: string[]; output: string[] };
  open_weights: boolean;
  limit?: { context: number; output: number };
}

export interface ModelsDevCatalog {
  models: Record<string, ModelsDevEntry>;
}

let catalogCache: ModelsDevCatalog | null = null;
let catalogPromise: Promise<ModelsDevCatalog> | null = null;

export async function fetchModelsDevCatalog(): Promise<ModelsDevCatalog> {
  if (catalogCache) return catalogCache;
  if (catalogPromise) return catalogPromise;

  catalogPromise = fetch('/api/models-dev/catalog')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data: ModelsDevCatalog) => {
      catalogCache = data;
      setTimeout(() => { catalogCache = null; catalogPromise = null; }, 5 * 60 * 1000);
      return data;
    })
    .catch(err => {
      catalogPromise = null;
      throw err;
    });

  return catalogPromise;
}

export function getModelsForProvider(
  catalog: ModelsDevCatalog,
  provider: string
): Array<{ id: string; name: string; family: string }> {
  const prefix = `${provider}/`;
  return Object.entries(catalog.models || {})
    .filter(([key]) => key.startsWith(prefix))
    .map(([, entry]) => ({
      id: entry.id,
      name: entry.name,
      family: entry.family,
    }));
}

const PROVIDER_ID_ALIASES: Record<string, string[]> = {
  openai: ['openai'],
  anthropic: ['anthropic'],
  gemini: ['google'],
  'google-gemini': ['google'],
  groq: ['groq'],
  deepseek: ['deepseek'],
  openrouter: ['openrouter'],
  together: ['together'],
  mistral: ['mistral'],
  nvidia_nim: ['nvidia'],
  cohere: ['cohere'],
  sarvamai: ['sarvam'],
  kilo: ['kilo'],
  opencode: ['opencode'],
  zed: ['zed'],
  copilot: ['copilot'],
  kimchi: ['moonshotai'],
  cline: ['cline'],
  openprovider: ['openprovider'],
  freemodel_openai: [],
  freemodel_claude: [],
  ollama: ['ollama'],
  ollama_cloud: ['ollama'],
  ollama_local: ['ollama'],
  lm_studio: ['lmstudio'],
  custom: [],
};

export function getModelsForProviderId(
  catalog: ModelsDevCatalog,
  providerId: string
): Array<{ id: string; name: string; family: string }> {
  const aliases = PROVIDER_ID_ALIASES[providerId] || [providerId];
  const results: Array<{ id: string; name: string; family: string }> = [];
  const seen = new Set<string>();
  for (const alias of aliases) {
    const models = getModelsForProvider(catalog, alias);
    for (const m of models) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        results.push(m);
      }
    }
  }
  return results;
}
