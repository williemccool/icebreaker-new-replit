import { useQuery } from "@tanstack/react-query";
  import { Card } from "@/components/ui/card";
  import { Heart, MessageCircle } from "lucide-react";
  import { Link } from "wouter";

  export default function MatchesPage() {
    const { data: matches } = useQuery({
      queryKey: ["/api/matches"],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/matches", {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.json();
      }
    });

    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 bg-icebreaker-bg/95 backdrop-blur-lg border-b border-gray-800 p-4">
          <h1 className="text-2xl font-bold max-w-7xl mx-auto">Your Matches</h1>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-4">
          {matches && matches.length > 0 ? (
            matches.map((match: any) => (
              <Link key={match.id} href={`/chat/${match.id}`}>
                <Card className="card-dark hover:border-icebreaker-coral transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-icebreaker-orchid flex items-center justify-center font-semibold text-xl">
                      {match.otherUser?.name?.[0] || "?"}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{match.otherUser?.name}</h3>
                      {match.lastMessage && (
                        <p className="text-sm text-gray-400 line-clamp-1">
                          {match.lastMessage.body}
                        </p>
                      )}
                    </div>
                    <MessageCircle className="w-5 h-5 text-icebreaker-coral" />
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-gray-400">No matches yet</p>
              <p className="text-sm text-gray-500 mt-2">Start swiping to find your matches!</p>
            </div>
          )}
        </div>
      </div>
    );
  }