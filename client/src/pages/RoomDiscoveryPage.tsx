import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { X, Heart, Gift, ArrowLeft, Clock, Users, BadgeCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80",
];

const PROMPTS = [
  "The worst first date idea is…",
  "You'd never catch me…",
  "My love language is…",
  "The way to my heart is…",
  "I'm basically a local celebrity for…",
];

const ANSWERS = [
  "Going to a silent retreat",
  "Eating pineapple on pizza unironically",
  "Acts of service and good playlists",
  "Midnight biryani runs",
  "Knowing every bar's happy hour in Indiranagar",
];

export default function RoomDiscoveryPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [gifted, setGifted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [`/api/rooms/${id}`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const swipeMutation = useMutation({
    mutationFn: ({ swipedId, liked }: { swipedId: number; liked: boolean }) =>
      apiRequest("POST", "/api/swipe", { swipedId, liked }),
  });

  const profiles = (data?.participants || []).map((u: any, i: number) => ({
    ...u,
    photo: AVATARS[i % AVATARS.length],
    prompt: PROMPTS[i % PROMPTS.length],
    answer: u.bio || ANSWERS[i % ANSWERS.length],
    age: u.dob ? Math.floor((Date.now() - new Date(u.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 24,
  }));

  const room = data?.room;
  const minsLeft = data?.minsLeft ?? 0;

  const current = profiles[index];
  const done = index >= profiles.length;

  const handleAction = (action: "like" | "pass" | "gift") => {
    if (!current) return;

    if (action === "gift") {
      setGifted(true);
      toast({ title: "🎁 Gift sent!", description: `You sent a drink to ${current.name || "them"}` });
      return;
    }

    setLeaving(action === "like" ? "right" : "left");
    if (current.id) {
      swipeMutation.mutate({ swipedId: current.id, liked: action === "like" });
      if (action === "like") {
        toast({ title: "💗 Liked!", description: "If they like you back, it's a match!" });
      }
    }
    setTimeout(() => {
      setLeaving(null);
      setGifted(false);
      setIndex(i => i + 1);
    }, 350);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0C" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }} />
          <span className="text-icebreaker-muted text-sm font-semibold">Loading room…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0A0A0C 0%, #0D0D12 100%)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3">
        <button
          onClick={() => navigate("/rooms")}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          data-testid="button-back-room"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        {/* Room pill */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="w-2 h-2 rounded-full bg-icebreaker-coral animate-pulse" style={{ boxShadow: "0 0 6px #FF1B8D" }} />
          <span className="text-xs font-bold text-white">{room?.name || "Live Room"}</span>
          <span className="text-xs text-icebreaker-muted">·</span>
          <Clock className="w-3 h-3 text-icebreaker-muted" />
          <span className="text-xs text-icebreaker-muted font-semibold">{minsLeft}m left</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "rgba(0,207,255,0.08)", border: "1px solid rgba(0,207,255,0.2)" }}>
          <Users className="w-3.5 h-3.5 text-icebreaker-teal" />
          <span className="text-xs font-bold text-icebreaker-teal">{profiles.length}</span>
        </div>
      </div>

      {/* Main card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        {done || profiles.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.2), rgba(0,207,255,0.2))", border: "2px solid rgba(255,27,141,0.3)" }}
            >
              <Heart className="w-9 h-9 text-icebreaker-coral" />
            </div>
            <h2 className="text-xl font-extrabold mb-2">You've seen everyone!</h2>
            <p className="text-sm text-icebreaker-muted mb-6">Check back as more people join the room.</p>
            <button onClick={() => navigate("/rooms")} className="btn-coral text-sm">Back to Rooms</button>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {/* Profile card */}
            <div
              className="relative rounded-3xl overflow-hidden transition-all duration-300"
              style={{
                aspectRatio: "3/4",
                boxShadow: `0 0 40px rgba(255,27,141,0.25), 0 20px 60px rgba(0,0,0,0.6)`,
                border: "1px solid rgba(255,27,141,0.2)",
                transform: leaving === "right" ? "translateX(120%) rotate(15deg)" : leaving === "left" ? "translateX(-120%) rotate(-15deg)" : "translateX(0)",
              }}
              data-testid="room-profile-card"
            >
              {/* Photo */}
              <img
                src={current.photo}
                alt={current.name || "Profile"}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Dark gradient overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(10,10,12,0.85) 100%)" }} />

              {/* Prompt answer overlay */}
              <div
                className="absolute top-5 left-4 right-4 p-4 rounded-2xl"
                style={{ background: "rgba(10,10,12,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <p className="text-[10px] font-bold text-icebreaker-teal uppercase tracking-wider mb-1">{current.prompt}</p>
                <p className="text-sm font-semibold text-white leading-snug">{current.answer}</p>
              </div>

              {/* Profile info panel */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl font-extrabold text-white">{current.name || "Unknown"}</h3>
                      <span className="text-xl font-bold text-white/70">{current.age}</span>
                    </div>
                    {current.verified && (
                      <div className="flex items-center gap-1.5">
                        <BadgeCheck className="w-4 h-4 text-icebreaker-teal" />
                        <span className="text-xs font-bold text-icebreaker-teal">Selfie-Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile counter */}
            <div className="flex justify-center gap-1.5 mt-4 mb-6">
              {profiles.map((_: any, i: number) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === index ? 20 : 6,
                    height: 6,
                    background: i === index ? "#FF1B8D" : i < index ? "rgba(255,27,141,0.3)" : "rgba(255,255,255,0.15)"
                  }}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-5">
              {/* Pass */}
              <button
                onClick={() => handleAction("pass")}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.12)" }}
                data-testid="button-pass"
              >
                <X className="w-6 h-6 text-white/70" />
              </button>

              {/* Gift */}
              <button
                onClick={() => handleAction("gift")}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{
                  background: gifted ? "rgba(0,207,255,0.3)" : "rgba(0,207,255,0.1)",
                  border: "1.5px solid rgba(0,207,255,0.4)",
                  boxShadow: gifted ? "0 0 20px rgba(0,207,255,0.5)" : "none"
                }}
                data-testid="button-gift"
              >
                <Gift className="w-5 h-5 text-icebreaker-teal" />
              </button>

              {/* Like */}
              <button
                onClick={() => handleAction("like")}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{
                  background: "linear-gradient(135deg, #FF1B8D 0%, #c4006e 100%)",
                  boxShadow: "0 0 28px rgba(255,27,141,0.55)",
                  border: "none"
                }}
                data-testid="button-like"
              >
                <Heart className="w-7 h-7 text-white" fill="white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
