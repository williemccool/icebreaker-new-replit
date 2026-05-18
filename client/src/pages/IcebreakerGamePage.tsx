import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Check, Sparkles, X, Send, Lock, ArrowDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Option = { letter: string; text: string };
type Round = { title: string; question: string; options: Option[]; otherAnswerIdx: number };

const ROUNDS: Round[] = [
  {
    title: "Icebreaker Round",
    question: "What's the most spontaneous thing you've ever done? 🌶️",
    options: [
      { letter: "A", text: "Booked a solo trip to Goa at 2 AM 🚗🌊" },
      { letter: "B", text: "Tried skydiving on a random weekend 🪂" },
      { letter: "C", text: "Said yes to a last-minute road trip 🚗" },
    ],
    otherAnswerIdx: 0,
  },
  {
    title: "Round 2",
    question: "If we had a free day together, what would we probably be doing? 🎯",
    options: [
      { letter: "A", text: "Exploring a new café, then catching a sunset 🌅" },
      { letter: "B", text: "Hiking to somewhere quiet and peaceful 🏔️" },
      { letter: "C", text: "Trying a new activity just for fun 🎨" },
    ],
    otherAnswerIdx: 0,
  },
  {
    title: "Round 3",
    question: "What's a fun fact about you that most people don't know? 🤫",
    options: [
      { letter: "A", text: "I can solve a Rubik's cube in under 2 minutes 🧩" },
      { letter: "B", text: "I collect vinyls 🎵" },
      { letter: "C", text: "I once won a talent show 🏆" },
    ],
    otherAnswerIdx: 0,
  },
];

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80",
];

type Stage = "answering" | "complete" | "responses" | "finished";

