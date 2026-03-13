import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Send, ArrowLeft, MoreHorizontal, Calendar, Image, Smile, Sparkles } from "lucide-react";

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const matchId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const { data: messageData } = useQuery({
    queryKey: [`/api/matches/${matchId}/messages`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const { data: matchData } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  useEffect(() => {
    if (messageData) setMessages(messageData);
  }, [messageData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: newMessage })
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setNewMessage("");
    }
  };

  const otherUser = matchData?.otherUser;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 sticky top-0 z-20" style={{ background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/matches")} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }}>
          {otherUser?.name?.[0] || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm leading-tight truncate">{otherUser?.name || "Match"}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] font-semibold text-green-400">Online</span>
          </div>
        </div>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <MoreHorizontal className="w-4 h-4 text-icebreaker-muted" />
        </button>
      </div>

      {/* Ice broken banner */}
      <div className="mx-4 mt-3">
        <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl" style={{ background: "rgba(255,27,141,0.12)", border: "1px solid rgba(255,27,141,0.3)" }}>
          <Sparkles className="w-4 h-4 text-icebreaker-coral" />
          <span className="text-sm font-bold text-icebreaker-coral">✨ ICE BROKEN</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {/* Structured complete banner */}
        <div className="text-center py-3">
          <span className="text-xs text-icebreaker-muted font-semibold px-4 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Structured mode complete. You can now chat freely!
          </span>
        </div>

        {messages.map((msg: any, i: number) => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 mr-2 mt-1" style={{ background: "linear-gradient(135deg, #00CFFF, #009ecf)" }}>
                  {otherUser?.name?.[0] || "?"}
                </div>
              )}
              <div
                className="max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={isMe
                  ? { background: "linear-gradient(135deg, #FF1B8D, #d6007a)", color: "white", borderBottomRightRadius: 6 }
                  : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F2F7", borderBottomLeftRadius: 6 }}
                data-testid={`message-${i}`}
              >
                {msg.body}
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,27,141,0.1)", border: "1px solid rgba(255,27,141,0.2)" }}>
              <Sparkles className="w-8 h-8 text-icebreaker-coral" />
            </div>
            <p className="text-icebreaker-muted text-sm text-center">Ice is broken! Say something…</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3" style={{ background: "linear-gradient(to top, #0A0A0C 80%, transparent)" }}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button className="flex-shrink-0 p-1" data-testid="button-calendar">
            <Calendar className="w-5 h-5 text-icebreaker-muted" />
          </button>
          <button className="flex-shrink-0 p-1" data-testid="button-image">
            <Image className="w-5 h-5 text-icebreaker-muted" />
          </button>
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-icebreaker-muted/50 outline-none"
            data-testid="input-message"
          />
          <button className="flex-shrink-0 p-1" data-testid="button-emoji">
            <Smile className="w-5 h-5 text-icebreaker-muted" />
          </button>
          <button
            onClick={handleSend}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: newMessage.trim() ? "linear-gradient(135deg, #FF1B8D, #d6007a)" : "rgba(255,255,255,0.08)" }}
            data-testid="button-send"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
