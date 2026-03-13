import { useState } from "react";
import { ArrowLeft, Lock, Plus, Circle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const METHODS = [
  { id: "applepay", label: "UPI / Google Pay", sub: "Default method", icon: "💳" },
  { id: "visa", label: "Visa ending in 4242", sub: "Expires 12/25", icon: "💳" },
  { id: "mc", label: "Mastercard •••• 8839", sub: "Expires 09/26", icon: "💳" },
];

interface PaymentPageProps {
  amount?: number;
  label?: string;
  onSuccess?: () => void;
}

export default function PaymentPage({ amount = 1999, label = "Icebreaker Premium", onSuccess }: PaymentPageProps) {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState("applepay");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatted = `₹${(amount / 100).toFixed(2)}`;

  const handleContinue = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    toast({ title: "Payment successful! 🎉" });
    if (onSuccess) onSuccess();
    else navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.1) 0%, transparent 50%), #0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1 as any)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-xl font-extrabold tracking-tight flex-1 text-center pr-9">SELECT PAYMENT</h1>
      </div>

      <div className="flex-1 px-4 space-y-5 pb-36">
        {/* Amount */}
        <div className="flex flex-col items-center py-4">
          <div className="px-8 py-4 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest mb-1">Total Due</p>
            <p className="text-4xl font-extrabold text-icebreaker-coral" data-testid="payment-amount">{formatted}<span className="text-xl text-icebreaker-muted">/mo</span></p>
          </div>
          <p className="text-xs text-icebreaker-muted mt-2">Billed monthly for {label}</p>
        </div>

        {/* Saved methods */}
        <div>
          <p className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Saved Methods</p>
          <div className="space-y-2">
            {METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => setSelected(method.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all"
                style={selected === method.id
                  ? { background: "rgba(0,207,255,0.08)", border: "1.5px solid rgba(0,207,255,0.4)" }
                  : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }}
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

        {/* Add method */}
        <button
          className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all"
          style={{ background: "rgba(255,255,255,0.02)", border: "1.5px dashed rgba(255,255,255,0.12)" }}
          data-testid="button-add-payment"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <Plus className="w-4 h-4 text-icebreaker-muted" />
          </div>
          <span className="text-sm font-semibold text-icebreaker-muted">Add New Payment Method</span>
          <ArrowLeft className="w-4 h-4 text-icebreaker-muted rotate-180 ml-auto" />
        </button>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4" style={{ background: "linear-gradient(to top, #0A0A0C 70%, transparent)" }}>
        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-between px-6 transition-all active:scale-95 disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
          data-testid="button-continue-payment"
        >
          <span>{loading ? "Processing…" : "Continue"}</span>
          <span className="font-bold text-white/80">{formatted}</span>
        </button>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <Lock className="w-3 h-3 text-icebreaker-muted" />
          <span className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest">SSL Encrypted Payment</span>
        </div>
      </div>
    </div>
  );
}
