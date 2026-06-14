import { Composio } from "@composio/core";
import { ClaudeAgentSDKProvider } from "@composio/claude-agent-sdk";

export type ToolkitAuthMode = "managed" | "byo";

export interface CuratedToolkit {
  slug: string;
  displayName: string;
  authMode: ToolkitAuthMode;
}

export const CURATED_TOOLKITS: CuratedToolkit[] = [
  { slug: "gmail", displayName: "Gmail", authMode: "managed" },
  { slug: "googlecalendar", displayName: "Google Calendar", authMode: "managed" },
  { slug: "googledrive", displayName: "Google Drive", authMode: "managed" },
  { slug: "googlesheets", displayName: "Google Sheets", authMode: "managed" },
  { slug: "googledocs", displayName: "Google Docs", authMode: "managed" },
  { slug: "slack", displayName: "Slack", authMode: "managed" },
  { slug: "github", displayName: "GitHub", authMode: "managed" },
  { slug: "linear", displayName: "Linear", authMode: "managed" },
  { slug: "notion", displayName: "Notion", authMode: "managed" },
  { slug: "hubspot", displayName: "HubSpot", authMode: "managed" },
  { slug: "discord", displayName: "Discord", authMode: "managed" },
  { slug: "trello", displayName: "Trello", authMode: "managed" },
  { slug: "asana", displayName: "Asana", authMode: "managed" },
  { slug: "jira", displayName: "Jira", authMode: "managed" },
  { slug: "airtable", displayName: "Airtable", authMode: "managed" },
  { slug: "figma", displayName: "Figma", authMode: "managed" },
  { slug: "dropbox", displayName: "Dropbox", authMode: "managed" },
  { slug: "stripe", displayName: "Stripe", authMode: "managed" },
  { slug: "supabase", displayName: "Supabase", authMode: "managed" },
  { slug: "salesforce", displayName: "Salesforce", authMode: "managed" },
  { slug: "twitter", displayName: "Twitter / X", authMode: "byo" },
  { slug: "linkedin", displayName: "LinkedIn", authMode: "managed" },
];

let singleton: Composio<ClaudeAgentSDKProvider> | null = null;
let overrideApiKey: string | null = null;

export function setApiKey(key: string): void {
  overrideApiKey = key;
  singleton = null;
}

