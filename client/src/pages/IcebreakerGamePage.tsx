import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { MapPin, MoreHorizontal, Zap, Lock, Send, ChevronRight } from "lucide-react";

const ROUNDS = [
  {
    title: "THE VIBE",
    prompt: "What's your go-to late-night snack here? 🍕",
    options: [
      { tone: "SUBTLE", color: "#00CFFF", text: "Just some classic fries." },
      { tone: "NEUTRAL", color: "#8A8FA8", text: "I'm more of a pizza person." },
      { tone: "FLIRTY", color: "#FF1B8D", text: "Whatever you're buying…" },
    ]
  },
  {
    title: "THE REAL TALK",
    prompt: "Best thing about going out vs staying in? 🍷",
    options: [
      { tone: "SUBTLE", color: "#00CFFF", text: "You can always go home. 😄" },
      { tone: "NEUTRAL", color: "#8A8FA8", text: "Meeting unexpected people." },
      { tone: "FLIRTY", color: "#FF1B8D", text: "Running into someone like you." },
    ]
  },
  {
    title: "THE CLOSER",
    prompt: "If tonight ends perfectly, what does that look like? ✨",
    options: [
      { tone: "SUBTLE", color: "#00CFFF", text: "Great conversation, good vibes." },
      { tone: "NEUTRAL", color: "#8A8FA8", text: "New friendship + plans for next time." },
      { tone: "FLIRTY", color: "#FF1B8D", text: "You'll have to stick around and see." },
    ]
  }
];

export default function IcebreakerGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, navigate] = useLocation();
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const currentRound = ROUNDS[round];
  const isLast = round === ROUNDS.length - 1;

  const handleSend = () => {
    if (chosen === null) return;
    setSent(true);
    setTimeout(() => {
      if (isLast) {
        navigate(`/chat/${matchId}`);
      } else {
        setRound(r => r + 1);
        setChosen(null);
        setSent(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0A0A0C 0%, #0d0a14 100%)" }}>
      {/* Progress */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          {ROUNDS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === round ? 28 : 16, background: i <= round ? "#FF1B8D" : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>
        <p className="text-center text-xs text-icebreaker-muted font-semibold">ROUND {round + 1} OF {ROUNDS.length}</p>
      </div>

      {/* Match info */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg, #00CFFF, #009ecf)" }}>
            M
          </div>
          <div>
            <p className="font-extrabold text-base">Marcus, 26</p>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-icebreaker-coral" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-icebreaker-coral">You met at Neon High</span>
            </div>
          </div>
        </div>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <MoreHorizontal className="w-4 h-4 text-icebreaker-muted" />
        </button>
      </div>

      {/* Round label */}
      <div className="mx-5 mb-4">
        <div className="px-4 py-3 rounded-xl text-center font-extrabold text-sm uppercase tracking-widest" style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#F0F2F7" }}>
          Round {round + 1}: {currentRound.title}
        </div>
      </div>

      {/* Chat bubble */}
      <div className="px-5 mb-5">
        <p className="text-xs text-icebreaker-muted font-semibold mb-2">Marcus</p>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #00CFFF, #009ecf)" }}>M</div>
          <div className="max-w-xs px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-sm font-semibold leading-snug">{currentRound.prompt}</p>
          </div>
        </div>
      </div>

      {/* AI suggestions ready */}
      <div className="px-5 mb-4 flex justify-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: "rgba(255,27,141,0.1)", border: "1px solid rgba(255,27,141,0.3)" }}>
          <Zap className="w-3 h-3 text-icebreaker-coral" />
          <span className="text-[10px] font-bold text-icebreaker-coral uppercase tracking-widest">AI Suggestions Ready</span>
        </div>
      </div>

      {/* Options */}
      <div className="px-5 space-y-2.5 flex-1">
        {currentRound.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => setChosen(i)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left"
            style={chosen === i
              ? { background: `${opt.color}18`, border: `1.5px solid ${opt.color}`, boxShadow: `0 0 16px ${opt.color}30` }
              : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }}
            data-testid={`option-${opt.tone.toLowerCase()}`}
          >
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${opt.color}25`, color: opt.color, border: `1px solid ${opt.color}50` }}>
              {opt.tone}
            </span>
            <span className="text-sm font-semibold text-white">"{opt.text}"</span>
          </button>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="px-5 pb-8 pt-4 mt-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Lock className="w-4 h-4 text-icebreaker-muted flex-shrink-0" />
          <span className="flex-1 text-sm text-icebreaker-muted">{chosen !== null ? `"${currentRound.options[chosen].text}"` : "Select an AI response to break the ice"}</span>
          <button
            onClick={handleSend}
            disabled={chosen === null}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
            style={{ background: chosen !== null ? "linear-gradient(135deg, #FF1B8D, #d6007a)" : "rgba(255,255,255,0.1)" }}
            data-testid="button-send-response"
          >
            {sent ? <ChevronRight className="w-4 h-4 text-white" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
