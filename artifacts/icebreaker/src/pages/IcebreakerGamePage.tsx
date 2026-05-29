import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Sparkles, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPackById, TONES, TONE_COLOR, TONE_LABEL, type Tone, type Pack } from "@/data/icebreakerPacks";

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80",
];

type IceTurn = { turn: number; tone: Tone; senderId: number; body: string; mine: boolean };
type IceState = {
  status: "not_started" | "in_progress" | "completed";
  packId: string | null;
  initiatorId: number | null;
  currentTurn: number | null;
  currentTurnUserId: number | null;
  yourTurn: boolean;
  isInitiator: boolean | null;
  turns: IceTurn[];
  otherUser: { id: number; name: string; photos: string[]; verified: boolean } | null;
};

// The tone options the current player should choose from, given the path so far.
function optionsForTurn(pack: Pack | null, turn: number, turns: IceTurn[]): Record<Tone, string> | null {
  if (!pack) return null;
  if (turn === 1) return pack.turn1_options;
  if (turn === 2) {
    const t1 = turns[0]?.tone;
    return t1 ? pack.turn2_options[t1] : null;
  }
  if (turn === 3) {
    const t2 = turns[1]?.tone;
    return t2 ? pack.turn3_options[t2] : null;
  }
  return null;
}

export default function IcebreakerGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [picked, setPicked] = useState<Tone | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const myPhoto = (me.photos as string[])?.[0] || AVATARS[0];

  // Light match query just for the header (venue + age that the icebreaker state omits).
  const { data: matchData } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!matchId,
  });

  // The authoritative turn-based icebreaker state. Polls while waiting on the other player.
  const { data: state } = useQuery<IceState>({
    queryKey: [`/api/matches/${matchId}/icebreaker`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}/icebreaker`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load icebreaker");
      return res.json();
    },
    enabled: !!matchId,
    refetchInterval: (query) => {
      const s = query.state.data as IceState | undefined;
      if (!s || s.status === "completed") return false;
      return s.yourTurn ? false : 2500;
    },
  });

  const submit = useMutation({
    mutationFn: async (tone: Tone) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}/icebreaker-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tone, packId: state?.packId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) throw new Error(data?.error || "Failed to submit turn");
      return data as IceState;
    },
    onSuccess: (newState) => {
      setPicked(null);
      if (newState && newState.status) {
        queryClient.setQueryData([`/api/matches/${matchId}/icebreaker`], newState);
      }
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/icebreaker`] });
      if (newState?.status === "completed") {
        queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
    },
    onError: () => {
      toast({ title: "Couldn't send your turn", description: "Please try again.", variant: "destructive" });
    },
  });

  const otherFromMatch = matchData?.otherUser;
  const match = matchData?.match;
  const otherName = (state?.otherUser?.name || otherFromMatch?.name || "Alex").split(" ")[0];
  const otherAge = otherFromMatch?.dob
    ? Math.floor((Date.now() - new Date(otherFromMatch.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const otherPhoto =
    (state?.otherUser?.photos as string[])?.[0] ||
    (otherFromMatch?.photos as string[])?.[0] ||
    AVATARS[(state?.otherUser?.id || 1) % AVATARS.length];
  const venueName = match?.venueName || "the venue";

  const pack = useMemo(() => (state?.packId ? getPackById(state.packId) : null), [state?.packId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state?.turns?.length, state?.yourTurn]);

  // Route to chat once the icebreaker is complete.
  useEffect(() => {
    if (state?.status !== "completed") return;
    const t = setTimeout(() => navigate(`/chat/${matchId}`), 1200);
    return () => clearTimeout(t);
  }, [state?.status, matchId, navigate]);

  // ============ LOADING ============
  if (!state || !pack) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0C" }}>
        <Loader2 className="w-6 h-6 animate-spin text-icebreaker-coral" />
      </div>
    );
  }

  // ============ DONE STATE ============
  if (state.status === "completed") {
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

  const currentTurn = state.currentTurn ?? 3;
  const lastTurnTone = state.turns[state.turns.length - 1]?.tone;
  const accent = picked
    ? TONE_COLOR[picked]
    : lastTurnTone
    ? TONE_COLOR[lastTurnTone]
    : "#FF1B8D";
  const options = optionsForTurn(pack, currentTurn, state.turns);
  const isFinalTurn = currentTurn === 3;

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
              <span className="font-extrabold text-sm">
                {otherName}{otherAge ? `, ${otherAge}` : ""}
              </span>
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
            const isComplete = n < currentTurn;
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
          {pack.round_title.toUpperCase()} · TURN {currentTurn}/3 · {state.yourTurn ? "YOUR MOVE" : `${otherName.toUpperCase()}'S MOVE`}
        </p>
      </div>

      {/* ============ CONVERSATION THREAD ============ */}
      <div className="px-5 pb-2 space-y-2">
        {/* Screen prompt hint bubble */}
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

        {/* Played turns */}
        {state.turns.map((t) => (
          <ChatBubble
            key={t.turn}
            side={t.mine ? "me" : "them"}
            photo={t.mine ? myPhoto : otherPhoto}
            text={t.body}
            tone={t.tone}
            name={t.mine ? undefined : otherName}
          />
        ))}

        {/* Typing indicator while waiting on the other player */}
        {!state.yourTurn && state.status === "in_progress" && (
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

        <div ref={threadEndRef} />
      </div>

      {/* ============ ACTIONS ============ */}
      <div className="flex-1 flex flex-col justify-end px-5 pb-6">
        {state.yourTurn && options ? (
          <div className="space-y-3">
            <ToneOptions
              label={
                currentTurn === 1
                  ? `Pick how you want to open with ${otherName} — your message goes to them.`
                  : isFinalTurn
                  ? "This becomes your conversation closer — and unlocks the chat."
                  : `Reply to ${otherName} — choose your tone.`
              }
              options={options}
              onPick={(t) => setPicked(t)}
              picked={picked}
              testidPrefix={`turn${currentTurn}`}
            />
            <button
              onClick={() => picked && submit.mutate(picked)}
              disabled={!picked || submit.isPending}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: picked
                  ? `linear-gradient(135deg, ${TONE_COLOR[picked]}, ${TONE_COLOR[picked]}cc)`
                  : "#252530",
                boxShadow: picked ? `0 4px 20px ${TONE_COLOR[picked]}66` : "none",
              }}
              data-testid="button-send-turn"
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> {isFinalTurn ? "Send & unlock chat" : "Send reply"}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-icebreaker-coral mb-2" />
            <p className="text-sm font-bold text-white">Waiting for {otherName}…</p>
            <p className="text-[12px] text-icebreaker-muted mt-1">
              We'll let you know the moment {otherName} takes their turn.
            </p>
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
