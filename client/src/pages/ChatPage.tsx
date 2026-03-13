import { useState, useEffect, useRef } from "react";
  import { useQuery } from "@tanstack/react-query";
  import { useParams } from "wouter";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import { Send, ArrowLeft } from "lucide-react";
  import { Link } from "wouter";

  export default function ChatPage() {
    const params = useParams();
    const matchId = parseInt(params.id || "0");
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
      if (messageData) {
        setMessages(messageData);
      }
    }, [messageData]);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
      if (newMessage.trim()) {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/matches/${matchId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ body: newMessage })
        });

        if (res.ok) {
          const msg = await res.json();
          setMessages(prev => [...prev, msg]);
          setNewMessage("");
        }
      }
    };

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return (
      <div className="min-h-screen flex flex-col">
        <div className="sticky top-0 z-10 bg-icebreaker-surface border-b border-gray-800 p-4">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <Link href="/matches">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-full bg-icebreaker-orchid flex items-center justify-center font-semibold">
              M
            </div>
            <h1 className="font-bold">Match</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user.id ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                  msg.senderId === user.id
                    ? "bg-icebreaker-coral text-white"
                    : "bg-icebreaker-surface"
                }`}
              >
                <p>{msg.body}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 bg-icebreaker-surface border-t border-gray-800 p-4">
          <div className="flex gap-2 max-w-7xl mx-auto">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="bg-icebreaker-bg border-gray-700"
            />
            <Button onClick={handleSend} className="btn-coral">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }