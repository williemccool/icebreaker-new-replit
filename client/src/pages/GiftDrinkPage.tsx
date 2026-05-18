import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { X, Sparkles, MapPin, Clock, Heart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const DRINKS = [
  { name: "Cocktail", emoji: "🍸", cubes: 250, price: "₹400" },
  { name: "Beer", emoji: "🍺", cubes: 150, price: "₹250" },
  { name: "Mocktail", emoji: "🥤", cubes: 100, price: "₹180" },
  { name: "Shot", emoji: "🥃", cubes: 80, price: "₹150" },
];

export default function GiftDrinkPage() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState(0);
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const { data: walletData } = useQuery({
    queryKey: ["/api/wallet"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/wallet", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

  const { data: recipientData } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!userId
  });

  const sendGift = useMutation({
    mutationFn: () => apiRequest("POST", "/api/gifts/send", {
      recipientId: parseInt(userId),
      drinkName: DRINKS[selected].name,
      cubesCost: DRINKS[selected].cubes,
      note
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      toast({ title: "🎉 Drink voucher sent!", description: `${DRINKS[selected].name} on its way to ${recipient?.name}` });
      window.history.back();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to send gift", variant: "destructive" });
    }
  });

  const sendLike = useMutation({
    mutationFn: () => apiRequest("POST", "/api/swipe", {
      swipedId: parseInt(userId),
      liked: true
    }),
    onSuccess: async (res: any) => {
      const data = await res.json().catch(() => ({}));
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      if (data?.match) {
        toast({ title: "💖 It's a match!", description: `You and ${recipient?.name} liked each other` });
        navigate(`/match/${data.match.id}`);
      } else {
        toast({ title: "💖 Like sent!", description: `${recipient?.name} will know you're interested` });
        window.history.back();
      }
    },
    onError: (err: any) => {
      toast({ title: err.message || "Couldn't send like", variant: "destructive" });
    }
  });

  const recipient = recipientData?.user;
  const balance = walletData?.wallet?.balance ?? 0;
  const drink = DRINKS[selected];
  const canAfford = balance >= drink.cubes;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => window.history.back()} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-close" aria-label="Close">
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(0,207,255,0.1)", border: "1px solid rgba(0,207,255,0.25)" }}>
          <Sparkles className="w-3.5 h-3.5 text-icebreaker-teal" />
          <span className="font-bold text-sm text-icebreaker-teal" data-testid="gift-balance">{balance}</span>
        </div>
      </div>

      <div className="flex-1 px-4 pb-32 space-y-5">
        {/* Recipient */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="relative mb-3">
            {(recipient?.photos as string[])?.[0] ? (
              <img src={(recipient.photos as string[])[0]} alt={recipient?.name || ""} className="w-20 h-20 rounded-full object-cover" style={{ border: "3px solid rgba(255,27,141,0.5)" }} />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }}>
                {recipient?.name?.[0] || "?"}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-icebreaker-bg" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Treat {recipient?.name?.split(" ")[0] || "them"}</h2>
          <div className="flex items-center gap-1.5 mt-1 text-icebreaker-muted text-xs">
            <MapPin className="w-3 h-3" />
            <span>{recipient?.city || "Bangalore"} • nearby</span>
          </div>
        </div>

        {/* Drink selector */}
        <div>
          <p className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Select a drink</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {DRINKS.map((d, i) => (
              <button
                key={d.name}
                onClick={() => setSelected(i)}
                className="flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-2xl transition-all"
                style={selected === i
                  ? { background: "rgba(255,27,141,0.15)", border: "2px solid #FF1B8D" }
                  : { background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                data-testid={`drink-${d.name.toLowerCase()}`}
              >
                {selected === i && <div className="w-2 h-2 rounded-full bg-icebreaker-coral absolute -top-1 -right-1" />}
                <span className="text-3xl">{d.emoji}</span>
                <span className={`text-sm font-bold ${selected === i ? "text-icebreaker-coral" : "text-white"}`}>{d.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-icebreaker-teal" />
            <span className="text-3xl font-extrabold text-white">{drink.cubes}</span>
          </div>
          <span className="text-icebreaker-muted text-lg">{drink.price}</span>
        </div>

        {!canAfford && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,27,141,0.1)", border: "1px solid rgba(255,27,141,0.3)" }}>
            <Sparkles className="w-4 h-4 text-icebreaker-coral" />
            <span className="text-icebreaker-coral font-semibold">Not enough Cubes — you need {drink.cubes - balance} more</span>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="text-xs font-semibold text-icebreaker-muted mb-2 block">Add a note (optional)</label>
          <div className="relative">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 140))}
              placeholder="Say something nice… (e.g., 'Cheers to the weekend!')"
              className="w-full min-h-24 p-4 rounded-2xl text-sm resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F2F7", fontFamily: "Plus Jakarta Sans, sans-serif" }}
              data-testid="input-note"
            />
            <span className="absolute bottom-3 right-3 text-xs text-icebreaker-muted">{note.length}/140</span>
          </div>
        </div>

        {/* Voucher validity */}
        <div className="flex items-center gap-2 text-xs text-icebreaker-muted">
          <Clock className="w-3.5 h-3.5" />
          <span>Voucher is valid for 15 mins at the bar.</span>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 space-y-2" style={{ background: "linear-gradient(to top, #0A0A0C 60%, transparent)" }}>
        <button
          onClick={() => sendLike.mutate()}
          disabled={sendLike.isPending || sendGift.isPending}
          className="w-full h-12 rounded-full font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(0,207,255,0.4)", color: "#00CFFF" }}
          data-testid="button-send-like"
        >
          <Heart className="w-4 h-4" /> {sendLike.isPending ? "Sending…" : "Send a Like"}
        </button>
        <button
          onClick={() => sendGift.mutate()}
          disabled={sendGift.isPending || sendLike.isPending || !canAfford}
          className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
          data-testid="button-send-drink"
        >
          🍸 {sendGift.isPending ? "Sending…" : "Send Drink Voucher"}
        </button>
      </div>
    </div>
  );
}
