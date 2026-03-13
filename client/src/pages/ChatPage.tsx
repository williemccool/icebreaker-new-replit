import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function ChatPage() {
  const params = useParams();
  const matchId = parseInt(params.id || "0");
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

  return (
    <div className="h-screen flex flex-col bg-icebreaker-bg">
      {/* Header */}
      <div className="page-header flex-shrink-0">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/matches">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-icebreaker-surface border border-icebreaker-border hover:border-icebreaker-coral/40 transition-all" data-testid="button-back-chat">
              <ArrowLeft className="w-4 h-4 text-icebreaker-muted" />
            </button>
          </Link>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #00CFFF 0%, #FF1B8D 100%)" }}>
            M
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm truncate">Match</p>
            <p className="text-xs text-icebreaker-teal font-medium">Online now</p>
          </div>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-icebreaker-surface border border-icebreaker-border" data-testid="button-icebreaker-ai">
            <Sparkles className="w-4 h-4 text-icebreaker-coral" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-2 max-w-lg mx-auto w-full">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-60">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.15) 0%, rgba(0,207,255,0.15) 100%)" }}>
              <Sparkles className="w-7 h-7 text-icebreaker-coral" />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm">Break the ice!</p>
              <p className="text-xs text-icebreaker-muted mt-1">Send the first message</p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => {
            const isMine = msg.senderId === user.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                <div
                  className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? "text-white rounded-br-md"
                      : "bg-icebreaker-surface text-icebreaker-text rounded-bl-md"
                  }`}
                  style={isMine ? { background: "linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)" } : undefined}
                >
                  <p>{msg.body}</p>
                  <p className="text-xs opacity-60 mt-1 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-icebreaker-border p-3" style={{ background: "rgba(14,15,19,0.96)", backdropFilter: "blur(20px)" }}>
        <div className="flex gap-2 max-w-lg mx-auto">
          <Input
            data-testid="input-message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 h-11 bg-icebreaker-surface border-icebreaker-border text-icebreaker-text placeholder:text-icebreaker-muted"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="h-11 w-11 btn-coral p-0 flex-shrink-0"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
