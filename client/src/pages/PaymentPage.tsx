import { useState } from "react";
import { ArrowLeft, Lock, Plus, Circle, CheckCircle2, Sparkles, Crown, Trophy } from "lucide-react";
import { useLocation, useSearch, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { SHOP_CATALOG } from "@shared/shop";

const METHODS = [
  { id: "upi", label: "UPI / Google Pay", sub: "Default method", icon: "💳" },
  { id: "visa", label: "Visa ending in 4242", sub: "Expires 12/25", icon: "💳" },
  { id: "mc", label: "Mastercard •••• 8839", sub: "Expires 09/26", icon: "💳" },
];

export default function PaymentPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const qc = useQueryClient();
  const sku = new URLSearchParams(search).get("sku") || "";
  const item = SHOP_CATALOG[sku];

  const [selected, setSelected] = useState("upi");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0A0A0C" }}>
        <div className="rounded-3xl p-8 text-center max-w-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-4xl mb-3">🤔</p>
          <h2 className="text-lg font-extrabold mb-1">Product not found</h2>
          <p className="text-sm text-icebreaker-muted mb-5">That checkout link is invalid or expired.</p>
          <Link href="/shop">
            <button className="h-11 px-5 rounded-2xl font-extrabold text-sm text-white" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)" }} data-testid="button-go-shop">
              Browse the Shop
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = item.priceInPaise;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;
  const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

  const isSub = item.category === "godmode";
  const Icon = item.category === "cubes" ? Sparkles : item.category === "godmode" ? Crown : Trophy;

  const handleContinue = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 900));
      const token = localStorage.getItem("token");
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sku }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Purchase failed");
      const data = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      qc.invalidateQueries({ queryKey: ["/api/me/subscription"] });
      qc.invalidateQueries({ queryKey: ["/api/cubes/transactions"] });
      qc.invalidateQueries({ queryKey: ["/api/user/me"] });
      toast({
        title: "Payment successful! 🎉",
        description: data.cubesAdded ? `+${data.cubesAdded} cubes added to your wallet` : `${item.name} is now active`,
      });
      navigate("/rewards");
    } catch (e: any) {
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.12) 0%, transparent 50%), #0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 max-w-lg mx-auto w-full">
        <button onClick={() => navigate("/shop")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-base font-extrabold tracking-widest flex-1 text-center pr-9 uppercase">Checkout</h1>
      </div>

      <div className="flex-1 px-4 max-w-lg mx-auto w-full space-y-4 pb-36">
        {/* Product summary */}
        <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0e1a 0%, #0d1424 100%)", border: "1px solid rgba(255,27,141,0.3)" }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #FF1B8D 0%, transparent 70%)" }} />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 0 20px rgba(255,27,141,0.5)" }}>
              <Icon className="w-7 h-7 text-white" fill={item.category === "godmode" ? "white" : "none"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-icebreaker-coral">
                {item.category === "godmode" ? "God Mode Premium" : item.category === "cubes" ? "Cubes Top-up" : "Season Pass"}
              </p>
              <p className="text-lg font-extrabold tracking-tight" data-testid="payment-item-name">{item.name}</p>
              <p className="text-xs text-icebreaker-muted">{item.tagline}</p>
            </div>
          </div>
          {item.cubes && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-icebreaker-teal" />
              <span className="text-sm font-extrabold text-icebreaker-teal">{((item.cubes || 0) + (item.bonusCubes || 0)).toLocaleString("en-IN")} cubes</span>
              {item.bonusCubes ? <span className="text-xs text-icebreaker-muted">(includes +{item.bonusCubes} bonus)</span> : null}
            </div>
          )}
          {item.durationDays && (
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <span className="text-xs text-icebreaker-muted">Active for </span>
              <span className="text-sm font-extrabold">{item.durationDays} days</span>
            </div>
          )}
        </div>

        {/* Bill summary */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex justify-between text-sm">
            <span className="text-icebreaker-muted">Subtotal</span>
            <span className="font-bold" data-testid="text-subtotal">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-icebreaker-muted">GST (18%)</span>
            <span className="font-bold">{fmt(tax)}</span>
          </div>
          <div className="pt-2 border-t border-white/5 flex justify-between items-baseline">
            <span className="text-sm font-extrabold">Total {isSub && <span className="text-xs text-icebreaker-muted font-semibold">(one-time charge)</span>}</span>
            <span className="text-xl font-black text-icebreaker-coral" data-testid="payment-amount">{fmt(total)}</span>
          </div>
        </div>

        {/* Payment methods */}
        <div>
          <p className="text-[10px] font-extrabold text-icebreaker-muted uppercase tracking-widest mb-2">Payment method</p>
          <div className="space-y-2">
            {METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => setSelected(method.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all"
                style={selected === method.id
                  ? { background: "rgba(0,207,255,0.08)", border: "1.5px solid rgba(0,207,255,0.4)" }
                  : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}
                data-testid={`payment-method-${method.id}`}
              >
                <div className="w-12 h-9 rounded-lg flex items-center justify-center text-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                  {method.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{method.label}</p>
                  <p className="text-xs text-icebreaker-muted">{method.sub}</p>
                </div>
                {selected === method.id
                  ? <CheckCircle2 className="w-5 h-5 text-icebreaker-teal" fill="#00CFFF" />
                  : <Circle className="w-5 h-5 text-icebreaker-muted/40" />
                }
              </button>
            ))}
          </div>
        </div>

        <button
          className="w-full flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1.5px dashed rgba(255,255,255,0.12)" }}
          data-testid="button-add-payment"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <Plus className="w-4 h-4 text-icebreaker-muted" />
          </div>
          <span className="text-sm font-semibold text-icebreaker-muted">Add new payment method</span>
        </button>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 z-30" style={{ background: "linear-gradient(to top, #0A0A0C 70%, transparent)" }}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full h-14 rounded-2xl font-extrabold text-white text-base flex items-center justify-between px-6 transition-all active:scale-[0.98] disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
            data-testid="button-continue-payment"
          >
            <span>{loading ? "Processing…" : `Pay ${fmt(total)}`}</span>
            <Lock className="w-4 h-4 text-white/80" />
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            <Lock className="w-3 h-3 text-icebreaker-muted" />
            <span className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest">Encrypted · Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
