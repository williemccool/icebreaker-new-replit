import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Sparkles, Send, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  pickPackForMatch,
  pickOtherTone,
  TONES,
  TONE_COLOR,
  TONE_LABEL,
  type Tone,
} from "@/data/icebreakerPacks";

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80",
];

type Stage = "turn1" | "typing" | "turn2_reveal" | "turn3" | "submitting" | "done";

const TURN_LABEL: Record<number, string> = {
  1: "Your move",
  2: "Their reply",
  3: "Your reply",
};

export default function IcebreakerGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("turn1");
  const [turn1Tone, setTurn1Tone] = useState<Tone | null>(null);
  const [turn2Tone, setTurn2Tone] = useState<Tone | null>(null);
  const [turn3Tone, setTurn3Tone] = useState<Tone | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);

  const { data: matchData } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!matchId,
  });

  const otherUser = matchData?.otherUser;
  const match = matchData?.match;
  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const myName = me.name?.split(" ")[0] || "You";
  const myPhoto = (me.photos as string[])?.[0] || AVATARS[0];
  const otherName = otherUser?.name?.split(" ")[0] || "Alex";
  const otherAge = otherUser?.dob
    ? Math.floor((Date.now() - new Date(otherUser.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 24;
  const otherPhoto = (otherUser?.photos as string[])?.[0] || AVATARS[(otherUser?.id || 1) % AVATARS.length];
  const venueName = match?.venueName || "the venue";

  const pack = useMemo(
    () => pickPackForMatch(matchId || "0", match?.venueType || match?.venueName),
    [matchId, match?.venueType, match?.venueName]
  );

  // Derived texts for the current path
  const turn1Text = turn1Tone ? pack.turn1_options[turn1Tone] : null;
  const turn2Text = turn1Tone && turn2Tone ? pack.turn2_options[turn1Tone][turn2Tone] : null;
  const turn3Text =
    turn1Tone && turn2Tone && turn3Tone ? pack.turn3_options[turn2Tone][turn3Tone] : null;

  // When user picks turn1, kick off the typing animation, then deterministically pick turn2 for "them".
  useEffect(() => {
    if (stage !== "typing" || !turn1Tone) return;
    const t = setTimeout(() => {
      const tt = pickOtherTone(matchId || "0", 2, turn1Tone);
      setTurn2Tone(tt);
      setStage("turn2_reveal");
    }, 1500);
    return () => clearTimeout(t);
  }, [stage, turn1Tone, matchId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [stage, turn1Tone, turn2Tone, turn3Tone]);

  const handlePickTurn1 = (t: Tone) => {
    setTurn1Tone(t);
    setStage("typing");
  };

  const handleContinueToTurn3 = () => setStage("turn3");

  const handleSubmit = async () => {
    if (!turn1Tone || !turn2Tone || !turn3Tone) return;
    setStage("submitting");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}/icebreaker-conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packId: pack.id, turn1Tone, turn3Tone }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          await queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/messages`] });
          navigate(`/chat/${matchId}`);
          return;
        }
        throw new Error("Failed to save conversation");
      }
      await queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/messages`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setStage("done");
      setTimeout(() => navigate(`/chat/${matchId}`), 1000);
    } catch {
      toast({ title: "Couldn't save the chat", description: "Please try again.", variant: "destructive" });
      setStage("turn3");
    }
  };

  // ============ DONE STATE ============
  if (stage === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0A0A0C" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-extrabold mb-2">Chat unlocked!</h1>
          <p className="text-icebreaker-muted">Opening your chat with {otherName}...</p>
        </div>
      </div>
    );
  }

  // Which turn are we on?
  const currentTurn = stage === "turn1" ? 1 : stage === "typing" || stage === "turn2_reveal" ? 2 : 3;
  const accent =
    stage === "turn3"
      ? TONE_COLOR[turn3Tone || "flirty"]
      : turn1Tone
      ? TONE_COLOR[turn1Tone]
      : "#FF1B8D";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
      {/* ============ HEADER ============ */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(`/chat/${matchId}`)}
          className="w-9 h-9 flex items-center justify-center"
          aria-label="Back"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2.5 flex-1 ml-2">
          <img src={otherPhoto} alt={otherName} className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm">{otherName}, {otherAge}</span>
              <span className="text-icebreaker-coral text-xs">⚡</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-icebreaker-coral">📍</span>
              <span className="text-[11px] text-icebreaker-muted">Met at {venueName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ PROGRESS ============ */}
      <div className="px-8 mb-3">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 transition-all"
            style={{ width: `${((currentTurn - 1) / 2) * 100}%`, background: accent }}
          />
          {[1, 2, 3].map((n) => {
            const isComplete =
              (n === 1 && currentTurn > 1) || (n === 2 && stage === "turn3");
            const isCurrent = n === currentTurn;
            const isPending = !isComplete && !isCurrent;
            const c = isPending ? "#252530" : accent;
            return (
              <div
                key={n}
                className="relative w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm z-10"
                style={{ background: c, color: "white", boxShadow: isCurrent ? `0 0 16px ${c}99` : "none" }}
              >
                {n}
              </div>
            );
          })}
        </div>
        <p className="text-center text-[10px] text-icebreaker-muted font-bold tracking-widest mt-2">
          {pack.round_title.toUpperCase()} · TURN {currentTurn}/3 · {TURN_LABEL[currentTurn].toUpperCase()}
        </p>
      </div>

      {/* ============ CONVERSATION THREAD ============ */}
      <div className="px-5 pb-2 space-y-2">
        {/* Turn 0: screen prompt always shown as a hint bubble at the top */}
        <div
          className="rounded-2xl px-4 py-3 mx-auto max-w-[85%] text-center"
          style={{ background: "rgba(255,27,141,0.06)", border: "1px solid rgba(255,27,141,0.25)" }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-icebreaker-coral" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-icebreaker-coral">
              Conversation prompt
            </span>
          </div>
          <p className="text-[13px] font-semibold text-white leading-snug">{pack.screen_prompt}</p>
        </div>

        {/* Turn 1 bubble (you) */}
        {turn1Text && (
          <ChatBubble side="me" photo={myPhoto} text={turn1Text} tone={turn1Tone!} />
        )}

        {/* Typing indicator for Turn 2 */}
        {stage === "typing" && (
          <div className="flex items-end gap-2 max-w-[80%]">
            <img src={otherPhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="typing-indicator"
            >
              <div className="flex gap-1">
                <Dot delay={0} />
                <Dot delay={150} />
                <Dot delay={300} />
              </div>
            </div>
          </div>
        )}

        {/* Turn 2 bubble (them) */}
        {turn2Text && (
          <ChatBubble side="them" photo={otherPhoto} text={turn2Text} tone={turn2Tone!} name={otherName} />
        )}

        {/* Turn 3 bubble (you) */}
        {turn3Text && (
          <ChatBubble side="me" photo={myPhoto} text={turn3Text} tone={turn3Tone!} />
        )}

        <div ref={threadEndRef} />
      </div>

      {/* ============ STAGE-SPECIFIC ACTIONS ============ */}
      <div className="flex-1 flex flex-col justify-end px-5 pb-6">
        {stage === "turn1" && (
          <ToneOptions
            label={`Pick how you want to open with ${otherName} — your message goes to them.`}
            options={pack.turn1_options}
            onPick={handlePickTurn1}
            picked={null}
            testidPrefix="turn1"
          />
        )}

        {stage === "turn2_reveal" && (
          <div className="space-y-3">
            <p className="text-center text-[12px] text-icebreaker-muted">
              {otherName} went <span className="font-extrabold" style={{ color: TONE_COLOR[turn2Tone!] }}>{TONE_LABEL[turn2Tone!].toLowerCase()}</span>. Your turn to reply.
            </p>
            <button
              onClick={handleContinueToTurn3}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${TONE_COLOR[turn2Tone!]}, ${TONE_COLOR[turn2Tone!]}cc)`,
                boxShadow: `0 4px 20px ${TONE_COLOR[turn2Tone!]}66`,
              }}
              data-testid="button-continue-to-turn3"
            >
              <MessageCircle className="w-4 h-4" /> Pick your reply
            </button>
          </div>
        )}

        {stage === "turn3" && (
          <div className="space-y-3">
            <ToneOptions
              label="This becomes your conversation closer — and unlocks the chat."
              options={pack.turn3_options[turn2Tone!]}
              onPick={(t) => setTurn3Tone(t)}
              picked={turn3Tone}
              testidPrefix="turn3"
            />
            <button
              onClick={handleSubmit}
              disabled={!turn3Tone}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: turn3Tone
                  ? `linear-gradient(135deg, ${TONE_COLOR[turn3Tone]}, ${TONE_COLOR[turn3Tone]}cc)`
                  : "#252530",
                boxShadow: turn3Tone ? `0 4px 20px ${TONE_COLOR[turn3Tone]}66` : "none",
              }}
              data-testid="button-send-and-unlock"
            >
              <Send className="w-4 h-4" /> Send & unlock chat
            </button>
          </div>
        )}

        {stage === "submitting" && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-icebreaker-coral" />
            <span className="ml-2 text-sm text-icebreaker-muted">Saving your conversation…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatBubble({
  side,
  photo,
  text,
  tone,
  name,
}: {
  side: "me" | "them";
  photo: string;
  text: string;
  tone: Tone;
  name?: string;
}) {
  const c = TONE_COLOR[tone];
  if (side === "me") {
    return (
      <div className="flex items-end gap-2 max-w-[85%] ml-auto justify-end" data-testid={`bubble-${side}`}>
        <div
          className="rounded-2xl rounded-br-md px-4 py-3"
          style={{
            background: `linear-gradient(135deg, ${c}, ${c}cc)`,
            color: "white",
            boxShadow: `0 4px 20px ${c}55`,
          }}
        >
          <p className="text-[13px] font-semibold leading-snug">{text}</p>
        </div>
        <img src={photo} alt="" className="w-7 h-7 rounded-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2 max-w-[85%]" data-testid={`bubble-${side}`}>
      <img src={photo} alt="" className="w-7 h-7 rounded-full object-cover" />
      <div
        className="rounded-2xl rounded-bl-md px-4 py-3"
        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${c}55` }}
      >
        {name && (
          <p className="text-[10px] font-extrabold uppercase tracking-wider mb-0.5" style={{ color: c }}>
            {name}
          </p>
        )}
        <p className="text-[13px] font-semibold text-white leading-snug">{text}</p>
      </div>
    </div>
  );
}

