import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Send, ArrowLeft, MoreHorizontal, Calendar, Image, Smile, Sparkles, MapPin, Lock, Check, X as XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Renders a 📅 DATE_PROPOSAL chat message as an interactive card.
// Recipient sees Accept / Decline; proposer sees a pending stamp.
function DateProposalCard({
  msg, isMe, matchId, onChange,
}: { msg: any; isMe: boolean; matchId: number; onChange: (body: string) => void }) {
  const { toast } = useToast();
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [status, setStatus] = useState<"pending" | "accepted" | "declined" | "missing">(
    msg.body.includes("❌") ? "declined" : "pending"
  );
  const [busy, setBusy] = useState(false);

  // Hydrate from server booking state so refresh/cross-device shows the right thing.
  // We bind to the most recent booking; if it's confirmed, we render Confirmed.
  useEffect(() => {
    if (status === "declined") return;
    apiRequest("GET", `/api/dates/match/${matchId}`).then(r => r.json()).then((list: any[]) => {
      const latest = (list || []).sort((a, b) => b.id - a.id)[0];
      if (!latest) { setStatus("missing"); return; }
      setBookingId(latest.id);
      if (latest.confirmed) setStatus("accepted");
    }).catch(() => {});
  }, [matchId, status]);

  const headline = msg.body.replace(/^📅 DATE_PROPOSAL\s*/, "").replace(/[✅❌]/g, "").trim();

  const act = async (kind: "confirm" | "decline") => {
    if (!bookingId) {
      toast({ title: "Invite expired", variant: "destructive" });
      setStatus("missing");
      return;
    }
    setBusy(true);
    try {
      const res = await apiRequest("POST", `/api/dates/${bookingId}/${kind}`, {});
      const data = await res.json();
      if (kind === "confirm") {
        setStatus("accepted");
        onChange(`📅 DATE_PROPOSAL ${headline} ✅`);
        toast({ title: "Date confirmed!", description: data?.cubesEarned ? `+${data.cubesEarned} cubes for you both` : undefined });
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      } else {
        setStatus("declined");
        onChange(`📅 DATE_PROPOSAL ${headline} ❌`);
        toast({ title: "Invite declined" });
      }
    } catch (e: any) {
      toast({ title: e?.message || "Couldn't update invite", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`date-card-${msg.id ?? "x"}`}>
      <div
        className="max-w-[280px] w-full rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,27,141,0.12), rgba(0,207,255,0.08))",
          border: "1px solid rgba(255,27,141,0.35)",
        }}
      >
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(255,27,141,0.18)" }}>
          <Calendar className="w-4 h-4 text-icebreaker-coral" />
          <span className="text-[10px] font-extrabold tracking-widest text-icebreaker-coral">DATE INVITE</span>
        </div>
        <div className="px-4 py-3">
          <div className="text-sm font-bold text-white leading-snug">{headline}</div>
          {status === "pending" && !isMe && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => act("decline")}
                disabled={busy}
                className="flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F2F7" }}
                data-testid="button-decline-date"
              >
                <XIcon className="w-3.5 h-3.5" /> Decline
              </button>
              <button
                onClick={() => act("confirm")}
                disabled={busy}
                className="flex-1 h-10 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#FF1B8D,#d6007a)", boxShadow: "0 0 20px rgba(255,27,141,0.35)" }}
                data-testid="button-accept-date"
              >
                <Check className="w-3.5 h-3.5" /> Accept
              </button>
            </div>
          )}
          {status === "pending" && isMe && (
            <div className="mt-2 text-[11px] font-bold tracking-widest text-icebreaker-muted">WAITING FOR REPLY…</div>
          )}
          {status === "accepted" && (
            <div className="mt-2 text-[11px] font-extrabold tracking-widest text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> CONFIRMED
            </div>
          )}
          {status === "declined" && (
            <div className="mt-2 text-[11px] font-extrabold tracking-widest text-icebreaker-muted">DECLINED</div>
          )}
          {status === "missing" && (
            <div className="mt-2 text-[11px] font-extrabold tracking-widest text-icebreaker-muted">EXPIRED</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const matchId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { toast } = useToast();

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

  const { data: matchData, isLoading: matchLoading } = useQuery({
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
    if (messageData) setMessages(Array.isArray(messageData) ? messageData : []);
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
  const icebreakerCompleted = matchData?.match?.icebreakerCompleted ?? false;

  if (matchLoading || !matchData) {
    return <div className="min-h-screen" style={{ background: "#0A0A0C" }} />;
  }

  if (!icebreakerCompleted) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => navigate("/matches")} aria-label="Back" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <p className="font-extrabold text-sm truncate">{otherUser?.name || "Match"}</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
          <div className="relative">
            {(otherUser?.photos as string[])?.[0] ? (
              <img src={(otherUser.photos as string[])[0]} alt={otherUser?.name || ""} className="w-28 h-28 rounded-full object-cover" style={{ border: "3px solid rgba(255,27,141,0.5)" }} />
            ) : (
              <div className="w-28 h-28 rounded-full flex items-center justify-center font-extrabold text-3xl text-white" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }}>
                {otherUser?.name?.[0] || "?"}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#141418", border: "2px solid #0A0A0C" }}>
              <Lock className="w-4 h-4" style={{ color: "#FF1B8D" }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold">It's a match with {otherUser?.name?.split(" ")[0] || "them"}!</h2>
            <p className="text-sm text-icebreaker-muted max-w-xs">Chat unlocks after you both play a quick 3-round icebreaker. Takes 60 seconds.</p>
          </div>
          <button
            onClick={() => navigate(`/game/${matchId}`)}
            className="w-full max-w-xs py-4 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 4px 20px rgba(255,27,141,0.4)" }}
            data-testid="button-start-icebreaker"
          >
            <Sparkles className="w-4 h-4" /> Start Icebreaker
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 sticky top-0 z-20" style={{ background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/matches")} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        {(otherUser?.photos as string[])?.[0] ? (
          <img src={(otherUser.photos as string[])[0]} alt={otherUser?.name || ""} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: "2px solid rgba(255,27,141,0.4)" }} />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }}>
            {otherUser?.name?.[0] || "?"}
          </div>
        )}
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
          const isProposal = typeof msg.body === "string" && msg.body.startsWith("📅 DATE_PROPOSAL");
          if (isProposal) {
            return (
              <DateProposalCard
                key={msg.id ?? i}
                msg={msg}
                isMe={isMe}
                matchId={matchId}
                onChange={(updatedBody) => {
                  setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, body: updatedBody } : m));
                }}
              />
            );
          }
          return (
            <div key={msg.id ?? i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                (otherUser?.photos as string[])?.[0] ? (
                  <img src={(otherUser.photos as string[])[0]} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mr-2 mt-1" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 mr-2 mt-1" style={{ background: "linear-gradient(135deg, #00CFFF, #009ecf)" }}>
                    {otherUser?.name?.[0] || "?"}
                  </div>
                )
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

      {/* (Plan Date now lives at /dates/plan/:matchId — see calendar button below.) */}

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3" style={{ background: "linear-gradient(to top, #0A0A0C 80%, transparent)" }}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            className="flex-shrink-0 p-1"
            onClick={() => navigate(`/dates/plan/${matchId}`)}
            data-testid="button-calendar"
            aria-label="Plan a date"
          >
            <Calendar className="w-5 h-5 text-icebreaker-coral" />
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
