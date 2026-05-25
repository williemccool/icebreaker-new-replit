import { useState } from "react";
import { X, Lock, Sparkles, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ConfirmPurchasePageProps {
  item?: { name: string; cubes?: number; price?: number; description?: string };
  onConfirm?: () => void;
}

export default function ConfirmPurchasePage({ item, onConfirm }: ConfirmPurchasePageProps) {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const product = item || { name: "100 Cubes Pack", cubes: 100, price: 1999, description: "Top up your Cubes wallet to gift drinks, join premium rooms, and unlock boosts." };
  const priceFormatted = product.price ? `₹${(product.price / 100).toFixed(2)}` : "₹19.99";
  const tax = product.price ? Math.round(product.price * 0.18) : 360;
  const total = product.price ? product.price + tax : 2359;

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    toast({ title: `${product.name} purchased! 🎉` });
    if (onConfirm) onConfirm();
    else navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(0,207,255,0.1) 0%, transparent 50%), #0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-4">
        <h1 className="flex-1 text-center text-sm font-extrabold uppercase tracking-widest text-icebreaker-muted">Confirm Order</h1>
        <button onClick={() => navigate(-1 as any)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="flex-1 px-4 space-y-4 pb-36">
        {/* Product hero */}
        <div className="rounded-3xl overflow-hidden flex flex-col items-center py-10 relative" style={{ background: "linear-gradient(135deg, #0a101a, #101a28)", border: "1px solid rgba(0,207,255,0.2)" }}>
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 50% 60%, #00CFFF 0%, transparent 70%)" }} />

          {/* Best value badge */}
          <div className="relative z-10 px-4 py-1.5 rounded-full mb-6" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.3), rgba(0,207,255,0.3))", border: "1px solid rgba(255,255,255,0.2)" }}>
            <span className="text-xs font-bold text-white uppercase tracking-widest">⚡ Best Value</span>
          </div>

          {/* Cube icon */}
          <div className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.3), rgba(255,27,141,0.2))", border: "1px solid rgba(0,207,255,0.4)", boxShadow: "0 0 40px rgba(0,207,255,0.3)" }}>
            <Sparkles className="w-10 h-10 text-icebreaker-teal" />
          </div>

          <h2 className="relative z-10 text-2xl font-extrabold text-white mb-2">{product.name}</h2>
          <p className="relative z-10 text-sm text-icebreaker-muted text-center px-8 leading-relaxed">{product.description}</p>
        </div>

        {/* Payment method */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest">Payment Method</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "rgba(255,255,255,0.08)" }}>💳</div>
              <div>
                <p className="font-bold text-sm">UPI / Google Pay</p>
                <p className="text-xs text-icebreaker-muted">Default method</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/payment")}
              className="text-xs font-bold text-icebreaker-teal"
            >
              Change
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest">Summary</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-icebreaker-muted">Subtotal</span>
              <span className="text-sm font-semibold">{priceFormatted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-icebreaker-muted">GST (18%)</span>
              <span className="text-sm font-semibold">₹{(tax / 100).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-base font-extrabold">Total</span>
              <span className="text-xl font-extrabold text-icebreaker-coral" data-testid="confirm-total">₹{(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-icebreaker-muted text-center leading-relaxed">
          By purchasing you agree to our Terms of Service and Privacy Policy. Purchases are non-refundable.
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4" style={{ background: "linear-gradient(to top, #0A0A0C 70%, transparent)" }}>
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Lock className="w-3 h-3 text-icebreaker-muted" />
          <span className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest">Secured by App Store</span>
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-between px-6 transition-all active:scale-95 disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
          data-testid="button-confirm-purchase"
        >
          <span>{loading ? "Processing…" : "Confirm Purchase"}</span>
          <Lock className="w-4 h-4 opacity-70" />
        </button>
      </div>
    </div>
  );
}