function ToneOptions({
  label,
  options,
  onPick,
  picked,
  testidPrefix,
}: {
  label: string;
  options: Record<Tone, string>;
  onPick: (t: Tone) => void;
  picked: Tone | null;
  testidPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-center text-[12px] text-icebreaker-muted px-2">{label}</p>
      {TONES.map((t) => {
        const isPicked = picked === t;
        const c = TONE_COLOR[t];
        return (
          <button
            key={t}
            onClick={() => onPick(t)}
            className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl transition-all text-left active:scale-[0.98]"
            style={
              isPicked
                ? { background: `${c}15`, border: `1.5px solid ${c}`, boxShadow: `0 0 20px ${c}40` }
                : { background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }
            }
            data-testid={`${testidPrefix}-${t}`}
          >
            <div
              className="flex flex-col items-center justify-center flex-shrink-0 rounded-full mt-0.5"
              style={{ background: c, color: "white", width: 44, height: 44 }}
            >
              <span className="text-[9px] font-extrabold uppercase tracking-wider leading-none">
                {TONE_LABEL[t].slice(0, 3)}
              </span>
            </div>
            <span className="text-[13px] font-semibold text-white leading-snug flex-1 pt-1">{options[t]}</span>
          </button>
        );
      })}
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-icebreaker-muted"
      style={{ animation: `pulse 1.2s ${delay}ms infinite ease-in-out` }}
    />
  );
}
