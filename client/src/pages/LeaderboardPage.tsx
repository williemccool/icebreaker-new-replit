import { useQuery } from "@tanstack/react-query";
  import { Card } from "@/components/ui/card";
  import { Trophy } from "lucide-react";

  export default function LeaderboardPage() {
    const { data: leaderboard } = useQuery({
      queryKey: ["/api/leaderboard"],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/leaderboard?city=Bangalore", {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.json();
      }
    });

    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 bg-icebreaker-bg/95 backdrop-blur-lg border-b border-gray-800 p-4">
          <h1 className="text-2xl font-bold max-w-7xl mx-auto">Leaderboard</h1>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-4">
          {leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((entry: any, index: number) => (
              <Card key={entry.leaderboard.id} className="card-dark">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                    index === 1 ? "bg-gray-400/20 text-gray-400" :
                    index === 2 ? "bg-orange-600/20 text-orange-600" :
                    "bg-icebreaker-surface"
                  }`}>
                    {index + 1}
                  </div>

                  <div className="w-12 h-12 rounded-full bg-icebreaker-orchid flex items-center justify-center font-semibold">
                    {entry.user.name?.[0] || "?"}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold">{entry.user.name}</h3>
                    <p className="text-sm text-gray-400">Level {entry.user.level || 1}</p>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-icebreaker-coral">{entry.leaderboard.score}</div>
                    <div className="text-xs text-gray-400">points</div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-gray-400">No leaderboard data yet</p>
            </div>
          )}
        </div>
      </div>
    );
  }