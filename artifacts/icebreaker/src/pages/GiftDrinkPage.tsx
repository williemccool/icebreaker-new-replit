import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Check, Lock, Beer, Martini, GlassWater, Coffee,
  Gift, Sparkles, Clock, X, Copy, ShieldCheck,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DrinkKey = "beer" | "cocktail" | "mocktail" | "coffee";

const DRINKS: Array<{
  key: DrinkKey;
  label: string;
  sub: string;
  cubes: number;
  localPaise: number;
  Icon: typeof Beer;
  accent: string;
}> = [
  { key: "beer",     label: "Beer",     sub: "PINT / BOTTLE", cubes: 150, localPaise: 25000, Icon: Beer,       accent: "#FF1B8D" },
  { key: "cocktail", label: "Cocktail", sub: "SIGNATURE",     cubes: 250, localPaise: 40000, Icon: Martini,    accent: "#FF1B8D" },
  { key: "mocktail", label: "Mocktail", sub: "ALCOHOL-FREE",  cubes: 100, localPaise: 18000, Icon: GlassWater, accent: "#00CFFF" },
  { key: "coffee",   label: "Coffee",   sub: "HOT / ICED",    cubes: 80,  localPaise: 15000, Icon: Coffee,     accent: "#00CFFF" },
];

const fmtINR = (paise: number) =>
  `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export default function GiftDrinkPage() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [selected, setSelected] = useState<DrinkKey>("beer");
  const [note, setNote] = useState("");
  const [voucher, setVoucher] = useState<any | null>(null);

  const { data: walletData } = useQuery<{ wallet?: { balance: number } }>({
    queryKey: ["/api/wallet"],
  });
  const { data: recipientData } = useQuery<{ user?: any }>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  const drink = useMemo(
    () => DRINKS.find((d) => d.key === selected) ?? DRINKS[0],
    [selected],
  );
  const recipient = recipientData?.user;
  const balance = walletData?.wallet?.balance ?? 0;
  const canAfford = balance >= drink.cubes;
  const firstName = recipient?.name?.split(" ")[0] ?? "them";

  const sendGift = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gifts/send", {
        recipientId: parseInt(userId!),
        drinkName: drink.key,
        note: note.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/sent"] });
      setVoucher(data?.gift ?? null);
    },
    onError: async (err: any) => {
      let msg = err?.message || "Failed to send gift";
      try {
        const parsed = JSON.parse(msg.split(":").slice(1).join(":").trim());
        if (parsed?.error) msg = parsed.error;
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  // ──────────────────────────────────────────────────────────────
  // Success / Voucher screen
  // ──────────────────────────────────────────────────────────────
  if (voucher) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="w-9" />
          <span className="text-xs font-bold tracking-widest text-icebreaker-muted">VOUCHER SENT</span>
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
            data-testid="button-voucher-close"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 px-5 pb-32 flex flex-col items-center justify-center text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(255,27,141,0.5), rgba(0,207,255,0.2))",
              boxShadow: "0 0 60px rgba(255,27,141,0.45)",
            }}
          >
            <Check className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Drink&nbsp;
            <span style={{
              background: "linear-gradient(90deg,#FF1B8D,#00CFFF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>on the way!</span>
          </h1>
          <p className="text-icebreaker-muted text-sm mb-6 max-w-xs">
            {firstName} will be notified instantly. Voucher is valid for <b className="text-white">24 hours</b> at the bar.
          </p>

          <div
            className="w-full max-w-sm rounded-3xl p-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,27,141,0.35)",
              boxShadow: "0 0 30px rgba(255,27,141,0.15)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-widest text-icebreaker-coral">REDEEM CODE</span>
              <span className="text-[10px] font-bold tracking-widest text-icebreaker-muted uppercase">{voucher.drinkName}</span>
            </div>
            <div
              className="font-mono text-2xl font-extrabold tracking-[0.3em] text-white text-center py-4 rounded-2xl mb-3"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px dashed rgba(255,255,255,0.15)" }}
              data-testid="text-voucher-code"
            >
              {voucher.qrCode}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(voucher.qrCode);
                toast({ title: "Code copied" });
              }}
              className="w-full h-10 rounded-full text-xs font-bold flex items-center justify-center gap-2 mb-2 text-white"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              data-testid="button-copy-code"
            >
              <Copy className="w-3.5 h-3.5" /> Copy code
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-icebreaker-muted">
              <ShieldCheck className="w-3 h-3" /> Show this at the bar to redeem.
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3" style={{ background: "linear-gradient(to top,#0A0A0C 60%, transparent)" }}>
          <button
            onClick={() => navigate("/")}
            className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg,#FF1B8D 0%,#d6007a 100%)",
              boxShadow: "0 0 30px rgba(255,27,141,0.4)",
            }}
            data-testid="button-done"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Compose screen
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
      {/* Header */}
      <div className="grid grid-cols-3 items-center px-4 pt-5 pb-3">
        <button
          onClick={() => window.history.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center justify-self-start"
          style={{ background: "rgba(255,255,255,0.06)" }}
          data-testid="button-back"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-extrabold tracking-tight text-white">Send a Drink</h1>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Gift className="w-3 h-3 text-icebreaker-coral" />
            <span className="text-[10px] font-bold tracking-widest text-icebreaker-coral">REDEEMABLE AT BAR</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 justify-self-end px-2.5 py-1.5 rounded-full"
             style={{ background: "rgba(0,207,255,0.1)", border: "1px solid rgba(0,207,255,0.25)" }}>
          <Sparkles className="w-3.5 h-3.5 text-icebreaker-teal" />
          <span className="text-xs font-bold text-icebreaker-teal" data-testid="text-balance">{balance}</span>
        </div>
      </div>

      <div className="flex-1 px-4 pb-32 space-y-5">
        {/* Sending to */}
        <div
          className="rounded-2xl p-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="relative">
            {recipient?.photos?.[0] ? (
              <img
                src={recipient.photos[0]}
                alt={recipient.name}
                className="w-11 h-11 rounded-full object-cover"
                style={{ border: "2px solid rgba(255,27,141,0.5)" }}
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-base font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#FF1B8D,#00CFFF)" }}
              >
                {recipient?.name?.[0] ?? "?"}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                 style={{ background: "#00CFFF" }}>
              <Check className="w-2.5 h-2.5 text-black" strokeWidth={4} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-widest text-icebreaker-muted">SENDING TO</div>
            <div className="text-base font-extrabold text-white truncate" data-testid="text-recipient-name">
              {recipient?.name ?? "—"}
            </div>
          </div>
          <Lock className="w-4 h-4 text-icebreaker-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight">Choose their poison</h2>
          <span className="text-xs font-bold text-icebreaker-coral">Step 1 of 2</span>
        </div>

        {/* Drink grid */}
        <div className="grid grid-cols-2 gap-3">
          {DRINKS.map((d) => {
            const active = d.key === selected;
            const Icon = d.Icon;
            return (
              <button
                key={d.key}
                onClick={() => setSelected(d.key)}
                className="relative rounded-2xl p-4 flex flex-col items-center text-center transition-all active:scale-[0.98]"
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg, rgba(255,27,141,0.85), rgba(214,0,122,0.85))",
                        border: "1.5px solid #FF1B8D",
                        boxShadow: "0 8px 30px rgba(255,27,141,0.35)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1.5px solid rgba(255,255,255,0.08)",
                      }
                }
                data-testid={`button-drink-${d.key}`}
              >
                {active && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <Check className="w-3 h-3 text-icebreaker-coral" strokeWidth={4} />
                  </div>
                )}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)" }}
                >
                  <Icon className={`w-6 h-6 ${active ? "text-white" : "text-white/80"}`} />
                </div>
                <div className="text-base font-extrabold text-white mb-0.5">{d.label}</div>
                <div className={`text-[10px] font-bold tracking-widest ${active ? "text-white/80" : "text-icebreaker-muted"}`}>
                  {d.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Cost card */}
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,27,141,0.35)",
          }}
        >
          <div>
            <div className="text-[10px] font-bold tracking-widest text-icebreaker-muted mb-1">TOTAL COST</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white" data-testid="text-cubes-cost">{drink.cubes}</span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest"
                style={{ background: "rgba(255,27,141,0.15)", color: "#FF1B8D" }}
              >
                CUBES
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-widest text-icebreaker-muted mb-1">LOCAL VALUE</div>
            <div className="text-base font-bold text-icebreaker-teal" data-testid="text-local-value">
              ≈ {fmtINR(drink.localPaise)}
            </div>
          </div>
        </div>

        {!canAfford && (
          <div
            className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(255,27,141,0.1)", border: "1px solid rgba(255,27,141,0.3)" }}
          >
            <div className="flex items-center gap-2 text-icebreaker-coral font-semibold">
              <Sparkles className="w-4 h-4" />
              Need {drink.cubes - balance} more Cubes
            </div>
            <button
              onClick={() => navigate("/payment")}
              className="text-xs font-bold text-white px-3 py-1.5 rounded-full"
              style={{ background: "#FF1B8D" }}
              data-testid="button-buy-cubes"
            >
              Buy Cubes
            </button>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="text-sm font-bold text-white mb-2 block">
            Add a note <span className="text-icebreaker-muted font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
              placeholder="Cheers! Let's break the ice…"
              className="w-full min-h-24 p-4 rounded-2xl text-sm resize-none focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#F0F2F7",
                fontFamily: "Plus Jakarta Sans, sans-serif",
              }}
              data-testid="input-note"
            />
            <span className="absolute bottom-3 right-3 text-[11px] font-bold text-icebreaker-muted">
              {note.length}/140
            </span>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-7 pt-3 space-y-2"
        style={{ background: "linear-gradient(to top,#0A0A0C 65%, transparent)" }}
      >
        <button
          onClick={() => sendGift.mutate()}
          disabled={sendGift.isPending || !canAfford}
          className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#FF1B8D 0%,#d6007a 100%)",
            boxShadow: "0 0 30px rgba(255,27,141,0.4)",
          }}
          data-testid="button-gift-drink-now"
        >
          <Gift className="w-5 h-5" />
          {sendGift.isPending ? "Sending…" : "Gift Drink Now"}
        </button>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-icebreaker-muted">
          <Clock className="w-3 h-3" /> Voucher generated instantly. Valid for 24 hours.
        </div>
      </div>
    </div>
  );
}
