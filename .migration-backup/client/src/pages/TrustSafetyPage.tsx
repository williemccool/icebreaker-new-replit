import { useState } from "react";
import { ArrowLeft, Shield, BadgeCheck, AlertTriangle, Eye, EyeOff, Phone, ChevronRight, Flag, X } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function TrustSafetyPage() {
  const [, navigate] = useLocation();
  const [ghostMode, setGhostMode] = useState(false);
  const { toast } = useToast();

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">Trust & Safety</h1>
      </div>

      {/* Hero */}
      <div className="mx-4 mb-5 rounded-2xl overflow-hidden relative" style={{ height: 180 }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0d1a1a 0%, #1a0d1a 100%)" }} />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,207,255,0.2)", border: "1px solid rgba(0,207,255,0.4)" }}>
              <Shield className="w-4 h-4 text-icebreaker-teal" />
            </div>
            <span className="text-[10px] font-bold text-icebreaker-teal uppercase tracking-widest">Secure Zone</span>
          </div>
          <h2 className="text-2xl font-extrabold">Safety,<br />by default.</h2>
          <p className="text-sm text-icebreaker-muted mt-1">Your night out, secured. Verified profiles, panic flows, and 24/7 support.</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5">

        {/* Identity & Access */}
        <div>
          <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Identity & Access</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm">Optional ID Verification</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-icebreaker-teal/20 text-icebreaker-teal border border-icebreaker-teal/30">NEW</span>
                  </div>
                  <p className="text-xs text-icebreaker-muted">Upload your Government ID to get the <span className="text-icebreaker-teal font-semibold">ID-Verified Shield</span> on your profile.</p>
                </div>
                <BadgeCheck className="w-8 h-8 text-icebreaker-teal flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                {["Scan ID", "Face Match", "Badge"].map((s, i) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(0,207,255,0.2)", border: "1px solid rgba(0,207,255,0.4)", color: "#00CFFF" }}>✓</div>
                    <span className="text-xs text-icebreaker-muted">{s}</span>
                    {i < 2 && <span className="text-icebreaker-muted/30 text-xs">›</span>}
                  </div>
                ))}
              </div>
              <button
                onClick={() => toast({ title: "ID verification coming soon" })}
                className="w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #0050d0, #0070FF)", boxShadow: "0 0 20px rgba(0,80,208,0.4)" }}
                data-testid="button-start-id-scan"
              >
                <BadgeCheck className="w-4 h-4" />
                Start ID Scan
              </button>
              <p className="text-[10px] text-icebreaker-muted text-center mt-2">Securely processed. ID is never shown on profile.</p>
            </div>
          </div>
        </div>

        {/* Panic & Date Flow */}
        <div>
          <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Panic & Date Flow</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,207,255,0.15)", border: "1px solid rgba(0,207,255,0.3)" }}>
                <Shield className="w-4 h-4 text-icebreaker-teal" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Share Date Details</p>
                <p className="text-xs text-icebreaker-muted">Send live plans to a trusted contact</p>
              </div>
              <button
                onClick={() => toast({ title: "Setup trusted contact coming soon" })}
                className="text-xs font-bold text-icebreaker-coral px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(255,27,141,0.15)", border: "1px solid rgba(255,27,141,0.3)" }}
                data-testid="button-setup-date-share"
              >
                Setup
              </button>
            </div>

            <div className="p-4 rounded-2xl" style={{ background: "rgba(180,20,20,0.12)", border: "1px solid rgba(220,30,30,0.25)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-sm text-red-300">Need help?</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">ACTIVE DATE TOOLS</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Send Safe-Word", icon: Phone, sub: "Auto-sends location + 'Call me' msg" },
                  { label: "End & Block", icon: X },
                  { label: "Local Emergency", icon: Phone },
                ].map(({ label, icon: Icon, sub }) => (
                  <button
                    key={label}
                    onClick={() => toast({ title: `${label} — coming soon`, variant: "destructive" })}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center"
                    style={{ background: "rgba(220,30,30,0.15)", border: "1px solid rgba(220,30,30,0.3)" }}
                    data-testid={`button-${label.toLowerCase().replace(/ /g, "-")}`}
                  >
                    <Icon className="w-5 h-5 text-red-300" />
                    <span className="text-[10px] font-bold text-red-200 leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Support */}
        <div>
          <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Privacy & Support</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,27,141,0.15)", border: "1px solid rgba(255,27,141,0.3)" }}>
                <EyeOff className="w-4 h-4 text-icebreaker-coral" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Ghost Mode</p>
                <p className="text-xs text-icebreaker-muted">Go incognito. Control who sees you.</p>
              </div>
              <button
                onClick={() => setGhostMode(g => !g)}
                className="relative w-12 h-6 rounded-full transition-all"
                style={{ background: ghostMode ? "#FF1B8D" : "rgba(255,255,255,0.15)" }}
                data-testid="toggle-ghost-mode"
              >
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: ghostMode ? "calc(100% - 20px)" : 4 }} />
              </button>
            </div>

            <button
              onClick={() => toast({ title: "Anonymous report submitted — thank you" })}
              className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="button-reporting-center"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,27,141,0.15)", border: "1px solid rgba(255,27,141,0.3)" }}>
                <Flag className="w-4 h-4 text-icebreaker-coral" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm">Reporting Center</p>
                <p className="text-xs text-icebreaker-muted">Submit anonymous report</p>
              </div>
              <ChevronRight className="w-4 h-4 text-icebreaker-muted" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-icebreaker-muted font-semibold mb-2">Trust & Safety Team</p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-xs text-icebreaker-teal font-semibold cursor-pointer underline">FAQ</span>
            <span className="text-icebreaker-muted/40">•</span>
            <span className="text-xs text-icebreaker-teal font-semibold cursor-pointer underline">Email Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