export function cleanApiKey(raw: string): string {
  return raw
    .trim()
    .replace(/^COMPOSIO_API_KEY=/i, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

export function getSafeKeyLog(key: string): string {
  if (!key) return "empty";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return `too-short (length: ${trimmed.length})`;
  return `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)} (length: ${trimmed.length})`;
}

export function getComposio(): Composio<ClaudeAgentSDKProvider> | null {
  if (singleton) return singleton;
  const raw = overrideApiKey || process.env.COMPOSIO_API_KEY;
  if (!raw) return null;
  const apiKey = cleanApiKey(raw);
  if (!apiKey) return null;
  singleton = new Composio<ClaudeAgentSDKProvider>({
    apiKey,
    provider: new ClaudeAgentSDKProvider(),
  });
  return singleton;
}

export function resetComposio(): void {
  singleton = null;
  overrideApiKey = null;
}

export function luminaUserId(): string {
  return process.env.COMPOSIO_USER_ID ?? "lumina-default";
}

export interface ConnectedToolkit {
  slug: string;
  connectionId: string;
  status: string;
  alias?: string;
  accountLabel?: string;
  accountEmail?: string;
  accountName?: string;
  accountAvatarUrl?: string;
  createdAt?: string;
}

export async function listConnectedToolkits(): Promise<ConnectedToolkit[]> {
  const composio = getComposio();
  if (!composio) return [];
  try {
    const resp = await composio.connectedAccounts.list({ userIds: [luminaUserId()] });
    const items = Array.isArray(resp) ? resp : (resp as any).items ?? [];
    return items.map((it: any) => ({
      slug: it.toolkit?.slug ?? it.toolkit ?? "",
      connectionId: it.id,
      status: it.status,
      alias: it.alias ?? undefined,
      accountLabel: undefined,
      accountEmail: undefined,
      accountName: undefined,
      accountAvatarUrl: undefined,
      createdAt: it.createdAt,
    }));
  } catch (err) {
    console.error("[composio] listConnectedToolkits failed", err);
    return [];
  }
}

export async function authorizeToolkit(
  slug: string,
  opts?: { callbackUrl?: string; alias?: string },
): Promise<{ redirectUrl: string | null; connectionId: string }> {
  const composio = getComposio();
  if (!composio) throw new Error("COMPOSIO_API_KEY not set");

  let authConfigId: string;
  const existingConfig = (await composio.authConfigs.list({ toolkit: slug })).items?.[0];
  if (existingConfig) {
    authConfigId = existingConfig.id;
  } else {
    const created = await composio.authConfigs.create(slug, {
      type: "use_composio_managed_auth",
      name: `${slug} Auth Config`,
    });
    authConfigId = created.id;
  }

  const conn = await composio.connectedAccounts.link(luminaUserId(), authConfigId, {
    ...(opts?.callbackUrl ? { callbackUrl: opts.callbackUrl } : {}),
    ...(opts?.alias ? { alias: opts.alias } : {}),
  });
  return { redirectUrl: conn.redirectUrl ?? null, connectionId: conn.id };
}

export async function disconnectToolkit(connectionId: string): Promise<void> {
  const composio = getComposio();
  if (!composio) throw new Error("COMPOSIO_API_KEY not set");
  await composio.connectedAccounts.delete(connectionId);
}

export async function renameConnection(connectionId: string, alias: string): Promise<void> {
  const composio = getComposio();
  if (!composio) throw new Error("COMPOSIO_API_KEY not set");
  await composio.connectedAccounts.update(connectionId, { alias } as never);
}

export async function verifyApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const cleanedKey = cleanApiKey(apiKey);
  const safeLog = getSafeKeyLog(cleanedKey);
  console.log(`[composio] verifyApiKey initiating connection test with API key: ${safeLog}`);

  try {
    const testComposio = new Composio<ClaudeAgentSDKProvider>({
      apiKey: cleanedKey,
      provider: new ClaudeAgentSDKProvider(),
    });
    await testComposio.connectedAccounts.list({ userIds: [luminaUserId()] });
    console.log(`[composio] verifyApiKey successfully validated key: ${safeLog}`);
    return { valid: true };
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode ?? (err?.message?.includes("401") ? 401 : undefined);
    console.error(`[composio] verifyApiKey failed for key ${safeLog} with status ${status}:`, err?.message || err);
    const msg = err?.message ?? String(err);
    if (status === 401 || msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid api key")) {
      return { valid: false, error: "Invalid API key" };
    }
    return { valid: false, error: msg };
  }
}

export async function listToolkitTools(slug: string): Promise<Array<{ name: string; description: string; parameters: any }>> {
  const composio = getComposio();
  if (!composio) return [];
  try {
    const tools = await composio.tools.get(luminaUserId(), { toolkits: [slug] });
    const toolArray = Array.isArray(tools) ? tools : [];
    return toolArray.map((t: any) => ({
      name: t.name || t.slug || "",
      description: t.description || "",
      parameters: t.parameters || t.inputParams || { type: "object", properties: {}, required: [] },
    }));
  } catch (err) {
    console.error(`[composio] listToolkitTools(${slug}) failed`, err);
    return [];
  }
}

export async function executeComposioTool(
  toolSlug: string,
  args: Record<string, any>,
  connectedAccountId?: string,
): Promise<{ successful: boolean; data: any; error?: string }> {
  const composio = getComposio();
  if (!composio) throw new Error("COMPOSIO_API_KEY not set");
  try {
    const result = await composio.tools.execute(toolSlug, {
      userId: luminaUserId(),
      arguments: args,
      ...(connectedAccountId ? { connectedAccountId } : {}),
      dangerouslySkipVersionCheck: true,
    }) as any;

    // Composio SDK returns: { successful: boolean, data: {...}, error?: string }
    // Normalize into a consistent shape.
    const successful = result?.successful ?? result?.success ?? true;
    const data = result?.data ?? result?.result ?? result ?? null;
    const error = result?.error ?? undefined;

    console.log(`[composio] execute ${toolSlug} -> successful=${successful}, data keys=${data ? Object.keys(data).join(',') : 'null'}`);
    return { successful, data, error };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error(`[composio] execute ${toolSlug} THREW:`, msg);
    throw new Error(`Composio tool execution failed: ${msg}`);
  }
}
