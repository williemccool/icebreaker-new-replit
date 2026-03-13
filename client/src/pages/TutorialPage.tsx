import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, MapPin, Zap, Heart, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    icon: Shield,
    bg: "linear-gradient(135deg, #0d1a14, #1a2010)",
    glow: "rgba(0,207,255,0.25)",
    label: "SAFETY FIRST",
    title: "Your safety is\nbuilt-in.",
    body: "Every profile is phone-verified. Women join free with Ghost Mode, ID verification, and a panic flow — always on.",
    cta: "Next",
    emoji: "🛡️"
  },
  {
    icon: MapPin,
    bg: "linear-gradient(135deg, #1a0d14, #14082a)",
    glow: "rgba(255,27,141,0.25)",
    label: "CHECK IN",
    title: "Meet people\nwhere you go.",
    body: "Check into a venue tonight to see who else is there. Swipe, match, or gift a drink — all without leaving your table.",
    cta: "Next",
    emoji: "📍"
  },
  {
    icon: Zap,
    bg: "linear-gradient(135deg, #14100a, #1a1408)",
    glow: "rgba(255,176,0,0.2)",
    label: "ICEBREAKER LIVE",
    title: "Live rooms,\nreal connections.",
    body: "Jump into themed audio rooms, play AI-powered icebreaker games, and earn Cubes for every night out.",
    cta: "Next",
    emoji: "⚡"
  },
  {
    icon: Heart,
    bg: "linear-gradient(135deg, #1a0d10, #140830)",
    glow: "rgba(255,27,141,0.3)",
    label: "MATCH & GO",
    title: "Break the ice,\nmake plans.",
    body: "When you both like each other, the ice breaks. Start the AI game, plan a date at the venue, or gift them a drink.",
    cta: "Get Started →",
    emoji: "💞"
  }
];

export default function TutorialPage() {
  const [slide, setSlide] = useState(0);
  const [, navigate] = useLocation();

  const s = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: s.bg, transition: "background 0.4s ease" }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 40%, ${s.glow} 0%, transparent 60%)` }} />

      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        {/* Slide indicator */}
        <div className="flex items-center gap-2 mb-10">
          {SLIDES.map((_, i) => (
            <div key={i} className="rounded-full transition-all" style={{ width: i === slide ? 20 : 6, height: 6, background: i === slide ? "#FF1B8D" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>

        {/* Icon */}
        <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl mb-8" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: `0 0 60px ${s.glow}` }}>
          {s.emoji}
        </div>

        {/* Label */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <span className="text-[10px] font-bold text-icebreaker-teal uppercase tracking-widest">{s.label}</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold text-center text-white mb-4 leading-tight" style={{ whiteSpace: "pre-line" }}>
          {s.title}
        </h1>

        {/* Body */}
        <p className="text-center text-icebreaker-muted text-sm leading-relaxed max-w-xs">
          {s.body}
        </p>
      </div>

      {/* Bottom */}
      <div className="px-6 pb-12 space-y-3 relative z-10">
        <button
          onClick={() => isLast ? navigate("/onboarding") : setSlide(s => s + 1)}
          className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #c4006e 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
          data-testid="button-next-slide"
        >
          {s.cta}
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </button>

        {!isLast && (
          <button onClick={() => navigate("/onboarding")} className="w-full text-center text-sm font-semibold text-icebreaker-muted/60 py-1">
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}
