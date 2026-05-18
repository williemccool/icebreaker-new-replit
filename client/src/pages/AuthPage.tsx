import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, User, GlassWater } from "lucide-react";

export default function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"welcome" | "phone" | "otp">("welcome");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const { toast } = useToast();

  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (res.ok) {
        let data: { devOtp?: string } = {};
        try {
          data = await res.json();
        } catch (err) {
          console.error("Failed to parse send-otp response", err);
          toast({ title: "Unexpected server response", variant: "destructive" });
          return;
        }
        setStep("otp");
        if (data?.devOtp) {
          setDevOtp(data.devOtp);
          setOtp(data.devOtp);
          toast({ title: `Dev OTP: ${data.devOtp}`, description: "Auto-filled for development" });
        } else {
          setDevOtp(null);
          toast({ title: "OTP sent!" });
        }
      } else {
        toast({ title: "Failed to send OTP", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length < 4) {
      toast({ title: "Enter your OTP", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        onAuth();
      } else {
        toast({ title: "Invalid OTP", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.18) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(0,207,255,0.14) 0%, transparent 60%), #0A0A0C" }}>

      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, #FF1B8D 0%, transparent 70%)" }} />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm px-6 pt-16">
        {/* Logo icon */}
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 0 40px rgba(255,27,141,0.15)" }}>
          <GlassWater className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>

        {step === "welcome" && (
          <>
            <h1 className="text-4xl font-extrabold text-white text-center mb-2 tracking-tight">Icebreaker</h1>
            <p className="text-icebreaker-muted text-center text-base mb-12">Meet where you go out.</p>
          </>
        )}

        {step === "phone" && (
          <>
            <h2 className="text-2xl font-extrabold text-white text-center mb-1">Your number</h2>
            <p className="text-icebreaker-muted text-sm text-center mb-8">We'll send a one-time code to verify you</p>
            <div className="w-full mb-4">
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-14 text-center text-lg rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-icebreaker-coral/60"
                data-testid="input-phone"
              />
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-2xl font-extrabold text-white text-center mb-1">Enter code</h2>
            <p className="text-icebreaker-muted text-sm text-center mb-4">Sent to {phone}</p>
            {devOtp && (
              <div
                className="w-full mb-4 px-4 py-3 rounded-2xl text-center"
                style={{ background: "rgba(0,207,255,0.08)", border: "1px solid rgba(0,207,255,0.35)" }}
                data-testid="text-dev-otp"
              >
                <div className="text-[10px] uppercase tracking-widest text-icebreaker-teal font-bold">Dev mode</div>
                <div className="text-white text-xl font-extrabold tracking-[0.4em]">{devOtp}</div>
                <div className="text-[10px] text-icebreaker-muted mt-1">Auto-filled · not shown in production</div>
              </div>
            )}
            <div className="w-full mb-4">
              <Input
                type="text"
                placeholder="• • • • • •"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
                className="h-14 text-center text-2xl tracking-[0.5em] rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-icebreaker-coral/60"
                data-testid="input-otp"
              />
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA section */}
      <div className="w-full max-w-sm px-6 pb-10 space-y-3">
        {step === "welcome" && (
          <>
            <button
              onClick={() => setStep("phone")}
              className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-3 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
              data-testid="button-continue-google"
            >
              <User className="w-5 h-5" />
              Continue with phone
            </button>
            <button
              onClick={() => setStep("phone")}
              className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-3 transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(0,207,255,0.4)" }}
              data-testid="button-continue-phone"
            >
              <Smartphone className="w-5 h-5 text-icebreaker-teal" />
              Continue with phone
            </button>
            <p className="text-center text-xs text-icebreaker-muted pt-1">
              Already have an account?{" "}
              <span className="text-white font-semibold cursor-pointer underline underline-offset-2" onClick={() => setStep("phone")}>Log in</span>
            </p>
          </>
        )}

        {step === "phone" && (
          <>
            <button
              onClick={sendOTP}
              disabled={loading}
              className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
              data-testid="button-send-otp"
            >
              {loading ? "Sending…" : "Send Code →"}
            </button>
            <button onClick={() => setStep("welcome")} className="w-full text-center text-sm text-icebreaker-muted py-2">← Back</button>
          </>
        )}

        {step === "otp" && (
          <>
            <button
              onClick={verifyOTP}
              disabled={loading}
              className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
              data-testid="button-verify-otp"
            >
              {loading ? "Verifying…" : "Verify & Enter →"}
            </button>
            <button onClick={() => setStep("phone")} className="w-full text-center text-sm text-icebreaker-muted py-2">← Change number</button>
          </>
        )}
      </div>
    </div>
  );
}
