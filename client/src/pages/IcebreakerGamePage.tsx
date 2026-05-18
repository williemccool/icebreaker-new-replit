import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Check, Sparkles, X, Send, Lock, ArrowDown, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pickPackForMatch, TONES, TONE_COLOR, TONE_LABEL, type Tone } from "@/data/icebreakerPacks";

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80",
];

type Stage = "answering" | "complete" | "responses" | "opener" | "finished";

const PURPOSE_LABEL: Record<string, string> = {
  vibe_check: "Vibe Check",
  personality_signal: "Personality Signal",
  action_bridge: "Action Bridge",
};

// Deterministic "their" pick per round — 60% mirrors your tone, otherwise shifts one step.
function theirTone(matchId: string, roundIdx: number, yours: Tone): Tone {
  const key = `${matchId}-${roundIdx}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  if (h % 10 < 6) return yours;
  const order: Tone[] = ["flirty", "subtle", "neutral"];
  return order[(order.indexOf(yours) + 1) % order.length];
}

export default function IcebreakerGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, navigate] = useLocation();
  const [roundIdx, setRoundIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("answering");
  const [chosen, setChosen] = useState<Tone | null>(null);
  const [myAnswers, setMyAnswers] = useState<(Tone | null)[]>([null, null, null]);
  const [theirAnswers, setTheirAnswers] = useState<(Tone | null)[]>([null, null, null]);
  const [openerChoice, setOpenerChoice] = useState<Tone | null>(null);
  const [responsesTab, setResponsesTab] = useState<"you" | "them">("you");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

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
  const venueName = match?.venueName || "The Basement";

  const pack = useMemo(
    () => pickPackForMatch(matchId || "0", match?.venueType || match?.venueName),
    [matchId, match?.venueType, match?.venueName]
  );

  const round = pack.questions[roundIdx];
  const isLastRound = roundIdx === pack.questions.length - 1;
  const accent = chosen ? TONE_COLOR[chosen] : TONE_COLOR[myAnswers[roundIdx] || "flirty"];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [roundIdx, stage]);

  useEffect(() => {
    if (stage !== "responses") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStage("complete");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage]);

  const postMessage = async (body: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) throw new Error("Failed to send answer");
  };

  const handleConfirm = async () => {
    if (chosen === null || sending) return;
    setSending(true);
    try {
      const myText = round.options[chosen];
      await postMessage(`🎮 Round ${roundIdx + 1} · ${PURPOSE_LABEL[round.purpose]}\nQ: ${round.question}\nA: ${myText}`);
      const my = [...myAnswers];
      my[roundIdx] = chosen;
      setMyAnswers(my);
      const tt = theirTone(matchId || "0", roundIdx, chosen);
      const tn = [...theirAnswers];
      tn[roundIdx] = tt;
      setTheirAnswers(tn);
      setStage("complete");
    } catch {
      toast({ title: "Couldn't send answer", description: "Tap to try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSkip = () => {
    const my = [...myAnswers];
    my[roundIdx] = "neutral";
    setMyAnswers(my);
    const tt = theirTone(matchId || "0", roundIdx, "neutral");
    const tn = [...theirAnswers];
    tn[roundIdx] = tt;
    setTheirAnswers(tn);
    setStage("complete");
  };

  const handleViewResponses = () => {
    setResponsesTab("you");
    setStage("responses");
  };

  const handleContinue = () => {
    if (isLastRound) {
      // Default opener choice based on the user's dominant tone across the 3 rounds.
      const counts: Record<Tone, number> = { flirty: 0, subtle: 0, neutral: 0 };
      myAnswers.forEach((t) => t && counts[t]++);
      const dominant = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "subtle") as Tone;
      setOpenerChoice(dominant);
      setStage("opener");
      return;
    }
    setRoundIdx((i) => i + 1);
    setChosen(null);
    setStage("answering");
  };

  const handleSendOpener = async () => {
    if (!openerChoice || sending) return;
    setSending(true);
    try {
      // Unlock chat FIRST — backend gates non-"🎮 Round" messages until icebreakerCompleted is true.
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}/icebreaker`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to unlock chat");
      // Now send the opener as the user's first real chat message.
      await postMessage(pack.openers[openerChoice]);
      await queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setStage("finished");
      setTimeout(() => navigate(`/chat/${matchId}`), 1100);
    } catch {
      toast({ title: "Couldn't send opener", description: "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // ============ FINISHED STATE ============
  if (stage === "finished") {
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

  // ============ OPENER STAGE ============
  if (stage === "opener") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            onClick={() => setStage("complete")}
            className="w-9 h-9 flex items-center justify-center"
            aria-label="Back"
            data-testid="button-opener-back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2.5 flex-1 ml-2">
            <img src={otherPhoto} alt={otherName} className="w-9 h-9 rounded-full object-cover" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm">{otherName}, {otherAge}</span>
              </div>
              <span className="text-[11px] text-icebreaker-muted">All 3 rounds complete</span>
            </div>
          </div>
        </div>

        <div className="px-5 flex-1 flex flex-col">
          <div className="flex justify-center mb-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,27,141,0.1)", border: "1px solid rgba(255,27,141,0.3)" }}
            >
              <MessageCircle className="w-3 h-3 text-icebreaker-coral" />
              <span className="text-[11px] font-bold text-icebreaker-coral">Send your first message</span>
            </div>
          </div>

          <h2 className="text-center text-[22px] font-extrabold leading-tight mb-2 px-2">
            Pick an opener that fits your vibe.
          </h2>
          <p className="text-center text-sm text-icebreaker-muted mb-6">
            Tuned to both your answers — tap one to send.
          </p>

          <div className="space-y-3 mb-5">
            {TONES.map((t) => {
              const isPicked = openerChoice === t;
              const c = TONE_COLOR[t];
              return (
                <button
                  key={t}
                  onClick={() => setOpenerChoice(t)}
                  className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.99]"
                  style={
                    isPicked
                      ? { background: `${c}15`, border: `1.5px solid ${c}`, boxShadow: `0 0 20px ${c}40` }
                      : { background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }
                  }
                  data-testid={`opener-${t}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: `${c}22`, color: c }}
                    >
                      {TONE_LABEL[t]}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-white leading-snug">
                    "{pack.openers[t]}"
                  </p>
                </button>
              );
            })}
          </div>

          <div className="pb-6 mt-auto">
            <button
              onClick={handleSendOpener}
              disabled={!openerChoice || sending}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: openerChoice
                  ? `linear-gradient(135deg, ${TONE_COLOR[openerChoice]}, ${TONE_COLOR[openerChoice]}cc)`
                  : "#252530",
                boxShadow: openerChoice ? `0 4px 20px ${TONE_COLOR[openerChoice]}66` : "none",
              }}
              data-testid="button-send-opener"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending..." : "Send & Unlock Chat"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "#0A0A0C" }}>
      {/* ============ HEADER ============ */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(`/chat/${matchId}`)}
          className="w-9 h-9 flex items-center justify-center"
          aria-label="Back to chat"
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

      {/* ============ PROGRESS TRACKER ============ */}
      <div className="px-8 mb-3">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 transition-all"
            style={{ width: `${(roundIdx / (pack.questions.length - 1)) * 100}%`, background: accent }}
          />
          {pack.questions.map((_, i) => {
            const isComplete = i < roundIdx || (i === roundIdx && stage !== "answering");
            const isPending = i > roundIdx;
            const isCurrent = i === roundIdx && stage === "answering";
            const dotColor = myAnswers[i] ? TONE_COLOR[myAnswers[i]!] : (i === 0 ? "#FF1B8D" : i === 1 ? "#00CFFF" : "#FF6B9D");
            return (
              <div
                key={i}
                className="relative w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm z-10"
                style={{
                  background: isPending ? "#252530" : dotColor,
                  color: "white",
                  boxShadow: isCurrent ? `0 0 16px ${dotColor}99` : "none",
                }}
              >
                {isComplete && i < roundIdx ? <Check className="w-4 h-4" /> : i + 1}
              </div>
            );
          })}
        </div>
        <p className="text-center text-[10px] text-icebreaker-muted font-bold tracking-widest mt-2">
          {pack.roundTitle.toUpperCase()} · {PURPOSE_LABEL[round.purpose].toUpperCase()} · {roundIdx + 1}/{pack.questions.length}
        </p>
      </div>

      {/* ============ ANSWERING STAGE ============ */}
      {stage === "answering" && (
        <div className="flex-1 flex flex-col px-5">
          {/* Conversational recap of previous round */}
          {roundIdx > 0 && myAnswers[roundIdx - 1] && theirAnswers[roundIdx - 1] && (
            <div className="mb-3 rounded-2xl p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-icebreaker-coral" />
                <span className="text-[10px] font-extrabold text-icebreaker-coral uppercase tracking-wider">
                  Last round, between you two
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-icebreaker-muted w-10 shrink-0 pt-0.5">YOU</span>
                  <span className="text-[12px] font-semibold text-white">
                    {pack.questions[roundIdx - 1].options[myAnswers[roundIdx - 1]!]}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-icebreaker-teal w-10 shrink-0 pt-0.5">{otherName.toUpperCase().slice(0, 4)}</span>
                  <span className="text-[12px] font-semibold text-white">
                    {pack.questions[roundIdx - 1].options[theirAnswers[roundIdx - 1]!]}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center mt-2">
                <ArrowDown className="w-3.5 h-3.5 text-icebreaker-muted" />
              </div>
              <p className="text-center text-[11px] text-white/80 font-semibold">
                Building on that — your next move:
              </p>
            </div>
          )}

          {/* Round 1 only: icebreaker pill */}
          {roundIdx === 0 && (
            <div className="flex justify-center mb-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(0,207,255,0.1)", border: "1px solid rgba(0,207,255,0.3)" }}
              >
                <Sparkles className="w-3 h-3 text-icebreaker-teal" />
                <span className="text-[11px] font-bold text-icebreaker-teal">{pack.roundTitle}</span>
              </div>
            </div>
          )}

          <h2 className="text-center text-[22px] font-extrabold leading-tight mb-2 px-2" data-testid="text-question">
            {round.question}
          </h2>

          <p className="text-center text-[11px] text-icebreaker-muted mb-5">
            Pick your tone — your answer becomes a message to {otherName}.
          </p>

          {/* Tone-coded options */}
          <div className="space-y-3 mb-5">
            {TONES.map((t) => {
              const isPicked = chosen === t;
              const c = TONE_COLOR[t];
              return (
                <button
                  key={t}
                  onClick={() => setChosen(t)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left active:scale-[0.98]"
                  style={
                    isPicked
                      ? { background: `${c}15`, border: `1.5px solid ${c}`, boxShadow: `0 0 20px ${c}40` }
                      : { background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }
                  }
                  data-testid={`option-${t}`}
                >
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0 rounded-full"
                    style={{ background: c, color: "white", width: 44, height: 44 }}
                  >
                    <span className="text-[9px] font-extrabold uppercase tracking-wider leading-none">
                      {TONE_LABEL[t].slice(0, 3)}
                    </span>
                  </div>
                  <span className="text-[13px] font-semibold text-white leading-snug flex-1">{round.options[t]}</span>
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl mb-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {isLastRound ? (
              <>
                <Lock className="w-3 h-3 text-icebreaker-muted" />
                <span className="text-[11px] text-icebreaker-muted">Complete this round to unlock chat</span>
              </>
            ) : (
              <span className="text-[11px] text-icebreaker-muted">Your answer becomes a question for {otherName}</span>
            )}
          </div>

          <div className="pb-6 space-y-2">
            {chosen !== null ? (
              <button
                onClick={handleConfirm}
                disabled={sending}
                className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                style={{
                  background: `linear-gradient(135deg, ${TONE_COLOR[chosen]}, ${TONE_COLOR[chosen]}cc)`,
                  boxShadow: `0 4px 20px ${TONE_COLOR[chosen]}66`,
                }}
                data-testid="button-send-answer"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending..." : "Send Answer"}
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="w-full py-3.5 rounded-2xl font-extrabold text-icebreaker-teal text-sm"
                style={{ background: "transparent", border: "1.5px solid rgba(0,207,255,0.4)" }}
                data-testid="button-skip"
              >
                Skip Question
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ ROUND COMPLETE CELEBRATION ============ */}
      {stage === "complete" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => {
              const colors = ["#FF1B8D", "#00CFFF", "#FFD700", "#FF6B9D"];
              const left = (i * 47) % 100;
              const top = (i * 31) % 80;
              return (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{ background: colors[i % colors.length], left: `${left}%`, top: `${top}%`, opacity: 0.7 }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-center mb-6 relative z-10">
            <img src={myPhoto} alt={myName} className="w-20 h-20 rounded-full object-cover" style={{ border: `3px solid ${TONE_COLOR[myAnswers[roundIdx] || "flirty"]}` }} />
            <div className="w-10 h-10 rounded-full flex items-center justify-center -mx-2 z-10" style={{ background: "linear-gradient(135deg, #FF1B8D, #FF6B9D)" }}>
              <span className="text-lg">💗</span>
            </div>
            <img src={otherPhoto} alt={otherName} className="w-20 h-20 rounded-full object-cover" style={{ border: `3px solid ${TONE_COLOR[theirAnswers[roundIdx] || "subtle"]}` }} />
          </div>

          <div className="flex items-center gap-1.5 mb-2 relative z-10">
            <Sparkles className="w-4 h-4 text-icebreaker-coral" />
            <h2 className="text-xl font-extrabold">Round {roundIdx + 1} Complete!</h2>
          </div>
          <p className="text-icebreaker-muted text-sm mb-6 text-center relative z-10 max-w-xs">
            {myAnswers[roundIdx] === theirAnswers[roundIdx]
              ? `You both went ${TONE_LABEL[myAnswers[roundIdx]!].toLowerCase()} — same wavelength.`
              : `You went ${TONE_LABEL[myAnswers[roundIdx]!].toLowerCase()}, ${otherName} went ${TONE_LABEL[theirAnswers[roundIdx]!].toLowerCase()}. Nice contrast.`}
          </p>

          <div className="w-full space-y-3 relative z-10">
            <button
              onClick={handleViewResponses}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                boxShadow: `0 4px 20px ${accent}66`,
              }}
              data-testid="button-view-responses"
            >
              View Responses
            </button>
            <button
              onClick={handleContinue}
              className="w-full py-3.5 rounded-2xl font-extrabold text-icebreaker-teal text-sm"
              style={{ background: "transparent", border: "1.5px solid rgba(0,207,255,0.4)" }}
              data-testid="button-continue"
            >
              {isLastRound ? "Pick Your Opener" : `Start Round ${roundIdx + 2}`}
            </button>
          </div>
        </div>
      )}

      {/* ============ RESPONSES MODAL ============ */}
      {stage === "responses" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setStage("complete")}
          role="dialog"
          aria-modal="true"
          aria-label={`Round ${roundIdx + 1} responses`}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-5 pb-8 space-y-4"
            style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base">Round {roundIdx + 1} Responses</h3>
              <button
                onClick={() => setStage("complete")}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}
                aria-label="Close responses"
                data-testid="button-close-responses"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="flex p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              <button
                onClick={() => setResponsesTab("you")}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all"
                style={responsesTab === "you"
                  ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "white" }
                  : { color: "#8A8FA8" }}
                data-testid="tab-your-answer"
              >
                Your answer
              </button>
              <button
                onClick={() => setResponsesTab("them")}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all"
                style={responsesTab === "them"
                  ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "white" }
                  : { color: "#8A8FA8" }}
                data-testid="tab-other-answer"
              >
                {otherName}'s answer
              </button>
            </div>

            <div className="space-y-3">
              {(() => {
                const yourTone = myAnswers[roundIdx];
                const theirT = theirAnswers[roundIdx];
                const topTone = responsesTab === "you" ? yourTone : theirT;
                const bottomTone = responsesTab === "you" ? theirT : yourTone;
                const topLabel = responsesTab === "you" ? "You answered" : `${otherName} answered`;
                const bottomLabel = responsesTab === "you" ? `${otherName} answered` : "You answered";
                return (
                  <>
                    <div>
                      <p className="text-icebreaker-coral text-xs font-bold mb-1.5">{topLabel}</p>
                      <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${topTone ? TONE_COLOR[topTone] + "55" : "rgba(255,255,255,0.08)"}` }}>
                        <p className="text-sm font-semibold">{topTone ? round.options[topTone] : "—"}</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ArrowDown className="w-4 h-4 text-icebreaker-muted" />
                    </div>
                    <div>
                      <p className="text-icebreaker-coral text-xs font-bold mb-1.5">{bottomLabel}</p>
                      <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${bottomTone ? TONE_COLOR[bottomTone] + "55" : "rgba(255,255,255,0.08)"}` }}>
                        <p className="text-sm font-semibold">{bottomTone ? round.options[bottomTone] : "—"}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <button
              onClick={handleContinue}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 4px 20px ${accent}66` }}
              data-testid="button-continue-modal"
            >
              {isLastRound ? "Pick Your Opener" : `Continue to Round ${roundIdx + 2}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
