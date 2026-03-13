import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Flame } from "lucide-react";

export default function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
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
        setStep("otp");
        toast({ title: "OTP sent to your phone" });
      } else {
        toast({ title: "Failed to send OTP", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({ title: "Enter the 6-digit OTP", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast({ title: "Welcome to Icebreaker! 🎉" });
        if (data.isNewUser) {
          window.location.href = "/onboarding";
        } else {
          onAuth();
        }
      } else {
        toast({ title: data.error || "Invalid OTP", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(160deg, #0E0F13 0%, #181B22 50%, #0E0F13 100%)" }}>

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #FF1B8D 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #00CFFF 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)" }}>
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1">
            <span className="text-icebreaker-coral">Ice</span><span className="text-icebreaker-teal">breaker</span>
          </h1>
          <p className="text-icebreaker-muted text-sm font-medium">Bangalore's nightlife dating app</p>
        </div>

        {/* Card */}
        <div className="glassmorphic p-7">
          {step === "phone" ? (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-icebreaker-muted mb-2">
                  Phone Number
                </label>
                <Input
                  data-testid="input-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                  className="h-12 text-base bg-icebreaker-surface border-icebreaker-border text-icebreaker-text placeholder:text-icebreaker-muted"
                />
              </div>
              <Button
                data-testid="button-send-otp"
                onClick={sendOTP}
                disabled={loading}
                className="w-full h-12 btn-coral text-sm"
              >
                {loading ? "Sending..." : "Send OTP →"}
              </Button>
              <p className="text-xs text-icebreaker-muted text-center leading-relaxed">
                By continuing, you agree to our Terms & Privacy Policy
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-icebreaker-muted mb-1">
                  Enter OTP
                </label>
                <p className="text-xs text-icebreaker-muted mb-3">Sent to {phone}</p>
                <Input
                  data-testid="input-otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && verifyOTP()}
                  maxLength={6}
                  className="h-12 text-2xl text-center tracking-[0.5em] font-bold bg-icebreaker-surface border-icebreaker-border text-icebreaker-text"
                />
              </div>
              <Button
                data-testid="button-verify-otp"
                onClick={verifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full h-12 btn-coral text-sm"
              >
                {loading ? "Verifying..." : "Verify & Enter →"}
              </Button>
              <button
                onClick={() => { setStep("phone"); setOtp(""); }}
                className="w-full text-xs text-icebreaker-muted hover:text-icebreaker-text transition-colors text-center"
              >
                ← Change phone number
              </button>
            </div>
          )}
        </div>

        {/* Dev hint */}
        <p className="text-center text-xs text-icebreaker-muted/50 mt-5">
          Dev mode: OTP is printed in server console
        </p>
      </div>
    </div>
  );
}