export default function IcebreakerGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, navigate] = useLocation();
  const [roundIdx, setRoundIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("answering");
  const [chosen, setChosen] = useState<number | null>(null);
  const [myAnswers, setMyAnswers] = useState<(number | null)[]>([null, null, null]);
  const [responsesTab, setResponsesTab] = useState<"you" | "them">("you");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const accent = roundIdx === 0 ? "#FF1B8D" : "#00CFFF";

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

  const round = ROUNDS[roundIdx];
  const isLastRound = roundIdx === ROUNDS.length - 1;

  // Auto-scroll to top on round change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [roundIdx, stage]);

  // Keyboard escape closes responses modal
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
      await postMessage(`🎮 Round ${roundIdx + 1}: "${round.options[chosen].text}"`);
      const next = [...myAnswers];
      next[roundIdx] = chosen;
      setMyAnswers(next);
      setStage("complete");
    } catch {
      toast({ title: "Couldn't send answer", description: "Tap to try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSkip = () => {
    const next = [...myAnswers];
    next[roundIdx] = -1; // skipped marker
    setMyAnswers(next);
    setStage("complete");
  };

  const handleViewResponses = () => {
    setResponsesTab("you");
    setStage("responses");
  };

  const handleContinue = async () => {
    if (isLastRound) {
      setStage("finished");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/matches/${matchId}/icebreaker`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to unlock chat");
        await queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
        await queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      } catch {
        toast({ title: "Couldn't unlock chat", description: "Please try again.", variant: "destructive" });
      }
      setTimeout(() => navigate(`/chat/${matchId}`), 1500);
      return;
    }
    setRoundIdx((i) => i + 1);
    setChosen(null);
    setStage("answering");
  };

  // ============ FINISHED STATE ============
  if (stage === "finished") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0A0A0C" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-extrabold mb-2">All 3 rounds complete!</h1>
          <p className="text-icebreaker-muted">Opening your chat with {otherName}...</p>
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
      <div className="px-8 mb-4">
        <div className="flex items-center justify-between relative">
          {/* Background line */}
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2" style={{ background: "rgba(255,255,255,0.1)" }} />
          {/* Filled line */}
          <div
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 transition-all"
            style={{
              width: `${(roundIdx / (ROUNDS.length - 1)) * 100}%`,
              background: accent,
            }}
          />
          {ROUNDS.map((_, i) => {
            const dotColor = i === 0 ? "#FF1B8D" : "#00CFFF";
            const isComplete = i < roundIdx || (i === roundIdx && stage !== "answering");
            const isCurrent = i === roundIdx && stage === "answering";
            const isPending = i > roundIdx;
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
        <p className="text-center text-[11px] text-icebreaker-muted font-bold tracking-widest mt-3">
          ROUND {roundIdx + 1} OF {ROUNDS.length}
        </p>
      </div>

      {/* ============ ANSWERING STAGE ============ */}
      {stage === "answering" && (
        <div className="flex-1 flex flex-col px-5">
          {/* Show other person's previous answer for rounds 2 & 3 */}
          {roundIdx > 0 && myAnswers[roundIdx - 1] !== null && (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-icebreaker-coral" />
                <span className="text-xs font-bold text-icebreaker-coral">{otherName} answered</span>
              </div>
              <div
                className="px-4 py-3 rounded-2xl mb-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                data-testid="text-other-answer"
              >
                <p className="text-sm font-semibold text-white">
                  {ROUNDS[roundIdx - 1].options[ROUNDS[roundIdx - 1].otherAnswerIdx].text}
                </p>
              </div>
              <div className="flex justify-center mb-2">
                <ArrowDown className="w-4 h-4 text-icebreaker-muted" />
              </div>
              <p className="text-center text-sm font-bold mb-4" style={{ color: accent }}>
                {isLastRound ? `Your last question for ${otherName}` : "Now it's your turn!"}
              </p>
            </>
          )}

          {/* Round 1 only: icebreaker pill */}
          {roundIdx === 0 && (
            <div className="flex justify-center mb-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(0,207,255,0.1)", border: "1px solid rgba(0,207,255,0.3)" }}
              >
                <Sparkles className="w-3 h-3 text-icebreaker-teal" />
                <span className="text-[11px] font-bold text-icebreaker-teal">Icebreaker Round</span>
              </div>
            </div>
          )}

          {/* Main question */}
          <h2 className="text-center text-[22px] font-extrabold leading-tight mb-3 px-2" data-testid="text-question">
            {round.question}
          </h2>

          {/* Sub-hint for round 1 */}
          {roundIdx === 0 && (
            <div className="flex items-center justify-center gap-1.5 mb-6">
              <Sparkles className="w-3 h-3 text-icebreaker-coral" />
              <span className="text-[11px] text-icebreaker-muted">{otherName}'s answer will be sent to you</span>
            </div>
          )}

          {roundIdx > 0 && <div className="mb-6" />}

          {/* Options */}
          <div className="space-y-3 mb-5">
            {round.options.map((opt, i) => {
              const isPicked = chosen === i;
              const dotColor = accent;
              return (
                <button
                  key={i}
                  onClick={() => setChosen(i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left active:scale-[0.98]"
                  style={
                    isPicked
                      ? { background: `${dotColor}15`, border: `1.5px solid ${dotColor}`, boxShadow: `0 0 20px ${dotColor}40` }
                      : { background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }
                  }
                  data-testid={`option-${opt.letter.toLowerCase()}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-sm"
                    style={{ background: dotColor, color: "white" }}
                  >
                    {opt.letter}
                  </div>
                  <span className="text-[13px] font-semibold text-white leading-snug flex-1">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Helper text */}
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
              <span className="text-[11px] text-icebreaker-muted">Your answer will become a question for {otherName}</span>
            )}
          </div>

          {/* Bottom action */}
          <div className="pb-6 space-y-2">
            {chosen !== null ? (
              <button
                onClick={handleConfirm}
                disabled={sending}
                className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                style={{
                  background: roundIdx === 0
                    ? "linear-gradient(135deg, #FF1B8D, #d6007a)"
                    : "linear-gradient(135deg, #00CFFF, #0099cc)",
                  boxShadow: `0 4px 20px ${accent}66`,
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
          {/* Confetti dots */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => {
              const colors = ["#FF1B8D", "#00CFFF", "#FFD700", "#FF6B9D"];
              const left = (i * 47) % 100;
              const top = (i * 31) % 80;
              return (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background: colors[i % colors.length],
                    left: `${left}%`,
                    top: `${top}%`,
                    opacity: 0.7,
                  }}
                />
              );
            })}
          </div>

          {/* Two avatars with heart */}
          <div className="flex items-center justify-center mb-6 relative z-10">
            <img
              src={myPhoto}
              alt={myName}
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: "3px solid #FF1B8D" }}
            />
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center -mx-2 z-10"
              style={{ background: "linear-gradient(135deg, #FF1B8D, #FF6B9D)" }}
            >
              <span className="text-lg">💗</span>
            </div>
            <img
              src={otherPhoto}
              alt={otherName}
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: "3px solid #00CFFF" }}
            />
          </div>

          <div className="flex items-center gap-1.5 mb-2 relative z-10">
            <Sparkles className="w-4 h-4 text-icebreaker-coral" />
            <h2 className="text-xl font-extrabold">Round {roundIdx + 1} Complete!</h2>
          </div>
          <p className="text-icebreaker-muted text-sm mb-8 text-center relative z-10">
            Great answers! You're a good match.
          </p>

          <div className="w-full space-y-3 relative z-10">
            <button
              onClick={handleViewResponses}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm"
              style={{
                background: roundIdx === 0
                  ? "linear-gradient(135deg, #FF1B8D, #d6007a)"
                  : "linear-gradient(135deg, #00CFFF, #0099cc)",
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
              {isLastRound ? "Start Chatting" : `Start Round ${roundIdx + 2}`}
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

            {/* Tab toggle */}
            <div
              className="flex p-1 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <button
                onClick={() => setResponsesTab("you")}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all"
                style={
                  responsesTab === "you"
                    ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "white" }
                    : { color: "#8A8FA8" }
                }
                data-testid="tab-your-answer"
              >
                Your answer
              </button>
              <button
                onClick={() => setResponsesTab("them")}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all"
                style={
                  responsesTab === "them"
                    ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "white" }
                    : { color: "#8A8FA8" }
                }
                data-testid="tab-other-answer"
              >
                {otherName}'s answer
              </button>
            </div>

            {/* Both answers display */}
            <div className="space-y-3">
              <div>
                <p className="text-icebreaker-coral text-xs font-bold mb-1.5">
                  {responsesTab === "you" ? "You answered" : `${otherName} answered`}
                </p>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-sm font-semibold">
                    {responsesTab === "you"
                      ? myAnswers[roundIdx] !== null && myAnswers[roundIdx]! >= 0
                        ? round.options[myAnswers[roundIdx]!].text
                        : "You skipped this question"
                      : round.options[round.otherAnswerIdx].text}
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-4 h-4 text-icebreaker-muted" />
              </div>

              <div>
                <p className="text-icebreaker-coral text-xs font-bold mb-1.5">
                  {responsesTab === "you" ? `${otherName} answered` : "You answered"}
                </p>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-sm font-semibold">
                    {responsesTab === "you"
                      ? round.options[round.otherAnswerIdx].text
                      : myAnswers[roundIdx] !== null && myAnswers[roundIdx]! >= 0
                      ? round.options[myAnswers[roundIdx]!].text
                      : "You skipped this question"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                boxShadow: `0 4px 20px ${accent}66`,
              }}
              data-testid="button-continue-modal"
            >
              {isLastRound ? "Start Chatting" : `Continue to Round ${roundIdx + 2}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
