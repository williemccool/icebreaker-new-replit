import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

let _shared: Socket | null = null;

function getSharedSocket(): Socket | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  if (_shared && _shared.connected) return _shared;
  if (_shared) {
    try { _shared.disconnect(); } catch {}
  }
  _shared = io({
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return _shared;
}

export function useRoomSocket(roomId: number | undefined) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId || Number.isNaN(roomId)) return;
    const s = getSharedSocket();
    if (!s) return;
    socketRef.current = s;

    const onConnect = () => {
      setConnected(true);
      s.emit("room:join", { roomId });
    };
    const onDisconnect = () => setConnected(false);

    if (s.connected) onConnect();
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    return () => {
      try { s.emit("room:leave", { roomId }); } catch {}
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [roomId]);

  return { socket: socketRef.current, connected };
}
