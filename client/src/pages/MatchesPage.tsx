import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Clock } from "lucide-react";
import { Link } from "wouter";

export default function MatchesPage() {
  const { data: matches, isLoading } = useQuery({
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
    <div className="min-h-screen pb-24">
      <div className="page-header">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-extrabold tracking-tight">Matches</h1>
          <p className="text-xs text-icebreaker-muted mt-0.5">{matches?.length || 0} connections</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card-dark animate-pulse h-20" />)}
          </div>
        ) : matches && matches.length > 0 ? (
          matches.map((match: any) => (
            <Link key={match.id} href={`/chat/${match.id}`}>
              <div
                className="card-dark hover:border-icebreaker-coral/40 transition-all cursor-pointer flex items-center gap-3"
                data-testid={`match-card-${match.id}`}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #00CFFF 0%, #FF1B8D 100%)" }}>
                  {match.otherUser?.name?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{match.otherUser?.name || "Someone"}</p>
                  {match.lastMessage ? (
                    <p className="text-xs text-icebreaker-muted truncate mt-0.5">{match.lastMessage.body}</p>
                  ) : (
                    <p className="text-xs text-icebreaker-muted mt-0.5 italic">Say hi 👋</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-icebreaker-coral" />
                  {match.lastMessage && (
                    <span className="text-xs text-icebreaker-muted">
                      {new Date(match.lastMessage.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.15) 0%, rgba(0,207,255,0.15) 100%)" }}>
              <Heart className="w-8 h-8 text-icebreaker-coral" />
            </div>
            <div className="text-center">
              <p className="font-bold">No matches yet</p>
              <p className="text-xs text-icebreaker-muted mt-1">Join a Live room or check into a Venue to meet people!</p>
            </div>
            <Link href="/rooms">
              <button className="btn-coral text-sm">Explore Live Rooms →</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
