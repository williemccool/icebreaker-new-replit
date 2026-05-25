import { useEffect, useRef, useState } from "react";
import { useRoomSocket } from "@/lib/socket";
import { Send, X, MessageCircle, Users } from "lucide-react";

type RoomMsg = {
  id: string;
  roomId: number;
  userId: number;
  name: string;
  body: string;
  at: number;
  photo?: string | null;
  system?: boolean;
};

export default function RoomChatPanel({
  roomId,
  meId,
  open,
  onClose,
}: {
  roomId: number;
  meId: number | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const { socket } = useRoomSocket(roomId);
  const [messages, setMessages] = useState<RoomMsg[]>([]);
  const [count, setCount] = useState<number>(0);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<number, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingSentAt = useRef<number>(0);

  useEffect(() => {
    if (!socket) return;

    const onHistory = (payload: { roomId: number; messages: RoomMsg[] }) => {
      if (payload?.roomId === roomId) setMessages(payload.messages || []);
    };
    const onMessage = (msg: RoomMsg) => {
      if (msg?.roomId === roomId) setMessages((prev) => [...prev, msg].slice(-100));
    };
    const onJoin = (p: { userId: number; name?: string }) => {
      setMessages((prev) =>
        [
          ...prev,
          {
            id: `sys-${Date.now()}-${p.userId}`,
            roomId,
            userId: 0,
            name: "",
            body: `${p.name || "Someone"} joined the room`,
            at: Date.now(),
            system: true,
          },
        ].slice(-100)
      );
    };
    const onLeave = (p: { userId: number }) => {
      setMessages((prev) =>
        [
          ...prev,
          {
            id: `sys-${Date.now()}-${p.userId}-out`,
            roomId,
            userId: 0,
            name: "",
            body: `Someone left the room`,
            at: Date.now(),
            system: true,
          },
        ].slice(-100)
      );
    };
    const onCount = (p: { roomId: number; count: number }) => {
      if (p?.roomId === roomId) setCount(p.count);
    };
    const onTyping = (p: { userId: number }) => {
      if (!p?.userId || (meId && p.userId === meId)) return;
      setTypingUsers((prev) => ({ ...prev, [p.userId]: Date.now() }));
    };

    socket.on("room:history", onHistory);
    socket.on("room:message", onMessage);
    socket.on("room:user_joined", onJoin);
    socket.on("room:user_left", onLeave);
    socket.on("room:count", onCount);
    socket.on("room:typing", onTyping);

    return () => {
      socket.off("room:history", onHistory);
      socket.off("room:message", onMessage);
      socket.off("room:user_joined", onJoin);
      socket.off("room:user_left", onLeave);
      socket.off("room:count", onCount);
      socket.off("room:typing", onTyping);
    };
  }, [socket, roomId, meId]);

  // Expire typing badges after 2.5s of silence.
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const next: Record<number, number> = {};
        let changed = false;
        for (const [k, v] of Object.entries(prev)) {
          if (now - v < 2500) next[Number(k)] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = () => {
    const body = text.trim();
    if (!body || !socket) return;
    socket.emit("room:message", { roomId, body });
    setText("");
  };

  const onTypingInput = (v: string) => {
    setText(v);
    if (!socket || !v.trim()) return;
    const now = Date.now();
    if (now - typingSentAt.current > 1500) {
      typingSentAt.current = now;
      socket.emit("room:typing", { roomId });
    }
  };

  const typingCount = Object.keys(typingUsers).length;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      data-testid="room-chat-panel"
    >
      <div
        className="w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{
          background: "#0F0F14",
          border: "1px solid rgba(255,27,141,0.25)",
          height: "85vh",
          boxShadow: "0 -8px 40px rgba(255,27,141,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #FF1B8D, #00CFFF)",
              }}
            >
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight">Live Room Chat</p>
              <div className="flex items-center gap-1 text-[11px] text-icebreaker-muted">
                <Users className="w-3 h-3" />
                <span data-testid="room-chat-count">{count} live</span>
                <span className="w-1 h-1 rounded-full bg-icebreaker-coral animate-pulse ml-1" />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
            data-testid="button-close-chat"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center py-12 text-icebreaker-muted text-sm">
              Be the first to say hi 👋
            </div>
          )}
          {messages.map((m) => {
            if (m.system) {
              return (
                <div key={m.id} className="text-center">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[11px] text-icebreaker-muted"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    {m.body}
                  </span>
                </div>
              );
            }
            const mine = meId && m.userId === meId;
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
                data-testid={`room-message-${m.id}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{
                    background: m.photo
                      ? `url(${m.photo}) center/cover`
                      : "linear-gradient(135deg, #FF1B8D, #00CFFF)",
                  }}
                >
                  {!m.photo && (m.name?.[0] || "?")}
                </div>
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <span className="text-[10px] text-icebreaker-muted px-1">
                    {mine ? "You" : m.name}
                  </span>
                  <div
                    className="px-3 py-2 rounded-2xl text-sm"
                    style={{
                      background: mine
                        ? "linear-gradient(135deg, #FF1B8D, #d6007a)"
                        : "rgba(255,255,255,0.06)",
                      color: "white",
                      borderTopRightRadius: mine ? 4 : undefined,
                      borderTopLeftRadius: mine ? undefined : 4,
                    }}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Typing indicator */}
        {typingCount > 0 && (
          <div className="px-4 pb-1 text-[11px] text-icebreaker-muted flex items-center gap-1" data-testid="typing-indicator">
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-icebreaker-coral animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-icebreaker-coral animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full bg-icebreaker-coral animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            {typingCount === 1 ? "Someone is typing…" : `${typingCount} people are typing…`}
          </div>
        )}

        {/* Composer */}
        <div
          className="px-3 py-3 border-t flex items-center gap-2"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <input
            value={text}
            onChange={(e) => onTypingInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Say something to the room…"
            maxLength={500}
            className="flex-1 h-11 rounded-2xl px-4 text-sm text-white outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            data-testid="input-room-message"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #FF1B8D, #d6007a)",
              boxShadow: "0 0 16px rgba(255,27,141,0.4)",
            }}
            data-testid="button-send-room-message"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
