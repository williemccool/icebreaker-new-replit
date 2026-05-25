import { useParams, useLocation } from "wouter";
import { X, Share2, Gamepad2, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function MutualMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, navigate] = useLocation();

  const { data: matchData } = useQuery({
    queryKey: [`/api/matches/${matchId}`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/matches/${matchId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!matchId
  });

  const match = matchData?.match;
  const otherUser = matchData?.otherUser;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(180,20,80,0.3) 0%, transparent 60%), #0A0A0C" }}>
      {/* Floating dots */}
      <div className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full opacity-60 animate-pulse" style={{ background: "#FF1B8D" }} />
      <div className="absolute bottom-1/3 right-1/4 w-2 h-2 rounded-full opacity-60 animate-pulse" style={{ background: "#00CFFF", animationDelay: "0.5s" }} />
      <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full opacity-40 animate-pulse" style={{ background: "#FF1B8D", animationDelay: "1s" }} />

      {/* Controls */}
      <div className="absolute top-6 left-4">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-close-match">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
      <div className="absolute top-6 right-4">
        <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-share-match">
          <Share2 className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="flex flex-col items-center px-8 max-w-sm w-full">
        {/* Avatar pair */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-extrabold text-white border-4 border-icebreaker-bg" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", zIndex: 2 }}>
            U
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center -mx-4 z-10" style={{ background: "#0A0A0C", border: "3px solid rgba(255,27,141,0.5)" }}>
            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "rgba(255,27,141,0.2)" }}>
              ♥
            </div>
          </div>
          {(otherUser?.photos as string[])?.[0] ? (
            <img src={(otherUser.photos as string[])[0]} alt={otherUser?.name || ""} className="w-24 h-24 rounded-full object-cover border-4 border-icebreaker-bg" style={{ zIndex: 2 }} />
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-extrabold text-white border-4 border-icebreaker-bg" style={{ background: "linear-gradient(135deg, #00CFFF, #009ecf)", zIndex: 2 }}>
              {otherUser?.name?.[0] || "?"}
            </div>
          )}
        </div>

        {/* Text */}
        <h1 className="text-5xl font-extrabold tracking-tight text-center text-white mb-3" data-testid="match-title">
          IT'S A MATCH!
        </h1>
        <p className="text-base text-center mb-1">
          You matched at{" "}
          <span className="font-bold" style={{ color: "#00CFFF" }}>{match?.venueName || "Neon High"}</span>
        </p>
        <p className="text-sm text-icebreaker-muted text-center mb-10">
          Play a quick 3-round icebreaker to unlock free chat.
        </p>

        {/* CTAs */}
        <div className="w-full space-y-3">
          <button
            onClick={() => navigate(`/game/${matchId}`)}
            className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
            data-testid="button-start-game"
          >
            <Gamepad2 className="w-5 h-5" />
            Start Icebreaker Game
          </button>

          <button
            onClick={() => navigate(`/chat/${matchId}`)}
            className="w-full h-14 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: "rgba(0,207,255,0.08)", border: "1.5px solid rgba(0,207,255,0.4)", color: "#00CFFF" }}
            data-testid="button-plan-date"
          >
            <Calendar className="w-5 h-5" />
            Plan Date at {match?.venueName || "Neon High"}
          </button>
        </div>
      </div>
    </div>
  );
}
