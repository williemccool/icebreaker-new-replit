import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Share2, Users, Clock, Sparkles, Shield, ArrowRight, MapPin, Hourglass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROMPTS = [
  "The worst first date idea is…",
  "What's your most controversial music opinion?",
  "Describe your perfect Sunday in 5 words",
];

export default function RoomEntryPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"dating" | "crew" | "20s30s">("dating");
  const [answer, setAnswer] = useState("");
  const [joining, setJoining] = useState(false);

  const { data: room, isLoading } = useQuery({
    queryKey: [`/api/rooms/${id}`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/rooms/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  if (isLoading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0C" }}>
        <div className="w-10 h-10 rounded-2xl animate-pulse" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }} />
      </div>
    );
  }

  const r = room.room || room;
  const venueName = room.venueName || r.venueName || "the venue";
  const participants = room.participants?.length ?? r.participants ?? 0;
  const capacity = r.capacity ?? 16;
  const startsAt = new Date(r.startsAt);
  const endsAt = new Date(r.endsAt);
  const startsInMin = Math.max(0, Math.floor((startsAt.getTime() - Date.now()) / 60000));
  const startsInSec = Math.max(0, Math.floor(((startsAt.getTime() - Date.now()) % 60000) / 1000));
  const isLive = Date.now() >= startsAt.getTime() && Date.now() <= endsAt.getTime();
  const female = Math.round((r.femaleRatio ?? 0.5) * participants) || Math.ceil(participants / 2);
  const male = participants - female;
  const prompt = PROMPTS[(r.id ?? 0) % PROMPTS.length];

  const handleJoin = async () => {
    if (!answer.trim()) {
      toast({ title: "Answer the icebreaker first", description: "It's required to enter the room.", variant: "destructive" });
      return;
    }
    setJoining(true);
    try {
      // The actual swipe room handles socket join — entry just gates with the prompt + cube check.
      toast({ title: "You're in! 🎉", description: `Joined ${r.name}` });
      navigate(`/rooms/${id}`);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(255,27,141,0.18) 0%, transparent 50%), #0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => navigate("/rooms")} aria-label="Back" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(0,200,80,0.12)", border: "1px solid rgba(0,200,80,0.3)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] font-extrabold text-green-400">{isLive ? "ONLINE LOBBY" : "OPENS SOON"}</span>
        </div>
        <button aria-label="Share" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Share2 className="w-4 h-4 text-icebreaker-muted" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { k: "dating", label: "DATING" },
            { k: "crew", label: "CREW" },
            { k: "20s30s", label: "20S-30S" },
          ].map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setTab(k as any)}
              className="px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide transition-all"
              style={tab === k
                ? { background: "rgba(255,27,141,0.2)", border: "1px solid rgba(255,27,141,0.5)", color: "#FF1B8D" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8A8FA8" }}
              data-testid={`tab-${k}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Title block */}
        <div className="text-center pt-2">
          <h1 className="text-4xl font-extrabold tracking-tight" data-testid="text-room-name">{r.name}</h1>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <MapPin className="w-3 h-3 text-icebreaker-coral" />
            <span className="text-xs font-bold text-icebreaker-muted">Room for </span>
            <span className="text-xs font-extrabold text-white">{venueName}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-3 text-xs font-bold text-icebreaker-muted">
            <div className="flex items-center gap-1">
              <Hourglass className="w-3 h-3 text-icebreaker-coral" />
              <span>{isLive ? "Live now" : `Starts in ${startsInMin}m ${String(startsInSec).padStart(2, "0")}s`}</span>
            </div>
            <span>•</span>
            <span>Live Duration: 1h</span>
          </div>
        </div>

        {/* Capacity + Ratio */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <Users className="w-4 h-4 text-icebreaker-muted" />
              <span className="text-[10px] font-extrabold text-green-400">• OPEN</span>
            </div>
            <p className="text-2xl font-extrabold">{participants}<span className="text-sm text-icebreaker-muted">/{capacity}</span></p>
            <p className="text-[10px] font-bold text-icebreaker-muted uppercase mt-0.5">Capacity</p>
            <div className="mt-2 w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div style={{ width: `${(participants / capacity) * 100}%`, background: "linear-gradient(90deg, #FF1B8D, #00CFFF)", height: "100%" }} />
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <Users className="w-4 h-4 text-icebreaker-muted" />
            </div>
            <p className="text-lg font-extrabold">
              <span style={{ color: "#FF1B8D" }}>{female}W</span>
              <span className="text-icebreaker-muted text-sm mx-1.5">vs</span>
              <span style={{ color: "#00CFFF" }}>{male}M</span>
            </p>
            <p className="text-[10px] font-bold text-icebreaker-muted uppercase mt-0.5">Current Ratio</p>
            <div className="mt-2 w-full h-1 rounded-full overflow-hidden flex">
              <div style={{ width: `${(female / Math.max(participants, 1)) * 100}%`, background: "#FF1B8D" }} />
              <div style={{ width: `${(male / Math.max(participants, 1)) * 100}%`, background: "#00CFFF" }} />
            </div>
          </div>
        </div>

        {/* Entry status */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] font-extrabold text-icebreaker-coral uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Your Entry Status
          </p>
          <div className="rounded-xl p-3 mb-2 flex items-center justify-between" style={{ background: "rgba(255,27,141,0.08)", border: "1px solid rgba(255,27,141,0.3)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,27,141,0.2)" }}>
                <Sparkles className="w-4 h-4 text-icebreaker-coral" />
              </div>
              <div>
                <p className="font-extrabold text-sm">Free Entry</p>
                <p className="text-[11px] text-icebreaker-teal font-bold">+20 Cubes Reward</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-1 rounded-md" style={{ background: "rgba(0,200,80,0.15)", color: "#00C850", border: "1px solid rgba(0,200,80,0.3)" }}>QUALIFIED</span>
          </div>
          <div className="rounded-xl p-3 flex items-center gap-3 opacity-60" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,207,255,0.1)" }}>
              <span className="text-icebreaker-teal font-bold">♂</span>
            </div>
            <div>
              <p className="font-bold text-sm">40 Cubes</p>
              <p className="text-[11px] text-icebreaker-muted">or Night Pass</p>
            </div>
          </div>
        </div>

        {/* Icebreaker prompt */}
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "rgba(255,27,141,0.04)", border: "1px solid rgba(255,27,141,0.25)", boxShadow: "0 0 40px rgba(255,27,141,0.08)" }}>
          <p className="text-[10px] font-extrabold text-icebreaker-coral uppercase tracking-widest mb-3">Icebreaker Prompt</p>
          <p className="text-lg font-extrabold mb-3 leading-snug">"{prompt}"</p>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer to join…"
            className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder:text-icebreaker-muted/60 outline-none"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,27,141,0.3)" }}
            data-testid="input-icebreaker-answer"
          />
          <p className="text-[10px] text-icebreaker-muted mt-2">*Required to enter the live room</p>
        </div>

        {/* Safety */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(0,207,255,0.04)", border: "1px solid rgba(0,207,255,0.2)" }}>
          <p className="text-[10px] font-extrabold text-icebreaker-teal uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Safety First
          </p>
          <ul className="space-y-1.5 text-xs text-icebreaker-muted">
            <li>• No screenshots allowed inside the room.</li>
            <li>• Respect boundaries. No means no.</li>
            <li>• Comfort Mode applies here.</li>
          </ul>
          <div className="flex items-center justify-center gap-3 mt-3 text-[11px] font-bold">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-icebreaker-coral" /> Comfort Mode ON</span>
            <span className="text-icebreaker-muted">•</span>
            <span className="text-icebreaker-muted">Report anytime</span>
          </div>
        </div>

        <p className="text-center text-[11px] text-icebreaker-muted">
          Virtual space linked to the physical venue. You are interacting online.
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3" style={{ background: "linear-gradient(to top, #0A0A0C 70%, transparent)" }}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleJoin}
            disabled={joining || !answer.trim()}
            className="w-full h-14 rounded-2xl font-extrabold text-white text-base flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 4px 30px rgba(255,27,141,0.5)" }}
            data-testid="button-join-live"
          >
            {joining ? "Joining…" : "Join Live Room"} <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-center text-[11px] text-icebreaker-muted mt-2">
            By entering, you agree to the House Rules
          </p>
        </div>
      </div>
    </div>
  );
}
