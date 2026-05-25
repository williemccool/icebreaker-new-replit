import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Medal, Sparkles, ArrowLeft } from "lucide-react";

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/leaderboard?city=Bangalore", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const rankStyles: Record<number, { bg: string; text: string; label: string }> = {
    0: { bg: "rgba(255,215,0,0.15)", text: "#FFD700", label: "🥇" },
    1: { bg: "rgba(192,192,192,0.15)", text: "#C0C0C0", label: "🥈" },
    2: { bg: "rgba(205,127,50,0.15)", text: "#CD7F32", label: "🥉" },
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="page-header">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/rewards">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 text-icebreaker-muted" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Leaderboard</h1>
            <p className="text-xs text-icebreaker-muted mt-0.5">Season 1 · Bangalore</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="card-dark animate-pulse h-16" />)}
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          leaderboard.map((entry: any, index: number) => {
            const style = rankStyles[index];
            return (
              <div
                key={entry.leaderboard.id}
                className="card-dark flex items-center gap-3 py-3"
                style={style ? { borderColor: style.text + "30" } : undefined}
                data-testid={`leaderboard-row-${index}`}
              >
                {/* Rank */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0"
                  style={style ? { background: style.bg, color: style.text } : { background: "#1F232C", color: "#8A8FA8" }}
                >
                  {style ? style.label : index + 1}
                </div>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #00CFFF 0%, #FF1B8D 100%)" }}
                >
                  {entry.user.name?.[0] || "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm truncate">{entry.user.name || "Anonymous"}</p>
                  <p className="text-xs text-icebreaker-muted">Level {entry.user.level || 1}</p>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Sparkles className="w-3.5 h-3.5 text-icebreaker-coral" />
                    <span className="font-extrabold text-icebreaker-coral">{entry.leaderboard.score}</span>
                  </div>
                  <span className="text-xs text-icebreaker-muted">pts</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-icebreaker-surface">
              <Trophy className="w-8 h-8 text-yellow-400/50" />
            </div>
            <div className="text-center">
              <p className="font-bold text-icebreaker-muted">No rankings yet</p>
              <p className="text-xs text-icebreaker-muted/60 mt-1">Be the first to check in and earn Cubes!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
