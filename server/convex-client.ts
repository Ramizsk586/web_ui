/**
 * convex-client.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a singleton ConvexClient for server-side use.
 * Reads CONVEX_URL from the environment (set via .env.local or system env).
 *
 * If Convex is not configured the client operations will gracefully no-op so
 * the server still starts without a Convex deployment.
 */

export function setConvexClient(client: any): void {
  (globalThis as any)._convexClient = client;
}

/**
 * Returns a singleton Convex client or a no-op stub when Convex is not
 * configured.  All server modules import from here so there is exactly one
 * connection per process.
 */
export function getConvexClient(): any {
  const globalClient = (globalThis as any)._convexClient;
  if (globalClient) return globalClient;

  const url = process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL ?? '';
  if (!url) {
    console.warn('[ConvexClient] CONVEX_URL not set — using no-op stub. Convex features will be disabled.');
    const stub = buildNoOpStub();
    (globalThis as any)._convexClient = stub;
    return stub;
  }

  try {
    // Dynamic import so the server still loads if the convex package behaves
    // differently at runtime vs build time.
    const { ConvexClient } = require('convex/browser');
    const client = new ConvexClient(url);
    console.log(`[ConvexClient] Connected to ${url}`);
    (globalThis as any)._convexClient = client;
    return client;
  } catch (err) {
    console.error('[ConvexClient] Failed to create client:', err);
    const stub = buildNoOpStub();
    (globalThis as any)._convexClient = stub;
    return stub;
  }
}

function buildNoOpStub() {
  return {
    query: async (_fn: any, _args?: any) => null,
    mutation: async (_fn: any, _args?: any) => null,
    action: async (_fn: any, _args?: any) => null,
    subscribe: (_fn: any, _args: any, _cb: any) => () => {},
  };
}
