import type { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket): void {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
}

export function broadcast(event: string, data: unknown): void {
  const payload = JSON.stringify({ event, data, at: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  }
}
