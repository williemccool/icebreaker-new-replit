import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle, Trophy, ArrowLeft } from "lucide-react";

export default function QuestsPage() {
  const { data: quests, isLoading } = useQuery({
    queryKey: ["/api/quests"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/quests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const completedCount = quests?.filter((q: any) => q.progress?.completedAt).length || 0;
  const totalCount = quests?.length || 0;

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
            <h1 className="text-xl font-extrabold tracking-tight">Quests</h1>
            <p className="text-xs text-icebreaker-muted mt-0.5">Season 1 · {completedCount}/{totalCount} completed</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {/* Season progress */}
        {totalCount > 0 && (
          <div className="card-dark">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold">Season Progress</span>
              </div>
              <span className="text-sm font-extrabold text-icebreaker-coral">{completedCount}/{totalCount}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-icebreaker-surface overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(completedCount / totalCount) * 100}%`,
                  background: "linear-gradient(90deg, #FF1B8D 0%, #00CFFF 100%)"
                }}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card-dark animate-pulse h-24" />)}
          </div>
        ) : quests && quests.length > 0 ? (
          quests.map((quest: any) => {
            const progressVal = quest.progress?.progress || 0;
            const isComplete = !!quest.progress?.completedAt;
            const pct = Math.min((progressVal / quest.goalValue) * 100, 100);

            return (
              <div
                key={quest.id}
                className={`card-dark transition-all ${isComplete ? "border-icebreaker-teal/40" : ""}`}
                data-testid={`quest-card-${quest.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      {isComplete && <CheckCircle className="w-4 h-4 text-icebreaker-teal flex-shrink-0" />}
                      <h3 className="font-extrabold text-sm tracking-tight">{quest.title}</h3>
                    </div>
                    <p className="text-xs text-icebreaker-muted">{quest.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-icebreaker-coral" />
                      <span className="text-sm font-extrabold text-icebreaker-coral">+{quest.rewardCubes}</span>
                    </div>
                    <span className="text-xs text-icebreaker-muted">Cubes</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-icebreaker-muted font-medium">{progressVal} / {quest.goalValue}</span>
                    <span className={`font-bold ${isComplete ? "text-icebreaker-teal" : "text-icebreaker-coral"}`}>
                      {isComplete ? "Complete!" : `${Math.round(pct)}%`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-icebreaker-surface overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: isComplete
                          ? "#00CFFF"
                          : "linear-gradient(90deg, #FF1B8D 0%, #00CFFF 100%)"
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-icebreaker-surface">
              <Sparkles className="w-8 h-8 text-icebreaker-muted" />
            </div>
            <p className="font-bold text-icebreaker-muted">No active quests</p>
          </div>
        )}
      </div>
    </div>
  );
}
