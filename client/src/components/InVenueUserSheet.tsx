import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { X, Heart, Gift, MapPin, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: number | null;
  venueName?: string;
  onClose: () => void;
}

export default function InVenueUserSheet({ userId, venueName, onClose }: Props) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Lock body scroll while open.
  useEffect(() => {
    if (userId == null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [userId]);

  const { data, isLoading } = useQuery<{ user?: any }>({
    queryKey: [`/api/users/${userId}`],
    enabled: userId != null,
  });
  const user = data?.user;

  const sendLike = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/swipe", { swipedId: userId, liked: true });
      return res.json();
    },
    onSuccess: (d: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      if (d?.match) {
        toast({ title: "It's a match!", description: `You and ${user?.name?.split(" ")[0] ?? "they"} liked each other` });
        onClose();
        navigate(`/match/${d.match.id}`);
      } else {
        toast({ title: "Like sent", description: `${user?.name?.split(" ")[0] ?? "They"}'ll know you're interested.` });
        onClose();
      }
    },
    onError: (err: any) => toast({ title: err?.message || "Couldn't send like", variant: "destructive" }),
  });

  if (userId == null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="sheet-in-venue-user">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
        data-testid="sheet-backdrop"
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg rounded-t-3xl px-5 pt-3 pb-7"
        style={{
          background: "linear-gradient(180deg, #15101A 0%, #0A0A0C 100%)",
          border: "1px solid rgba(255,27,141,0.25)",
          boxShadow: "0 -20px 60px rgba(255,27,141,0.15)",
        }}
      >
        {/* Grabber + close */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 flex justify-center">
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,255,128,0.12)", border: "1px solid rgba(0,255,128,0.35)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] font-bold tracking-widest text-green-400">IN VENUE</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
            data-testid="button-sheet-close"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {isLoading || !user ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-10 h-10 rounded-2xl animate-pulse"
                 style={{ background: "linear-gradient(135deg,#FF1B8D,#00CFFF)" }} />
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div className="flex flex-col items-center pt-1 pb-4">
              <div className="relative mb-3">
                {user.photos?.[0] ? (
                  <img
                    src={user.photos[0]}
                    alt={user.name}
                    className="w-28 h-28 rounded-full object-cover"
                    style={{ border: "3px solid #FF1B8D", boxShadow: "0 0 30px rgba(255,27,141,0.45)" }}
                  />
                ) : (
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg,#FF1B8D,#00CFFF)", border: "3px solid #FF1B8D" }}
                  >
                    {user.name?.[0] ?? "?"}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                     style={{ background: "#FF1B8D", border: "2px solid #0A0A0C" }}>
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white" data-testid="text-sheet-user-name">
                {user.name}{user.dob ? `, ${calcAge(user.dob)}` : ""}
              </h2>
              {user.bio && (
                <p className="text-xs text-icebreaker-muted mt-1 px-6 text-center line-clamp-2">{user.bio}</p>
              )}
              {venueName && (
                <div className="flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-icebreaker-coral" />
                  <span className="text-xs font-bold tracking-wide text-icebreaker-coral uppercase">
                    {venueName}
                  </span>
                </div>
              )}
              {user.interests?.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4 px-2">
                  {user.interests.slice(0, 4).map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F2F7" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons — Like + Gift only */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => sendLike.mutate()}
                disabled={sendLike.isPending}
                className="h-14 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "rgba(0,207,255,0.1)",
                  border: "1.5px solid #00CFFF",
                  color: "#00CFFF",
                }}
                data-testid="button-sheet-like"
              >
                <Heart className="w-5 h-5" />
                {sendLike.isPending ? "Sending…" : "Like"}
              </button>
              <button
                onClick={() => { onClose(); navigate(`/gift/${user.id}`); }}
                className="h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg,#FF1B8D 0%,#d6007a 100%)",
                  boxShadow: "0 0 25px rgba(255,27,141,0.4)",
                }}
                data-testid="button-sheet-gift"
              >
                <Gift className="w-5 h-5" />
                Gift a Drink
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function calcAge(dob: string) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
