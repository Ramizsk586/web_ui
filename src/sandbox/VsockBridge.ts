import net from 'net';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VmId, VsockMessage, VSOCK_PORT } from './types';
import { createLogger } from './SandboxHealth';

const log = createLogger('VsockBridge');

type MessageHandler = (msg: VsockMessage) => Promise<VsockMessage | null>;

export class VsockBridge {
  private server: net.Server | null = null;
  private clients: Map<string, net.Socket> = new Map();
  private handlers: Map<string, MessageHandler> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pipeDir: string;

  constructor(pipeDir: string) {
    this.pipeDir = pipeDir;
    fs.mkdirSync(pipeDir, { recursive: true });
  }

  registerHandler(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  async start(): Promise<void> {
    if (this.server) {
      // Idempotency: if we already started a server, reuse it.
      try {
        const addr = this.server.address?.();
        if (addr) return;
      } catch {
        // continue to (re)start
      }
    }

    const pipePath = path.join(this.pipeDir, 'lumina-sandbox.ipc');

    return new Promise((resolve, reject) => {
      if (process.platform === 'win32') {
        const namedPipe = `\\\\.\\pipe\\lumina-sandbox`;

        // If another instance already bound the pipe, reuse it gracefully.
        // Best-effort: attempt to create server; if EADDRINUSE then resolve.
        this.server = net.createServer((socket) => {
          this.handleConnection(socket);
        });

        this.server.once('listening', () => {
          log.info(`IPC server listening on named pipe: ${namedPipe}`);
          this.startHeartbeat();
          resolve();
        });

        this.server.on('error', (err: any) => {
          const msg = err?.message || String(err);
          log.error(`IPC server error: ${msg}`);

          // EADDRINUSE: address already in use. Another process/server likely already started.
          if (msg.includes('EADDRINUSE')) {
            try {
              // Stop our server object; keep the other process running.
              this.server?.close?.();
            } catch {}
            this.server = null;
            resolve();
            return;
          }

          reject(err);
        });

        try {
          this.server.listen(namedPipe);
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (msg.includes('EADDRINUSE')) {
            this.server = null;
            resolve();
            return;
          }
          reject(e);
        }
      } else {
        const socketPath = `/tmp/lumina-sandbox.sock`;
        try { fs.unlinkSync(socketPath); } catch {}

        this.server = net.createServer((socket) => {
          this.handleConnection(socket);
        });

        this.server.once('listening', () => {
          log.info(`IPC server listening on socket: ${socketPath}`);
          fs.chmodSync(socketPath, 0o600);
          this.startHeartbeat();
          resolve();
        });

        this.server.on('error', (err) => {
          log.error(`IPC server error: ${err.message}`);
          reject(err);
        });

        this.server.listen(socketPath);
      }
    });
  }

  private handleConnection(socket: net.Socket): void {
    const clientId = uuidv4();
    this.clients.set(clientId, socket);

    let buffer = '';

    socket.on('data', (data: Buffer) => {
      buffer += data.toString();
      const messages = buffer.split('\n');
      buffer = messages.pop() || '';

      for (const msgStr of messages) {
        if (!msgStr.trim()) continue;
        try {
          const msg: VsockMessage = JSON.parse(msgStr);
          this.processMessage(clientId, msg);
        } catch (e) {
          log.warn(`Failed to parse message: ${(e as Error).message}`);
        }
      }
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
    });

    socket.on('error', (err) => {
      log.error(`Client socket error: ${err.message}`);
      this.clients.delete(clientId);
    });
  }

  private async processMessage(clientId: string, msg: VsockMessage): Promise<void> {
    const handler = this.handlers.get(msg.type);
    if (!handler) {
      log.warn(`No handler for message type: ${msg.type}`);
      const errorMsg: VsockMessage = {
        type: 'error',
        id: msg.id,
        payload: { error: `No handler for type: ${msg.type}` },
        timestamp: Date.now(),
      };
      this.sendToClient(clientId, errorMsg);
      return;
    }

    try {
      const response = await handler(msg);
      if (response) {
        this.sendToClient(clientId, response);
      }
    } catch (e: any) {
      const errorMsg: VsockMessage = {
        type: 'error',
        id: msg.id,
        payload: { error: e.message },
        timestamp: Date.now(),
      };
      this.sendToClient(clientId, errorMsg);
    }
  }

  private sendToClient(clientId: string, msg: VsockMessage): void {
    const socket = this.clients.get(clientId);
    if (socket && !socket.destroyed) {
      socket.write(JSON.stringify(msg) + '\n');
    }
  }

  sendToVm(vmId: VmId, msg: VsockMessage): void {
    for (const [, socket] of this.clients) {
      try {
        socket.write(JSON.stringify({ ...msg, _vmId: vmId.id }) + '\n');
      } catch {}
    }
  }

  broadcast(msg: VsockMessage): void {
    for (const [, socket] of this.clients) {
      try {
        socket.write(JSON.stringify(msg) + '\n');
      } catch {}
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const hb: VsockMessage = {
        type: 'heartbeat',
        id: 'hb-' + Date.now(),
        payload: { timestamp: Date.now() },
        timestamp: Date.now(),
      };
      this.broadcast(hb);
    }, 5000);
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    for (const [, socket] of this.clients) {
      try { socket.destroy(); } catch {}
    }
    this.clients.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  createVsockMessage(type: VsockMessage['type'], payload: any, id?: string): VsockMessage {
    return {
      type,
      id: id || uuidv4(),
      payload,
      timestamp: Date.now(),
    };
  }
}
