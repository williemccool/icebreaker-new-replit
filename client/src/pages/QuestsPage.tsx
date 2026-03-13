import { useQuery } from "@tanstack/react-query";
  import { Card } from "@/components/ui/card";
  import { Progress } from "@/components/ui/progress";
  import { Sparkles } from "lucide-react";

  export default function QuestsPage() {
    const { data: quests } = useQuery({
      queryKey: ["/api/quests"],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/quests", {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.json();
      }
    });

    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 bg-icebreaker-bg/95 backdrop-blur-lg border-b border-gray-800 p-4">
          <h1 className="text-2xl font-bold max-w-7xl mx-auto">Quests & Rewards</h1>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-4">
          {quests && quests.length > 0 ? (
            quests.map((quest: any) => (
              <Card key={quest.id} className="card-dark">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">{quest.title}</h3>
                    <p className="text-sm text-gray-400">{quest.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-icebreaker-coral">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold">{quest.rewardCubes}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{quest.progress?.progress || 0}/{quest.goalValue}</span>
                    <span className="text-gray-400">
                      {Math.round(((quest.progress?.progress || 0) / quest.goalValue) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={((quest.progress?.progress || 0) / quest.goalValue) * 100} 
                    className="h-2"
                  />
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-gray-400">No active quests</p>
            </div>
          )}
        </div>
      </div>
    );
  }