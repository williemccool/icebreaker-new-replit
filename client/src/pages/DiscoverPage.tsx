import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Heart, X, MapPin, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function DiscoverPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  const { data: candidates, isLoading, refetch } = useQuery({
    queryKey: ["/api/discover/swipe"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/discover/swipe", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const swipeMutation = useMutation({
    mutationFn: async ({ swipedId, liked }: { swipedId: number; liked: boolean }) => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ swipedId, liked })
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.matched) {
        toast({ title: "🎉 It's a Match!", description: "You can now start chatting" });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
      setCurrentIndex(prev => prev + 1);
      if (currentIndex >= (candidates?.length || 0) - 3) refetch();
    }
  });

  const currentUser = candidates?.[currentIndex];
  const age = currentUser?.dob
    ? new Date().getFullYear() - new Date(currentUser.dob).getFullYear()
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-pink-cyan animate-pulse" />
          <span className="text-icebreaker-muted text-sm font-semibold">Finding people nearby...</span>
        </div>
      </div>
    );
  }

  if (!candidates || candidates.length === 0 || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-5 text-center max-w-xs">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.15) 0%, rgba(0,207,255,0.15) 100%)" }}>
            <Heart className="w-10 h-10 text-icebreaker-coral" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg tracking-tight">You're all caught up!</h3>
            <p className="text-sm text-icebreaker-muted mt-1">No more profiles to show right now.</p>
          </div>
          <Button onClick={() => { setCurrentIndex(0); refetch(); }} className="btn-coral">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 flex flex-col">
      {/* Header */}
      <div className="page-header">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">Discover</h1>
          <div className="flex items-center gap-1.5 text-xs text-icebreaker-muted font-semibold">
            <span>{currentIndex + 1}</span>
            <span>/</span>
            <span>{candidates.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="relative h-[520px] rounded-2xl overflow-hidden shadow-card" data-testid="swipe-card">
            {/* Photo / Gradient placeholder */}
            {currentUser.photos?.[0] ? (
              <img src={currentUser.photos[0]} alt={currentUser.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(160deg, #FF1B8D 0%, #00CFFF 100%)` }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-9xl font-extrabold text-white/30">
                    {currentUser.name?.[0] || "?"}
                  </span>
                </div>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.9) 100%)" }} />

            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    {currentUser.name}{age ? `, ${age}` : ""}
                  </h2>
                  {currentUser.city && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 opacity-70" />
                      <span className="text-sm opacity-80">{currentUser.city}</span>
                    </div>
                  )}
                  {currentUser.bio && (
                    <p className="text-sm opacity-75 mt-2 line-clamp-2 leading-relaxed">{currentUser.bio}</p>
                  )}
                </div>
              </div>

              {currentUser.interests && currentUser.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {currentUser.interests.slice(0, 3).map((i: string) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
                      {i}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-5 mt-5">
            <button
              onClick={() => swipeMutation.mutate({ swipedId: currentUser.id, liked: false })}
              disabled={swipeMutation.isPending}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 border-2 border-red-500/40 hover:border-red-500 hover:bg-red-500/10"
              data-testid="button-swipe-left"
            >
              <X className="w-6 h-6 text-red-400" />
            </button>

            <button
              onClick={() => swipeMutation.mutate({ swipedId: currentUser.id, liked: true })}
              disabled={swipeMutation.isPending}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-glow-coral"
              style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)" }}
              data-testid="button-swipe-right"
            >
              <Heart className="w-7 h-7 text-white fill-white" />
            </button>

            <button
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 border-2 border-icebreaker-teal/40 hover:border-icebreaker-teal hover:bg-icebreaker-teal/10"
              data-testid="button-superlike"
            >
              <Sparkles className="w-6 h-6 text-icebreaker-teal" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
