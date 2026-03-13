import { useState } from "react";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Card } from "@/components/ui/card";
  import { useToast } from "@/hooks/use-toast";

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
      } catch (error) {
        toast({ title: "Error sending OTP", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    const verifyOTP = async () => {
      if (!otp || otp.length !== 6) {
        toast({ title: "Please enter a 6-digit OTP", variant: "destructive" });
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
          
          toast({ title: "Welcome to Icebreaker!" });
          
          // Redirect to onboarding if new user
          if (data.isNewUser) {
            window.location.href = "/onboarding";
          } else {
            onAuth();
          }
        } else {
          toast({ title: data.error || "Invalid OTP", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error verifying OTP", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-icebreaker-bg via-icebreaker-surface to-icebreaker-bg">
        <Card className="w-full max-w-md p-8 glassmorphic">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-icebreaker-coral">Ice</span>
              <span className="text-icebreaker-orchid">breaker</span>
            </h1>
            <p className="text-gray-400">Meet, Repeat.</p>
          </div>

          {step === "phone" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-icebreaker-surface border-gray-700"
                />
              </div>
              <Button
                onClick={sendOTP}
                disabled={loading}
                className="w-full btn-coral"
              >
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Enter OTP</label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="bg-icebreaker-surface border-gray-700 text-center text-2xl tracking-widest"
                />
              </div>
              <Button
                onClick={verifyOTP}
                disabled={loading}
                className="w-full btn-coral"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
              <Button
                onClick={() => setStep("phone")}
                variant="ghost"
                className="w-full"
              >
                Change Phone Number
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-6 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </Card>
      </div>
    );
  }
  