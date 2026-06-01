import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { initSocket, getSocket } from "@/lib/socket";
import { useAuthContext } from "@/context/AuthContext";

// Ensures the shared socket is connected for the current auth token and returns
// it (or null while signed out). `initSocket` is idempotent, so calling this in
// multiple screens is safe — they all share one connection.
export function useSocket(): Socket | null {
  const { token } = useAuthContext();
  const [sock, setSock] = useState<Socket | null>(getSocket());

  useEffect(() => {
    if (!token) {
      setSock(null);
      return;
    }
    setSock(initSocket(token));
  }, [token]);

  return sock;
}
