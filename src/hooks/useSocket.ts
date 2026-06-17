import { useEffect, useRef, useState } from "react";

export interface SocketEvent {
  event: string;
  data: unknown;
  at: number;
}

export function useSocket(onEvent?: (e: SocketEvent) => void) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (cancelled) return;
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const host = location.host;
      const url = `${proto}//${host}/ws`;
      ws = new WebSocket(url);
      
      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setConnected(true);
      };
      
      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          const delay = Math.min(1500 * (reconnectAttemptsRef.current + 1), 5000);
          reconnectAttemptsRef.current += 1;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
      
      ws.onerror = () => {
        // Let the browser drive the close lifecycle; force-closing while the
        // socket is still connecting causes noisy "closed before established" warnings.
      };
      
      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data) as SocketEvent;
          handlerRef.current?.(parsed);
        } catch {
          /* ignore */
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    };
  }, []);

  return { connected };
}
