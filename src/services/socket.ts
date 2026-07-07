import { ChatMessage } from './chatService';
import { tokenStorage } from '../utils/tokenStorage';

export interface ChatSocketEvent {
  type: 'NEW_MESSAGE' | 'NEW_MATCH';
  matchId: number;
  message?: ChatMessage;
}

type Listener = (event: ChatSocketEvent) => void;

const WS_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/^http/, 'ws') + '/ws';

const PING_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let connected = false;
let backoffMs = INITIAL_BACKOFF_MS;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

function teardown() {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  connected = false;
  if (socket) {
    socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
    try { socket.close(); } catch { /* already closed */ }
    socket = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer || listeners.size === 0) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    connect();
  }, backoffMs);
}

async function connect() {
  if (listeners.size === 0) return;
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;

  const token = await tokenStorage.get();
  if (!token) { scheduleReconnect(); return; }

  const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
  socket = ws;

  ws.onopen = () => {
    connected = true;
    backoffMs = INITIAL_BACKOFF_MS;
    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, PING_MS);
  };

  ws.onmessage = e => {
    if (e.data === 'pong') return;
    try {
      const event: ChatSocketEvent = JSON.parse(e.data);
      listeners.forEach(l => l(event));
    } catch {
      // not a chat event — ignore
    }
  };

  ws.onclose = () => {
    if (socket !== ws) return; // superseded by a newer connection
    teardown();
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose follows and handles the reconnect
  };
}

export const chatSocket = {
  /** Delivers live chat events; the socket lives while at least one subscriber exists. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    connect();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) teardown();
    };
  },

  isConnected: () => connected,
};
