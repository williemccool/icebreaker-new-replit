// Singleton Socket.IO client for the mobile app.
//
// The server authenticates the handshake with the same JWT used for REST
// (passed via `auth.token`), and derives the trusted sender identity from it.
// We keep a single shared connection for the whole app and let screens attach
// their own event listeners (and detach them on unmount).

import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./config";

let socket: Socket | null = null;

// Create (or reuse) the shared socket, ensuring it carries the latest token.
export function initSocket(token: string): Socket | null {
  if (!API_BASE_URL || !token) return null;
  if (socket) {
    (socket.auth as any) = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(API_BASE_URL, {
    transports: ["websocket"],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
